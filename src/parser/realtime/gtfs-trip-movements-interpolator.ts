import { map } from "@dan-schel/js-utils";
import type {
  GtfsUpdatedTripMovement,
  GtfsUpdatedTripServicingMovement,
} from "../../data/trip/updated/types.js";

// We interpolate/extrapolate realtime times in cases where only one (or a few)
// movements have stop time updates in the GTFS-R feed.
//
// If all we know is "the train was 2 mins late at Bunyip", we assume it was 2
// mins late leaving Traralgon, and will be 2 mins late arriving at Southern
// Cross too.
//
// If we know a few stop time updates, we expolate to the edges, and interpolate
// between the known values, e.g.:
//
// - East Pakenham   7 mins late   <-- extrapolated
// - Pakenham        7 mins late   <-- extrapolated
// - Cardinia Road   7 mins late   <-------------------- known
// - Officer         6 mins late   <-- interpolated
// - Beaconsfield    5 mins late   <-- interpolated
// - Berwick         4 mins late   <-- interpolated
// - Narre Warren    3 mins late   <-------------------- known
// - Hallam          3 mins late   <-- extrapolated
// - Dandenong       3 mins late   <-- extrapolated
//
// Interpolated times are stored in the `assumedRealtime...` times, rather than
// `knownRealtime...` times to distinguish them.

export class GtfsTripMovementsInterpolator {
  interpolate(
    movements: readonly GtfsUpdatedTripMovement[],
  ): readonly GtfsUpdatedTripMovement[] {
    const servicingMovements = movements.filter((m) => m.isServicing);
    const delayValues = servicingMovements.map(
      (x) => x.knownRealtimeDelay?.total("seconds") ?? null,
    );
    if (delayValues.every((x) => x == null)) return movements;

    const delayByIndex = this._interpolate(delayValues);

    const indexByMovement = new Map<GtfsUpdatedTripServicingMovement, number>();
    for (const [index, movement] of servicingMovements.entries()) {
      indexByMovement.set(movement, index);
    }

    const { previousDepartureByIndex, previousScheduledDepartureByIndex } =
      this._departureContextByIndex(servicingMovements, delayByIndex);

    return movements.map((movement) => {
      if (!movement.isServicing) return movement;

      const index = indexByMovement.get(movement);
      if (index == null) return movement;

      const delaySeconds = delayByIndex[index];
      if (delaySeconds == null) return movement;

      if (movement.type === "regular") {
        const baseMovement = movement.withAssumedDelaySeconds(delaySeconds);
        const previousDepartureTime =
          previousDepartureByIndex.get(index) ?? null;

        const assumedDepartureTime = this._boundedAssumedDepartureTime(
          movement,
          baseMovement,
          previousDepartureTime,
        );

        const assumedArrivalTime = this._assumedArrivalTime({
          movement,
          delaySeconds,
          assumedDepartureTime,
          previousDepartureTime,
          previousScheduledDepartureTime:
            previousScheduledDepartureByIndex.get(index) ?? null,
        });

        return movement.with({
          assumedRealtimeDepartureTime:
            movement.knownRealtimeDepartureTime == null
              ? assumedDepartureTime
              : null,
          assumedRealtimeArrivalTime:
            movement.knownRealtimeArrivalTime == null
              ? assumedArrivalTime
              : null,
        });
      } else {
        return movement.withAssumedDelaySeconds(delaySeconds);
      }
    });
  }

  private _interpolate(delayValues: (number | null)[]) {
    return delayValues.map((knownDelay, i) => {
      if (knownDelay != null) return knownDelay;

      const iPrev = delayValues.findLastIndex((x, idx) => idx < i && x != null);
      const iNext = delayValues.findIndex((x, idx) => idx > i && x != null);
      const prev = delayValues[iPrev] ?? null;
      const next = delayValues[iNext] ?? null;

      if (prev != null && next != null) {
        // TODO: Why Math.round?
        return Math.round(map(i, iPrev, iNext, prev, next));
      } else if (prev != null) {
        return prev;
      } else if (next != null) {
        return next;
      } else {
        // Would only happen if all `delayValues` are null, but we check that in
        // #interpolate.
        throw new Error();
      }
    });
  }

  private _knownDelaySeconds(
    movement: GtfsUpdatedTripServicingMovement,
  ): number | null {
    const knownDelay = movement.knownRealtimeDelay;
    if (knownDelay == null) return null;

    return Math.round(knownDelay.total("seconds"));
  }

  private _interpolateIntermediateDelays(
    knownIndices: readonly number[],
    delayByIndex: number[],
  ) {
    for (let i = 0; i < knownIndices.length - 1; i += 1) {
      const previousIndex = knownIndices[i];
      const nextIndex = knownIndices[i + 1];
      if (previousIndex == null || nextIndex == null) continue;

      const previousDelay = delayByIndex[previousIndex];
      const nextDelay = delayByIndex[nextIndex];
      if (previousDelay == null || nextDelay == null) continue;

      const gap = nextIndex - previousIndex;
      if (gap <= 1) continue;

      const deltaPerStep = (nextDelay - previousDelay) / gap;
      for (let index = previousIndex + 1; index < nextIndex; index += 1) {
        const fraction = index - previousIndex;
        const interpolatedDelay = previousDelay + deltaPerStep * fraction;
        delayByIndex[index] = Math.round(interpolatedDelay);
      }
    }
  }

  private _extrapolateEdgeDelays(
    knownIndices: readonly number[],
    delayByIndex: number[],
    servicingMovementsLength: number,
  ) {
    const firstKnownIndex = knownIndices[0];
    if (firstKnownIndex != null) {
      const firstDelay = delayByIndex[firstKnownIndex];
      if (firstDelay != null) {
        for (let index = 0; index < firstKnownIndex; index += 1) {
          delayByIndex[index] = firstDelay;
        }
      }
    }

    const lastKnownIndex = knownIndices[knownIndices.length - 1];
    if (lastKnownIndex != null) {
      const lastDelay = delayByIndex[lastKnownIndex];
      if (lastDelay != null) {
        for (
          let index = lastKnownIndex + 1;
          index < servicingMovementsLength;
          index += 1
        ) {
          delayByIndex[index] = lastDelay;
        }
      }
    }
  }

  private _departureContextByIndex(
    servicingMovements: readonly GtfsUpdatedTripServicingMovement[],
    delayByIndex: number[],
  ): {
    readonly previousDepartureByIndex: ReadonlyMap<
      number,
      Temporal.Instant | null
    >;
    readonly previousScheduledDepartureByIndex: ReadonlyMap<
      number,
      Temporal.Instant | null
    >;
  } {
    const previousDepartureByIndex = new Map<number, Temporal.Instant | null>();
    const previousScheduledDepartureByIndex = new Map<
      number,
      Temporal.Instant | null
    >();

    let lastEffectiveDepartureTime: Temporal.Instant | null = null;
    let lastScheduledDepartureTime: Temporal.Instant | null = null;

    for (const [index, movement] of servicingMovements.entries()) {
      previousDepartureByIndex.set(index, lastEffectiveDepartureTime);
      previousScheduledDepartureByIndex.set(index, lastScheduledDepartureTime);

      if (movement.type !== "originating" && movement.type !== "regular") {
        continue;
      }

      const delay = delayByIndex[index];
      const departureTime =
        movement.knownRealtimeDepartureTime ??
        (delay == null
          ? movement.scheduledDepartureTime
          : movement.scheduledDepartureTime.add({ seconds: delay }));

      const boundedDepartureTime: Temporal.Instant =
        lastEffectiveDepartureTime == null ||
        Temporal.Instant.compare(departureTime, lastEffectiveDepartureTime) >= 0
          ? departureTime
          : lastEffectiveDepartureTime;

      lastEffectiveDepartureTime = boundedDepartureTime;
      lastScheduledDepartureTime = movement.scheduledDepartureTime;
    }

    return {
      previousDepartureByIndex,
      previousScheduledDepartureByIndex,
    };
  }

  private _boundedAssumedDepartureTime(
    movement: Extract<GtfsUpdatedTripServicingMovement, { type: "regular" }>,
    baseMovement: Extract<
      GtfsUpdatedTripServicingMovement,
      { type: "regular" }
    >,
    previousDepartureTime: Temporal.Instant | null,
  ): Temporal.Instant {
    const assumedDepartureTime =
      movement.knownRealtimeDepartureTime ??
      baseMovement.effectiveDepartureTime;

    if (
      previousDepartureTime != null &&
      Temporal.Instant.compare(assumedDepartureTime, previousDepartureTime) < 0
    ) {
      return previousDepartureTime;
    }

    return assumedDepartureTime;
  }

  private _assumedArrivalTime(fields: {
    readonly movement: Extract<
      GtfsUpdatedTripServicingMovement,
      { type: "regular" }
    >;
    readonly delaySeconds: number;
    readonly assumedDepartureTime: Temporal.Instant;
    readonly previousDepartureTime: Temporal.Instant | null;
    readonly previousScheduledDepartureTime: Temporal.Instant | null;
  }): Temporal.Instant {
    const {
      movement,
      delaySeconds,
      assumedDepartureTime,
      previousDepartureTime,
      previousScheduledDepartureTime,
    } = fields;

    if (
      previousDepartureTime != null &&
      previousScheduledDepartureTime != null
    ) {
      const transitSeconds =
        (movement.scheduledArrivalTime.epochMilliseconds -
          previousScheduledDepartureTime.epochMilliseconds) /
        1000;
      const adjustedArrivalTime = previousDepartureTime.add({
        seconds: transitSeconds,
      });

      if (
        Temporal.Instant.compare(adjustedArrivalTime, previousDepartureTime) < 0
      ) {
        return previousDepartureTime;
      }

      if (
        Temporal.Instant.compare(adjustedArrivalTime, assumedDepartureTime) > 0
      ) {
        return assumedDepartureTime;
      }

      return adjustedArrivalTime;
    }

    return movement.scheduledArrivalTime.add({
      seconds: delaySeconds,
    });
  }
}

// TODO: On the CoreQuery service page, add:
//
// "Real-time data has not been provided for all stops. Times marked with * are
// estimates, extrapolated from the known times."
//
// or, alternatively:
//
// "Real-time data has not been provided for all stops. Times marked with * are
// _estimated_ estimates, extrapolated from the _provided_ estimates."
