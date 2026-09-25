import { arraysMatch } from "@dan-schel/js-utils";
import { describe, expect, it } from "vitest";
import { GtfsStopTime } from "../../../src/data/gtfs-stop-time.js";
import { BonusLinesMapping } from "../../../src/data/route/bonus-lines-mapping.js";
import { LineRoutesMapping } from "../../../src/data/route/line-routes-mapping.js";
import { GtfsScheduledTripOriginatingMovement } from "../../../src/data/trip/scheduled/gtfs-scheduled-trip-originating-movement.js";
import { GtfsScheduledTripPassingMovement } from "../../../src/data/trip/scheduled/gtfs-scheduled-trip-passing-movement.js";
import { GtfsScheduledTripRegularMovement } from "../../../src/data/trip/scheduled/gtfs-scheduled-trip-regular-movement.js";
import { GtfsScheduledTripTerminatingMovement } from "../../../src/data/trip/scheduled/gtfs-scheduled-trip-terminating-movement.js";
import type { GtfsScheduledTripMovement } from "../../../src/data/trip/scheduled/types.js";
import {
  type GtfsRouteMatchingError,
  GtfsRouteMatcher,
  NoMatchingRouteError,
} from "../../../src/parser/schedule/gtfs-route-matcher.js";

describe("GtfsRouteMatcher", () => {
  const LINE_ID = 1;
  const BONUS_LINE_ID = 2;

  const LINE_ROUTES_MAPPING = LineRoutesMapping.build({
    [LINE_ID]: [
      {
        color: "red",
        serviceTags: [],
        stops: [
          { stopId: 1, collapseInStoppingPatterns: false },
          { stopId: 2, collapseInStoppingPatterns: false },
          { stopId: 3, collapseInStoppingPatterns: false },
        ],
      },
    ],
  });

  const NO_BONUS_LINES = BonusLinesMapping.build({});

  it("matches the shortest compatible route and injects passing movements", () => {
    const lineRoutesMapping = LineRoutesMapping.build({
      [LINE_ID]: [
        {
          color: "red",
          stops: routeStops([1, 2, 3, 4]),
          serviceTags: [10],
        },
        {
          color: "blue",
          stops: routeStops([1, 2, 3, 4, 5]),
          serviceTags: [20],
        },
      ],
    });

    const errors: GtfsRouteMatchingError[] = [];
    const matcher = new GtfsRouteMatcher({
      onError: (e) => errors.push(e),
      lineRoutesMapping: lineRoutesMapping,
      bonusLinesMapping: NO_BONUS_LINES,
    });

    const movements = [originating(1), regular(3), terminating(4)];

    const result = matcher.match<GtfsScheduledTripMovement>(
      LINE_ID,
      movements,
      (stopId) => new GtfsScheduledTripPassingMovement({ stopId }),
    );

    expect(errors).toEqual([]);
    if (result == null) throw new Error("Expected a route match.");

    expect(result.color).toBe("red");
    expect(result.serviceTags).toEqual([10]);
    expect(result.lineIds).toEqual([LINE_ID]);
    expect(result.movements.map((m) => m.type)).toEqual([
      "originating",
      "passing",
      "regular",
      "terminating",
    ]);
    expect(result.movements.map((m) => m.stopId)).toEqual([1, 2, 3, 4]);
  });

  it("reports when no route matches the served stop order", () => {
    const errors: GtfsRouteMatchingError[] = [];
    const matcher = new GtfsRouteMatcher({
      onError: (e) => errors.push(e),
      lineRoutesMapping: LINE_ROUTES_MAPPING,
      bonusLinesMapping: NO_BONUS_LINES,
    });

    const movements = [originating(1), terminating(4)];

    const result = matcher.match<GtfsScheduledTripMovement>(
      LINE_ID,
      movements,
      (stopId) => new GtfsScheduledTripPassingMovement({ stopId }),
    );

    expect(result).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(NoMatchingRouteError);
  });

  it("applies bonus lines to trips matching both lines' routes", () => {
    const lineRoutesMapping = LineRoutesMapping.build({
      [LINE_ID]: [
        {
          color: "blue",
          serviceTags: [7],
          stops: routeStops([1, 2]),
        },
      ],
      [BONUS_LINE_ID]: [
        {
          color: "red",
          serviceTags: [8],
          stops: routeStops([1, 2]),
        },
      ],
    });

    const bonusLinesMapping = BonusLinesMapping.build({
      [LINE_ID]: { mode: "add", lines: [BONUS_LINE_ID] },
    });

    const errors: GtfsRouteMatchingError[] = [];
    const matcher = new GtfsRouteMatcher({
      onError: (e) => errors.push(e),
      lineRoutesMapping,
      bonusLinesMapping,
    });

    const movements = [originating(1), terminating(2)];

    const result = matcher.match<GtfsScheduledTripMovement>(
      LINE_ID,
      movements,
      (stopId) => new GtfsScheduledTripPassingMovement({ stopId }),
    );

    expect(errors).toEqual([]);
    if (result == null) throw new Error("Expected a route match.");
    expect(arraysMatch(result.lineIds, [LINE_ID, BONUS_LINE_ID])).toBe(true);
    expect(arraysMatch(result.serviceTags, [7, 8])).toBe(true);
  });

  it("replaces the mapped line with bonus lines when in replace mode", () => {
    const lineRoutesMapping = LineRoutesMapping.build({
      [LINE_ID]: [
        {
          color: "blue",
          serviceTags: [7],
          stops: routeStops([1, 2]),
        },
      ],
      [BONUS_LINE_ID]: [
        {
          color: "red",
          serviceTags: [8],
          stops: routeStops([1, 2]),
        },
      ],
    });

    const bonusLinesMapping = BonusLinesMapping.build({
      [LINE_ID]: { mode: "replace", lines: [BONUS_LINE_ID] },
    });

    const errors: GtfsRouteMatchingError[] = [];
    const matcher = new GtfsRouteMatcher({
      onError: (e) => errors.push(e),
      lineRoutesMapping,
      bonusLinesMapping,
    });

    const movements = [originating(1), terminating(2)];

    const result = matcher.match<GtfsScheduledTripMovement>(
      LINE_ID,
      movements,
      (stopId) => new GtfsScheduledTripPassingMovement({ stopId }),
    );

    expect(errors).toEqual([]);
    if (result == null) throw new Error("Expected a route match.");
    expect(result.lineIds).toStrictEqual([BONUS_LINE_ID]);
    expect(result.serviceTags).toStrictEqual([8]);
  });

  it("does not remove the mapped line when in replace mode if no bonus lines match", () => {
    const lineRoutesMapping = LineRoutesMapping.build({
      [LINE_ID]: [
        {
          color: "blue",
          serviceTags: [7],
          stops: routeStops([1, 2]),
        },
      ],
      [BONUS_LINE_ID]: [
        {
          color: "red",
          serviceTags: [8],
          stops: routeStops([1, 3]), // doesn't match the trip's route
        },
      ],
    });

    const bonusLinesMapping = BonusLinesMapping.build({
      [LINE_ID]: { mode: "replace", lines: [BONUS_LINE_ID] },
    });

    const errors: GtfsRouteMatchingError[] = [];
    const matcher = new GtfsRouteMatcher({
      onError: (e) => errors.push(e),
      lineRoutesMapping,
      bonusLinesMapping,
    });

    const result = matcher.match<GtfsScheduledTripMovement>(
      LINE_ID,
      [originating(1), terminating(2)],
      (stopId) => new GtfsScheduledTripPassingMovement({ stopId }),
    );

    expect(errors).toEqual([]);
    if (result == null) throw new Error("Expected a route match.");
    expect(result.lineIds).toStrictEqual([LINE_ID]);
    expect(result.serviceTags).toStrictEqual([7]);
  });

  function originating(stopId: number) {
    return new GtfsScheduledTripOriginatingMovement({
      stopId,
      positionId: null,
      departureTime: GtfsStopTime.parse("00:00:00"),
      gtfsIdMetadata: { type: "general", id: stopId.toString(), stopId },
      gtfsStopSequence: 1,
    });
  }

  function terminating(stopId: number) {
    return new GtfsScheduledTripTerminatingMovement({
      stopId,
      positionId: null,
      arrivalTime: GtfsStopTime.parse("00:00:00"),
      gtfsIdMetadata: { type: "general", id: stopId.toString(), stopId },
      gtfsStopSequence: 1,
    });
  }

  function regular(stopId: number) {
    return new GtfsScheduledTripRegularMovement({
      stopId,
      positionId: null,
      arrivalTime: GtfsStopTime.parse("00:00:00"),
      departureTime: GtfsStopTime.parse("00:00:00"),
      picksUp: true,
      dropsOff: true,
      gtfsIdMetadata: { type: "general", id: stopId.toString(), stopId },
      gtfsStopSequence: 1,
    });
  }

  function routeStops(stopIds: readonly number[]) {
    return stopIds.map((stopId) => ({
      stopId,
      collapseInStoppingPatterns: false,
    }));
  }
});
