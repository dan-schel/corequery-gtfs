import { describe, expect, it } from "vitest";
import {
  GtfsRouteMatcher,
  NoMatchingRouteError,
  StopTimeReferencesUnmappedStopIdError,
  UnexpectedDropOffTypeError,
  UnexpectedPickupTypeError,
  type GtfsRouteMatchingError,
} from "../../../../../src/gtfs/corequery-gtfs/parser/schedule/gtfs-route-matcher.js";
import { Route } from "../../../../../src/gtfs/corequery-gtfs/data/route/route.js";
import { GtfsStopTime } from "../../../../../src/gtfs/corequery-gtfs/data/gtfs-stop-time.js";
import type { StopTimesCsvRow } from "../../../../../src/gtfs/corequery-gtfs/data/raw/schedule-csvs.js";
import { StopGtfsIdCollection } from "../../../../../src/gtfs/corequery-gtfs/data/ids/stop-gtfs-id-collection.js";
import { StopGtfsIdMapping } from "../../../../../src/gtfs/corequery-gtfs/data/ids/stop-gtfs-id-mapping.js";
import { RouteStop } from "../../../../../src/gtfs/corequery-gtfs/data/route/route-stop.js";

describe("GtfsRouteMatcher", () => {
  const STOP_MAPPING = new StopGtfsIdMapping(
    new Map([
      [1, StopGtfsIdCollection.withParentOnly(1, "1")],
      [2, StopGtfsIdCollection.withParentOnly(2, "2")],
      [3, StopGtfsIdCollection.withParentOnly(3, "3")],
      [4, StopGtfsIdCollection.withParentOnly(4, "4")],
      [5, StopGtfsIdCollection.withParentOnly(5, "5")],
    ]),
  );

  const ROUTES_FOR_LINE = [
    new Route({
      color: "red",
      stops: routeStops([1, 2, 3]),
      serviceTags: [],
    }),
  ];

  it("matches the shortest compatible route and injects passing movements", () => {
    const errors: GtfsRouteMatchingError[] = [];
    const matcher = new GtfsRouteMatcher((e) => errors.push(e));

    const routes = [
      new Route({
        color: "red",
        stops: routeStops([1, 2, 3, 4]),
        serviceTags: [10],
      }),
      new Route({
        color: "blue",
        stops: routeStops([1, 2, 3, 4, 5]),
        serviceTags: [20],
      }),
    ];

    const result = matcher.match(
      [stopTime("1"), stopTime("3"), stopTime("4")],
      routes,
      STOP_MAPPING,
    );

    expect(errors).toEqual([]);
    if (result == null) throw new Error("Expected a route match.");

    expect(result.color).toBe("red");
    expect(result.serviceTags).toEqual([10]);
    expect(result.movements.map((movement) => movement.type)).toEqual([
      "originating",
      "passing",
      "regular",
      "terminating",
    ]);
    expect(result.movements.map((movement) => movement.stopId)).toEqual([
      1, 2, 3, 4,
    ]);
  });

  it("reports when no route matches the served stop order", () => {
    const errors: GtfsRouteMatchingError[] = [];
    const matcher = new GtfsRouteMatcher((e) => errors.push(e));

    const stopTimes = [stopTime("1"), stopTime("4")];
    const result = matcher.match(stopTimes, ROUTES_FOR_LINE, STOP_MAPPING);

    expect(result).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(NoMatchingRouteError);
  });

  it("reports stop IDs that are not in the GTFS stop mapping", () => {
    const errors: GtfsRouteMatchingError[] = [];
    const matcher = new GtfsRouteMatcher((e) => errors.push(e));

    const stopTimes = [stopTime("missing")];
    const result = matcher.match(stopTimes, ROUTES_FOR_LINE, STOP_MAPPING);

    expect(result).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(StopTimeReferencesUnmappedStopIdError);
  });

  it("reports unexpected pickup types but still matches the trip", () => {
    const errors: GtfsRouteMatchingError[] = [];
    const matcher = new GtfsRouteMatcher((e) => errors.push(e));

    const stopTimes = [{ ...stopTime("1"), pickup_type: 2 }, stopTime("2")];
    const result = matcher.match(stopTimes, ROUTES_FOR_LINE, STOP_MAPPING);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(UnexpectedPickupTypeError);
    expect(result).not.toBeNull();
  });

  it("reports unexpected drop-off types but still matches the trip", () => {
    const errors: GtfsRouteMatchingError[] = [];
    const matcher = new GtfsRouteMatcher((e) => errors.push(e));

    const stopTimes = [stopTime("1"), { ...stopTime("2"), drop_off_type: 2 }];
    const result = matcher.match(stopTimes, ROUTES_FOR_LINE, STOP_MAPPING);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(UnexpectedDropOffTypeError);
    expect(result).not.toBeNull();
  });

  function stopTime(gtfsStopId: string): StopTimesCsvRow {
    return {
      stop_id: gtfsStopId,

      // Nothing else matters for GtfsRouteMatcher, only the stop_id. Even
      // stop_sequence is only passed through as metadata, since GtfsRouteMatcher
      // handles the data after GtfsStopTimeNormaliser has already run, so takes
      // the stop times in the order they're given.
      trip_id: "",
      stop_sequence: 1,
      arrival_time: GtfsStopTime.parse("00:00:00"),
      departure_time: GtfsStopTime.parse("00:00:00"),
      pickup_type: 0,
      drop_off_type: 0,
    };
  }

  function routeStops(stopIds: readonly number[]) {
    return stopIds.map(
      (stopId) => new RouteStop({ stopId, collapseInStoppingPatterns: false }),
    );
  }
});
