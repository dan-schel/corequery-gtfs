import type { GtfsUpdatedTripRegularMovement } from "../../data/trip/updated/gtfs-updated-trip-regular-movement.js";
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
  ): GtfsUpdatedTripMovement[] {
    const servicingMovements = movements.filter(
      (movement): movement is GtfsUpdatedTripServicingMovement =>
        movement.isServicing,
    );
    if (servicingMovements.length === 0) return [...movements];

    const knownIndices = servicingMovements
      .map((movement, index) => ({ movement, index }))
      .filter(({ movement }) => this._knownDelaySeconds(movement) != null)
      .map(({ index }) => index);
    if (knownIndices.length === 0) return [...movements];

    const delayByIndex = new Map<number, number>();
    for (const index of knownIndices) {
      const movement = servicingMovements[index];
      if (movement == null) continue;

      const delay = this._knownDelaySeconds(movement);
      if (delay != null) delayByIndex.set(index, delay);
    }

    for (let i = 0; i < knownIndices.length - 1; i += 1) {
      const previousIndex = knownIndices[i];
      const nextIndex = knownIndices[i + 1];
      if (previousIndex == null || nextIndex == null) continue;

      const previousDelay = delayByIndex.get(previousIndex);
      const nextDelay = delayByIndex.get(nextIndex);
      if (previousDelay == null || nextDelay == null) continue;

      const gap = nextIndex - previousIndex;
      if (gap <= 1) continue;

      const deltaPerStep = (nextDelay - previousDelay) / gap;
      for (let index = previousIndex + 1; index < nextIndex; index += 1) {
        const fraction = index - previousIndex;
        const interpolatedDelay = previousDelay + deltaPerStep * fraction;
        delayByIndex.set(index, Math.round(interpolatedDelay));
      }
    }

    const firstKnownIndex = knownIndices[0];
    if (firstKnownIndex != null) {
      const firstDelay = delayByIndex.get(firstKnownIndex);
      if (firstDelay != null) {
        for (let index = 0; index < firstKnownIndex; index += 1) {
          delayByIndex.set(index, firstDelay);
        }
      }
    }

    const lastKnownIndex = knownIndices[knownIndices.length - 1];
    if (lastKnownIndex != null) {
      const lastDelay = delayByIndex.get(lastKnownIndex);
      if (lastDelay != null) {
        for (
          let index = lastKnownIndex + 1;
          index < servicingMovements.length;
          index += 1
        ) {
          delayByIndex.set(index, lastDelay);
        }
      }
    }

    const serviceIndexByMovement = new Map<
      GtfsUpdatedTripServicingMovement,
      number
    >();
    for (const [index, movement] of servicingMovements.entries()) {
      serviceIndexByMovement.set(movement, index);
    }

    const effectiveDepartureByIndex = new Map<number, Temporal.Instant>();
    let lastEffectiveDepartureTime: Temporal.Instant | null = null;
    for (const [index, movement] of servicingMovements.entries()) {
      if (movement.type !== "originating" && movement.type !== "regular") {
        continue;
      }

      const delay = delayByIndex.get(index);
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

      effectiveDepartureByIndex.set(index, boundedDepartureTime);
      lastEffectiveDepartureTime = boundedDepartureTime;
    }

    return movements.map((movement) => {
      if (!movement.isServicing) return movement;

      const index = serviceIndexByMovement.get(movement);
      if (index == null) return movement;

      const delaySeconds = delayByIndex.get(index);
      if (delaySeconds == null) return movement;

      return this._applyAssumedDelay(
        movement,
        delaySeconds,
        servicingMovements,
        index,
        effectiveDepartureByIndex,
      );
    });
  }

  private _knownDelaySeconds(
    movement: GtfsUpdatedTripServicingMovement,
  ): number | null {
    if (movement.type === "originating") {
      return movement.knownRealtimeDepartureTime == null
        ? null
        : this._delaySeconds(
            movement.scheduledDepartureTime,
            movement.knownRealtimeDepartureTime,
          );
    }

    if (movement.type === "regular") {
      if (movement.knownRealtimeDepartureTime != null) {
        return this._delaySeconds(
          movement.scheduledDepartureTime,
          movement.knownRealtimeDepartureTime,
        );
      }

      return movement.knownRealtimeArrivalTime == null
        ? null
        : this._delaySeconds(
            movement.scheduledArrivalTime,
            movement.knownRealtimeArrivalTime,
          );
    }

    return movement.knownRealtimeArrivalTime == null
      ? null
      : this._delaySeconds(
          movement.scheduledArrivalTime,
          movement.knownRealtimeArrivalTime,
        );
  }

  private _delaySeconds(
    scheduledTime: Temporal.Instant,
    realtimeTime: Temporal.Instant,
  ): number {
    return Math.round(
      (realtimeTime.epochMilliseconds - scheduledTime.epochMilliseconds) / 1000,
    );
  }

  private _applyAssumedDelay(
    movement: GtfsUpdatedTripServicingMovement,
    delaySeconds: number,
    servicingMovements: readonly GtfsUpdatedTripServicingMovement[],
    index: number,
    effectiveDepartureByIndex: ReadonlyMap<number, Temporal.Instant>,
  ): GtfsUpdatedTripServicingMovement {
    if (movement.type === "originating") {
      if (movement.knownRealtimeDepartureTime != null) return movement;
      return movement.with({
        assumedRealtimeDepartureTime: movement.scheduledDepartureTime.add({
          seconds: delaySeconds,
        }),
      });
    }

    if (movement.type === "regular") {
      let assumedDepartureTime =
        movement.knownRealtimeDepartureTime == null
          ? movement.scheduledDepartureTime.add({
              seconds: delaySeconds,
            })
          : movement.knownRealtimeDepartureTime;

      const priorDepartureTime = this._previousDepartureTime(
        servicingMovements,
        index,
        effectiveDepartureByIndex,
      );
      if (
        priorDepartureTime != null &&
        Temporal.Instant.compare(assumedDepartureTime, priorDepartureTime) < 0
      ) {
        assumedDepartureTime = priorDepartureTime;
      }

      const priorScheduledDepartureTime = this._previousScheduledDepartureTime(
        servicingMovements,
        index,
      );

      const assumedArrivalTime =
        movement.knownRealtimeArrivalTime == null
          ? this._assumedArrivalTime(
              movement,
              assumedDepartureTime,
              priorDepartureTime,
              priorScheduledDepartureTime,
              delaySeconds,
            )
          : null;

      return movement.with({
        assumedRealtimeArrivalTime: assumedArrivalTime,
        assumedRealtimeDepartureTime:
          movement.knownRealtimeDepartureTime == null
            ? assumedDepartureTime
            : null,
      });
    }

    if (movement.knownRealtimeArrivalTime == null) {
      return movement.with({
        assumedRealtimeArrivalTime: movement.scheduledArrivalTime.add({
          seconds: delaySeconds,
        }),
      });
    }

    return movement;
  }

  private _previousDepartureTime(
    servicingMovements: readonly GtfsUpdatedTripServicingMovement[],
    index: number,
    effectiveDepartureByIndex: ReadonlyMap<number, Temporal.Instant>,
  ): Temporal.Instant | null {
    for (let i = index - 1; i >= 0; i -= 1) {
      const movement = servicingMovements[i];
      if (movement == null) continue;

      if (movement.type === "originating" || movement.type === "regular") {
        const departureTime =
          movement.knownRealtimeDepartureTime ??
          effectiveDepartureByIndex.get(i) ??
          movement.scheduledDepartureTime;
        return departureTime;
      }
    }

    return null;
  }

  private _previousScheduledDepartureTime(
    servicingMovements: readonly GtfsUpdatedTripServicingMovement[],
    index: number,
  ): Temporal.Instant | null {
    for (let i = index - 1; i >= 0; i -= 1) {
      const movement = servicingMovements[i];
      if (movement == null) continue;

      if (movement.type === "originating" || movement.type === "regular") {
        return movement.scheduledDepartureTime;
      }
    }

    return null;
  }

  private _assumedArrivalTime(
    movement: GtfsUpdatedTripRegularMovement,
    assumedDepartureTime: Temporal.Instant,
    previousDepartureTime: Temporal.Instant | null,
    previousScheduledDepartureTime: Temporal.Instant | null,
    delaySeconds: number,
  ): Temporal.Instant {
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
