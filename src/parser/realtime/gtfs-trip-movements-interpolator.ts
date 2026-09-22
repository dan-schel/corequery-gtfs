import { itsOk, map } from "@dan-schel/js-utils";
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
  ): readonly GtfsUpdatedTripMovement[] | null {
    const servicingMovements = movements.filter((m) => m.isServicing);
    const delayValues = servicingMovements.map((x) => x.knownRealtimeDelay);
    if (delayValues.every((x) => x == null)) return movements;

    const allDelayValues = this._interpolateDelayValues(delayValues);

    const proposedMovements = movements.map((m) => {
      if (!m.isServicing) return m;

      const index = servicingMovements.indexOf(m);
      const departureDelay = allDelayValues[index];
      if (departureDelay == null) throw new Error();

      const zeroDuration = Temporal.Duration.from({ nanoseconds: 0 });
      const arrivalDelay = allDelayValues[index - 1] ?? zeroDuration;

      return this._applyDelays(m, arrivalDelay, departureDelay);
    });

    return this._eliminateTimeTravel(proposedMovements);
  }

  private _interpolateDelayValues(delayValues: (Temporal.Duration | null)[]) {
    return delayValues.map((knownDelay, i) => {
      if (knownDelay != null) return knownDelay;

      const iPrev = delayValues.findLastIndex((x, idx) => idx < i && x != null);
      const iNext = delayValues.findIndex((x, idx) => idx > i && x != null);
      const prev = delayValues[iPrev] ?? null;
      const next = delayValues[iNext] ?? null;

      if (prev != null && next != null) {
        return Temporal.Duration.from({
          nanoseconds: map(
            i,
            iPrev,
            iNext,
            prev.total("nanoseconds"),
            next.total("nanoseconds"),
          ),
        });
      } else if (prev != null) {
        return prev;
      } else if (next != null) {
        return next;
      } else {
        // Would only happen if all `delayValues` are null, but we check that in
        // `interpolate`.
        throw new Error();
      }
    });
  }

  private _applyDelays(
    movement: GtfsUpdatedTripServicingMovement,
    arrivalDelay: Temporal.Duration,
    departureDelay: Temporal.Duration,
  ) {
    let result = movement;

    if (
      "assumedRealtimeArrivalTime" in movement &&
      movement.knownRealtimeArrivalTime == null
    ) {
      result = result.with({
        assumedRealtimeArrivalTime:
          movement.scheduledArrivalTime.add(arrivalDelay),
      });
    }

    if (
      "assumedRealtimeDepartureTime" in movement &&
      movement.knownRealtimeDepartureTime == null
    ) {
      result = result.with({
        assumedRealtimeDepartureTime:
          movement.scheduledDepartureTime.add(departureDelay),
      });
    }

    return result;
  }

  private _eliminateTimeTravel(movements: readonly GtfsUpdatedTripMovement[]) {
    const result: GtfsUpdatedTripMovement[] = [...movements];

    // Step 1: Shift prior departure times to be earlier if they are after a
    // subsequent departure time. Loop in reverse order to avoid cascading
    // issues.
    for (let i = result.length - 2; i >= 0; i--) {
      const me = itsOk(result[i]);
      if (!me.isServicing) continue;

      // We start from the second-last movement. A movement is terminating if
      // and only if it is the last movement, so this should never happen.
      if (me.type === "terminating") throw new Error();

      const next = result.find(
        (m, j): m is GtfsUpdatedTripServicingMovement => j > i && m.isServicing,
      );

      // And because the last movement will be a terminating movement, there
      // should always be some next servicing movement.
      if (next == null) throw new Error();

      // Same as `timeRelevantToDeparturesAlgorithm`, but semantically not quite
      // the same thing. The departures algorithm _happens_ to prefer departure
      // times except for terminating movements, which is exactly what we're
      // after, but I think it's good to be explicit about it here.
      const nextDepartureTime =
        "effectiveDepartureTime" in next
          ? next.effectiveDepartureTime
          : next.effectiveArrivalTime;

      const myDepartureTime = me.effectiveDepartureTime;

      if (Temporal.Instant.compare(myDepartureTime, nextDepartureTime) > 0) {
        // GtfsTripMovementsInterpolator makes no attempt to repair time travel
        // issues caused by `knownRealtimeDepartureTime` values. Those have come
        // from the GTFS-RT feed! If it happens, we'll throw out the trip update
        // and report a parsing error.
        if (me.knownRealtimeDepartureTime != null) return null;

        result[i] = me.with({
          assumedRealtimeDepartureTime: nextDepartureTime,
        });
      }
    }

    // Step 2: Now that departures are in time order, adjust arrival times to
    // ensure they're always between the neighbouring departure times.
    for (let i = 1; i < result.length; i++) {
      const me = itsOk(result[i]);

      // There's no arrival time to adjust in terminating movements, and the
      // above loop effectively uses the terminating movement's arrival time
      // as the anchor of the entire algorithm, so it "can't be wrong".
      if (!me.isServicing || me.type === "terminating") continue;

      // We start from the second movement. A movement is originating if and
      // only if it is the first movement, so this should never happen.
      if (me.type === "originating") throw new Error();

      const prev = result.find(
        (m, j): m is GtfsUpdatedTripServicingMovement => j < i && m.isServicing,
      );

      // And because the first movement will be an originating movement, there
      // should always be some previous servicing movement.
      if (prev == null || prev.type === "terminating") throw new Error();

      const prevDepartureTime = prev.effectiveDepartureTime;
      const myDepartureTime = me.effectiveDepartureTime;
      const myArrivalTime = me.effectiveArrivalTime;

      if (Temporal.Instant.compare(myArrivalTime, myDepartureTime) > 0) {
        // As above, we don't repair time travel if it comes from the feed.
        if (me.knownRealtimeArrivalTime != null) return null;

        result[i] = me.with({
          assumedRealtimeArrivalTime: myDepartureTime,
        });
      }

      if (Temporal.Instant.compare(myArrivalTime, prevDepartureTime) < 0) {
        // As above, we don't repair time travel if it comes from the feed.
        if (me.knownRealtimeArrivalTime != null) return null;

        result[i] = me.with({
          assumedRealtimeArrivalTime: prevDepartureTime,
        });
      }
    }

    return result;
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
