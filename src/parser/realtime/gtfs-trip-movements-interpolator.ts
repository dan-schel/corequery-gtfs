import type { GtfsUpdatedTripMovement } from "../../data/trip/updated/types.js";

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
    const result = [...movements];

    // Get the currently known delay values (even if negative), so that we have
    // the known values, and the gaps to fill in.
    //
    // TODO: I suppose passing movements don't count? We interpolate (i.e. apply
    // the increasing/decreasing interval) based only on the serviced movements,
    // and therefore a large chunk of passing movements doesn't have a large gap
    // in the interpolated values. I guess it's not really an exact science
    // regardless of what I do :)
    const delays = result.map((movement) => {});

    // TODO: What happens to arrival times? For terminating movements, I
    // definitely just want to treat the arrival time like a departure time, but
    // what about for regular movements? Is there a chance of creating a time
    // travel issue, where the arrival time of one stop is before the departure
    // time of the previous stop after interpolation?
    //
    // Maybe we should treat the gap between departure and the next arrival time
    // as fixed, unless it would push the arrival time past the departure time
    // of the same movement. That means always delaying the arrival time by the
    // delay value used for the previous movement's departure time.
    //
    // E.g.:
    // Pakenham:       10:40 [ARR], 10:45 [DEP]
    // Cardinia Road:  10:50 [ARR], 10:51 [DEP]
    //
    // Move all stops' departure times by delay values, as informed by the
    // interpolation, but then maintain the 5 min gap between Pakenham [DEP] and
    // Cardinia Road [ARR] by applying Pakenham's departure delay to Cardinia
    // Road's arrival time.
    //
    // Reason: If we depart a station X mins late, we're unlikely to arrive at
    // the next stop any earlier than X mins late, because the transit time of
    // the vehicle between stops shouldn't theoretically change. However, the
    // time spent dwelling at a stop is potentially variable. This would be most
    // noticeable at V/Line stops with large layovers (I think the Seymour line
    // has some).

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
