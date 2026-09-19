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

// TODO: On the above case, there's an argument to be made that we should do...
//
// - East Pakenham   7 mins late   <-- extrapolated
// - Pakenham        7 mins late   <-- extrapolated
// - Cardinia Road   7 mins late   <-------------------- known
// - Officer         3 mins late   <-- interpolated
// - Beaconsfield    3 mins late   <-- interpolated
// - Berwick         3 mins late   <-- interpolated
// - Narre Warren    3 mins late   <-------------------- known
// - Hallam          3 mins late   <-- extrapolated
// - Dandenong       3 mins late   <-- extrapolated
//
// ...so that no-one misses their train. In other words, be as optimistic as
// possible (except when it would cause time travel - ensure the snapping
// doesn't make Officer's departure time before Cardinia Road's), and assume if
// the train will be only 3 mins late at Narre Warren, it makes up that time
// ASAP.
//
// By the same argument though, we should drop all delays after Narre Warren, as
// the train _might_ be on time again by Hallam. I don't think Google does that.
// That wouldn't fix the bug in TrainQuery v3 that I set out to, and given that,
// I think I'll do the interpolation as originally planned.

export class GtfsTripMovementsInterpolator {
  interpolate(
    movements: readonly GtfsUpdatedTripMovement[],
  ): GtfsUpdatedTripMovement[] {
    const servicingMovements = movements.filter(
      (movement): movement is GtfsUpdatedTripServicingMovement =>
        movement.isServicing,
    );
    if (servicingMovements.length === 0) return [...movements];

    const knownDelays = servicingMovements.flatMap((movement, index) => {
      const delaySeconds = this._knownDelaySeconds(movement);
      return delaySeconds == null ? [] : [{ index, delaySeconds }];
    });
    if (knownDelays.length === 0) return [...movements];

    const delayByIndex = new Map<number, number>();
    for (let index = 0; index < servicingMovements.length; index += 1) {
      const currentMovement = servicingMovements[index];
      if (currentMovement == null) continue;

      const knownDelay = this._knownDelaySeconds(currentMovement);
      if (knownDelay != null) {
        delayByIndex.set(index, knownDelay);
        continue;
      }

      let previousKnownIndex: number | null = null;
      let nextKnownIndex: number | null = null;

      for (let i = index - 1; i >= 0; i -= 1) {
        const candidate = servicingMovements[i];
        if (candidate == null) continue;
        if (this._knownDelaySeconds(candidate) != null) {
          previousKnownIndex = i;
          break;
        }
      }

      for (let i = index + 1; i < servicingMovements.length; i += 1) {
        const candidate = servicingMovements[i];
        if (candidate == null) continue;
        if (this._knownDelaySeconds(candidate) != null) {
          nextKnownIndex = i;
          break;
        }
      }

      if (previousKnownIndex == null && nextKnownIndex == null) {
        continue;
      }

      if (previousKnownIndex == null) {
        if (nextKnownIndex == null) continue;

        const nextMovement = servicingMovements[nextKnownIndex];
        const nextDelay =
          nextMovement == null ? null : this._knownDelaySeconds(nextMovement);
        if (nextDelay != null) delayByIndex.set(index, nextDelay);
        continue;
      }

      if (nextKnownIndex == null) {
        const previousMovement = servicingMovements[previousKnownIndex];
        const previousDelay =
          previousMovement == null
            ? null
            : this._knownDelaySeconds(previousMovement);
        if (previousDelay != null) delayByIndex.set(index, previousDelay);
        continue;
      }

      const previousMovement = servicingMovements[previousKnownIndex];
      const nextMovement = servicingMovements[nextKnownIndex];
      if (previousMovement == null || nextMovement == null) continue;

      const previousDelay = this._knownDelaySeconds(previousMovement);
      const nextDelay = this._knownDelaySeconds(nextMovement);
      if (previousDelay == null || nextDelay == null) continue;

      const fraction =
        (index - previousKnownIndex) / (nextKnownIndex - previousKnownIndex);
      const interpolatedDelay =
        previousDelay + (nextDelay - previousDelay) * fraction;
      delayByIndex.set(index, Math.round(interpolatedDelay));
    }

    const serviceIndexByMovement = new Map<
      GtfsUpdatedTripServicingMovement,
      number
    >();
    for (const [index, movement] of servicingMovements.entries()) {
      serviceIndexByMovement.set(movement, index);
    }

    const assumedDepartureTimes = new Map<number, Temporal.Instant>();
    for (const [index, movement] of servicingMovements.entries()) {
      const delaySeconds = delayByIndex.get(index);
      if (delaySeconds == null) continue;

      if (movement.type === "originating" || movement.type === "regular") {
        const departureTime =
          movement.knownRealtimeDepartureTime ??
          movement.scheduledDepartureTime.add({ seconds: delaySeconds });
        assumedDepartureTimes.set(index, departureTime);
      }
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
        assumedDepartureTimes,
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
    assumedDepartureTimes: ReadonlyMap<number, Temporal.Instant>,
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
      const priorDepartureTime = this._previousDepartureTime(
        servicingMovements,
        index,
        assumedDepartureTimes,
      );

      const assumedArrivalTime =
        movement.knownRealtimeArrivalTime == null
          ? (() => {
              if (priorDepartureTime != null) {
                const previousMovement = servicingMovements[index - 1];
                const priorScheduledDepartureTime =
                  previousMovement == null
                    ? null
                    : this._departureTimeForMovement(previousMovement);

                if (priorScheduledDepartureTime != null) {
                  const transitSeconds =
                    (movement.scheduledArrivalTime.epochMilliseconds -
                      priorScheduledDepartureTime.epochMilliseconds) /
                    1000;
                  return priorDepartureTime.add({ seconds: transitSeconds });
                }
              }

              return movement.scheduledArrivalTime.add({
                seconds: delaySeconds,
              });
            })()
          : null;

      const assumedDepartureTime =
        movement.knownRealtimeDepartureTime == null
          ? movement.scheduledDepartureTime.add({
              seconds: delaySeconds,
            })
          : null;

      const finalArrivalTime =
        assumedArrivalTime == null ? null : assumedArrivalTime;
      const finalDepartureTime =
        assumedDepartureTime == null
          ? null
          : Temporal.Instant.compare(
                assumedDepartureTime,
                finalArrivalTime ?? assumedDepartureTime,
              ) < 0
            ? (finalArrivalTime ?? assumedDepartureTime)
            : assumedDepartureTime;

      return movement.with({
        assumedRealtimeArrivalTime: finalArrivalTime,
        assumedRealtimeDepartureTime: finalDepartureTime,
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
    movements: readonly GtfsUpdatedTripServicingMovement[],
    index: number,
    assumedDepartureTimes: ReadonlyMap<number, Temporal.Instant>,
  ): Temporal.Instant | null {
    for (let i = index - 1; i >= 0; i -= 1) {
      const candidate = movements[i];
      if (candidate == null) continue;

      if (candidate.type === "originating" || candidate.type === "regular") {
        if (candidate.knownRealtimeDepartureTime != null) {
          return candidate.knownRealtimeDepartureTime;
        }

        const assumedTime = assumedDepartureTimes.get(i);
        if (assumedTime != null) return assumedTime;
      }
    }

    return null;
  }

  private _departureTimeForMovement(
    movement: GtfsUpdatedTripServicingMovement,
  ): Temporal.Instant | null {
    if (movement.type === "originating") {
      return movement.scheduledDepartureTime;
    }

    if (movement.type === "regular") {
      return movement.scheduledDepartureTime;
    }

    return null;
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
