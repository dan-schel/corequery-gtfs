import type { Color } from "../corequery-types.js";
import type { BonusLinesMapping } from "../data/route/bonus-lines-mapping.js";
import type { LineRoutesMapping } from "../data/route/line-routes-mapping.js";
import type { Route } from "../data/route/route.js";
import type { GtfsTripMovement } from "../data/trip/types.js";

export type MatchedRoute<T> = {
  movements: readonly T[];
  lineIds: readonly number[];
  color: Color | null;
  serviceTags: readonly number[];
};

export type GtfsRouteMatcherFields = {
  readonly lineRoutesMapping: LineRoutesMapping;
  readonly bonusLinesMapping: BonusLinesMapping;
  readonly onError: (error: GtfsRouteMatchingError) => void;
};

export class GtfsRouteMatcher {
  private readonly _onError: (error: GtfsRouteMatchingError) => void;

  private readonly _lineRoutesMapping: LineRoutesMapping;
  private readonly _bonusLinesMapping: BonusLinesMapping;

  constructor(fields: GtfsRouteMatcherFields) {
    this._lineRoutesMapping = fields.lineRoutesMapping;
    this._bonusLinesMapping = fields.bonusLinesMapping;
    this._onError = fields.onError;
  }

  match<T extends GtfsTripMovement>(
    lineId: number,
    servicingMovements: readonly T[],
    buildPassingMovement: (stopId: number) => T,
  ): MatchedRoute<T> | null {
    const stopIds = servicingMovements.map((m) => m.stopId);
    const primaryRoute = this._getBestMatchForLine(lineId, stopIds);
    if (primaryRoute == null) {
      this._onError(new NoMatchingRouteError(stopIds));
      return null;
    }

    const fullMovements = this._addPassingMovementsFromRoute(
      servicingMovements,
      primaryRoute,
      buildPassingMovement,
    );

    const fullMovementsStopIds = fullMovements.map((m) => m.stopId);
    const { lineIds, serviceTags } = this._applyBonusLines(
      lineId,
      primaryRoute.serviceTags,
      fullMovementsStopIds,
    );

    return {
      movements: fullMovements,
      lineIds,
      color: primaryRoute.color,
      serviceTags,
    };
  }

  private _getBestMatchForLine(lineId: number, stopIds: readonly number[]) {
    const routesForLine = this._lineRoutesMapping.forLine(lineId);

    return routesForLine
      .filter((r) => r.matchesStoppingOrder(stopIds))
      .reduce<Route | null>(
        (prev, me) => (prev == null || me.isShorterThan(prev) ? me : prev),
        null,
      );
  }

  private _applyBonusLines(
    primaryLineId: number,
    primaryServiceTags: readonly number[],
    stopIds: readonly number[],
  ) {
    const bonusLines = this._bonusLinesMapping.forLine(primaryLineId);
    if (bonusLines == null) {
      return { lineIds: [primaryLineId], serviceTags: primaryServiceTags };
    }

    // Go through all bonus lines, and collect the line IDs and service tags
    // for any routes that match.
    const lineIds = new Set<number>();
    const serviceTags = new Set<number>();
    for (const bonusLine of bonusLines.lines) {
      const route = this._getBestMatchForLine(bonusLine, stopIds);
      if (route != null) {
        lineIds.add(bonusLine);
        for (const serviceTag of route.serviceTags) {
          serviceTags.add(serviceTag);
        }
      }
    }

    // If in "replace" mode, we throw away the main route's line ID and tags if
    // anything else matches. Otherwise they're added on.
    const shouldReplace = lineIds.size > 0 && bonusLines.mode === "replace";
    if (!shouldReplace) {
      lineIds.add(primaryLineId);
      for (const serviceTag of primaryServiceTags) {
        serviceTags.add(serviceTag);
      }
    }

    return {
      lineIds: Array.from(lineIds),
      serviceTags: Array.from(serviceTags),
    };
  }

  private _addPassingMovementsFromRoute<T extends GtfsTripMovement>(
    servicingMovements: readonly T[],
    matchingRoute: Route,
    buildPassingMovement: (stopId: number) => T,
  ) {
    const result: T[] = [];

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
        result.push(buildPassingMovement(routeStop.stopId));
      }
    }

    return result;
  }
}

export type GtfsRouteMatchingError = NoMatchingRouteError;

export class NoMatchingRouteError {
  readonly type = "no-matching-route";
  constructor(readonly stopIds: readonly number[]) {}
}
