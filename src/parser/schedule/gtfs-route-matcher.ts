import type { Color } from "../../corequery-types.js";
import type {
  StopTimesCsv,
  StopTimesCsvRow,
} from "../../data/raw/schedule-csvs.js";
import type { StopGtfsIdMapping } from "../../data/ids/stop-gtfs-id-mapping.js";
import type { Route } from "../../data/route/route.js";
import {
  GtfsScheduledTripOriginatingMovement,
  GtfsScheduledTripPassingMovement,
  GtfsScheduledTripRegularMovement,
  GtfsScheduledTripTerminatingMovement,
  type GtfsScheduledTripMovement,
  type GtfsScheduledTripServicingMovement,
} from "../../data/gtfs-scheduled-trip-movements.js";
import { itsOk } from "@dan-schel/js-utils";

const STOP_TIME_PICKUP_TYPE_REGULAR = 0;
const STOP_TIME_PICKUP_TYPE_NO_PICKUP = 1;
const STOP_TIME_DROP_OFF_TYPE_REGULAR = 0;
const STOP_TIME_DROP_OFF_TYPE_NO_DROP_OFF = 1;

export type MatchedRoute = {
  movements: readonly GtfsScheduledTripMovement[];
  color: Color | null;
  serviceTags: readonly number[];
};

export class GtfsRouteMatcher {
  constructor(
    private readonly _onError: (error: GtfsRouteMatchingError) => void,
  ) {}

  match(
    stopTimes: StopTimesCsv,
    routesForLine: readonly Route[],
    stopGtfsIdMapping: StopGtfsIdMapping,
  ): MatchedRoute | null {
    const servicingMovements = this._convertToServicingMovements(
      stopTimes,
      stopGtfsIdMapping,
    );
    if (servicingMovements == null) return null;

    const match = this._matchToRoute(servicingMovements, routesForLine);
    if (match == null) {
      const stopIds = servicingMovements.map((movement) => movement.stopId);
      this._onError(new NoMatchingRouteError(stopTimes, stopIds));
      return null;
    }

    return match;
  }

  private _matchToRoute(
    servicingMovements: readonly GtfsScheduledTripServicingMovement[],
    routesForLine: readonly Route[],
  ): MatchedRoute | null {
    // Step 1: Find the shortest route for this line which contains all the
    // stops where the trip services as a subsequence.
    const shortestMatch = routesForLine
      .filter((r) =>
        r.matchesStoppingOrder(servicingMovements.map((m) => m.stopId)),
      )
      .reduce<Route | null>(
        (prev, me) => (prev == null || me.isShorterThan(prev) ? me : prev),
        null,
      );

    if (shortestMatch == null) return null;
    const { color, serviceTags } = shortestMatch;

    // Step 2: Since stop_times.txt in GTFS only lists the stops the service
    // actually serves (i.e. it doesn't have the express stops), use the matched
    // route as a guide for which stops the service skipped, and add those into
    // the list as passing movements.
    const movements = this._addPassingMovementsFromRoute(
      servicingMovements,
      shortestMatch,
    );

    return { movements, color, serviceTags };
  }

  private _addPassingMovementsFromRoute(
    servicingMovements: readonly GtfsScheduledTripServicingMovement[],
    matchingRoute: Route,
  ) {
    const result: GtfsScheduledTripMovement[] = [];

    let nextServicingMovementIndex = 0;

    // Broadly: Iterate through the route's stops, and step through the trip
    // movements simultaneously when they match. Add all route stops between
    // first and last trip movements as servicing movements where found or
    // passing movements otherwise.
    for (const routeStop of matchingRoute.stops) {
      const nextServicingMovement =
        servicingMovements[nextServicingMovementIndex];

      // If there's no next servicing movement, then the index must be off the
      // end of the array, so we're done (the service has terminated).
      if (nextServicingMovement == null) break;

      if (routeStop.stopId === nextServicingMovement.stopId) {
        // When the next movement from the trip matches the one in the route
        // we're up to, add the servicing movement.
        result.push(nextServicingMovement);
        nextServicingMovementIndex++;
      } else if (
        nextServicingMovementIndex > 0 &&
        !routeStop.collapseInStoppingPatterns
      ) {
        // Otherwise the stop from the route is an `type: "passing"` movement.
        // `nextServicingMovementIndex > 0` stops us adding passing movements
        // from the route before the service originates.
        //
        // For now, I'm skipping adding `collapseInStoppingPatterns` stops as
        // passing movements. This flag means we don't want this stop to show up
        // in stopping patterns normally, unless it's servicing (e.g. East
        // Pakenham on the Gippsland line is one of these). I'm assuming there's
        // nothing downstream that'll need to consider these collapsed stops.
        //
        // (If I need to reconsider this decision for some reason, maybe instead
        // of adding those stops back in to this array with some sort of flag, I
        // could consider adding the matched route itself as metadata to the
        // trip? Probably having the index of the route stop in this array will
        // be useful to reconcile the two.)
        result.push(
          new GtfsScheduledTripPassingMovement({
            stopId: routeStop.stopId,
          }),
        );
      }
    }

    return result;
  }

  /**
   * Take the rows from stop_times.txt and form a
   * GtfsScheduledTripServicingMovement for each. Note that passing movements
   * are not added at this stage. They're sprinkled in later once we've matched
   * the trip to a route.
   */
  private _convertToServicingMovements(
    stopTimes: StopTimesCsv,
    stopGtfsIdMapping: StopGtfsIdMapping,
  ): readonly GtfsScheduledTripServicingMovement[] | null {
    const result: GtfsScheduledTripServicingMovement[] = [];

    for (let i = 0; i < stopTimes.length; i++) {
      const stopTime = itsOk(stopTimes[i]);

      const gtfsIdMetadata = stopGtfsIdMapping.tryResolve(stopTime.stop_id);
      if (gtfsIdMetadata == null) {
        this._onError(new StopTimeReferencesUnmappedStopIdError(stopTime));
        return null;
      }

      const positionId =
        gtfsIdMetadata.type === "platform" ? gtfsIdMetadata.positionId : null;

      const picksUp = this._doesPickUp(stopTime);
      const dropsOff = this._doesDropOff(stopTime);

      if (i === 0) {
        result.push(
          new GtfsScheduledTripOriginatingMovement({
            stopId: gtfsIdMetadata.stopId,
            positionId,
            departureTime: stopTime.departure_time,
            gtfsIdMetadata,
            gtfsStopSequence: stopTime.stop_sequence,
          }),
        );
      } else if (i === stopTimes.length - 1) {
        result.push(
          new GtfsScheduledTripTerminatingMovement({
            stopId: gtfsIdMetadata.stopId,
            positionId,
            arrivalTime: stopTime.arrival_time,
            gtfsIdMetadata,
            gtfsStopSequence: stopTime.stop_sequence,
          }),
        );
      } else {
        result.push(
          new GtfsScheduledTripRegularMovement({
            stopId: gtfsIdMetadata.stopId,
            positionId,
            arrivalTime: stopTime.arrival_time,
            departureTime: stopTime.departure_time,
            picksUp,
            dropsOff,
            gtfsIdMetadata,
            gtfsStopSequence: stopTime.stop_sequence,
          }),
        );
      }
    }

    return result;
  }

  private _doesPickUp(stopTime: StopTimesCsvRow): boolean {
    if (stopTime.pickup_type === STOP_TIME_PICKUP_TYPE_REGULAR) {
      return true;
    } else if (stopTime.pickup_type === STOP_TIME_PICKUP_TYPE_NO_PICKUP) {
      return false;
    } else {
      this._onError(new UnexpectedPickupTypeError(stopTime));

      // If pickup_type is unexpected, let's just treat it like a normal stop. I
      // don't think we need to exclude the whole trip for something as minor as
      // mislabelling pick up only stops.
      return true;
    }
  }

  private _doesDropOff(stopTime: StopTimesCsvRow): boolean {
    if (stopTime.drop_off_type === STOP_TIME_DROP_OFF_TYPE_REGULAR) {
      return true;
    } else if (stopTime.drop_off_type === STOP_TIME_DROP_OFF_TYPE_NO_DROP_OFF) {
      return false;
    } else {
      this._onError(new UnexpectedDropOffTypeError(stopTime));

      // If drop_off_type is unexpected, let's just treat it like a normal stop.
      // I don't think we need to exclude the whole trip for something as minor
      // as mislabelling drop off only stops.
      return true;
    }
  }
}

export type GtfsRouteMatchingError =
  | NoMatchingRouteError
  | StopTimeReferencesUnmappedStopIdError
  | UnexpectedPickupTypeError
  | UnexpectedDropOffTypeError;

export class NoMatchingRouteError extends Error {
  readonly type = "no-matching-route";
  constructor(
    readonly stopTimes: StopTimesCsv,
    readonly resolvedStopIds: readonly number[],
  ) {
    super();
  }
}

export class StopTimeReferencesUnmappedStopIdError extends Error {
  readonly type = "stop-time-references-unmapped-stop-id";
  constructor(readonly stopTime: StopTimesCsvRow) {
    super();
  }
}

export class UnexpectedPickupTypeError extends Error {
  readonly type = "unexpected-pickup-type";
  constructor(readonly stopTime: StopTimesCsvRow) {
    super();
  }
}

export class UnexpectedDropOffTypeError extends Error {
  readonly type = "unexpected-drop-off-type";
  constructor(readonly stopTime: StopTimesCsvRow) {
    super();
  }
}
