import { describe, expect, it } from "vitest";
import { GtfsCalendar } from "../../../src/data/gtfs-calendar.js";
import { GtfsStopTime } from "../../../src/data/gtfs-stop-time.js";
import { LineGtfsIdCollection } from "../../../src/data/ids/line-gtfs-id-collection.js";
import { LineGtfsIdMapping } from "../../../src/data/ids/line-gtfs-id-mapping.js";
import { StopGtfsIdCollection } from "../../../src/data/ids/stop-gtfs-id-collection.js";
import { StopGtfsIdMapping } from "../../../src/data/ids/stop-gtfs-id-mapping.js";
import { BonusLinesMapping } from "../../../src/data/route/bonus-lines-mapping.js";
import { LineRoutesMapping } from "../../../src/data/route/line-routes-mapping.js";
import { MultipleStopSequencesError } from "../../../src/parser/schedule/gtfs-stop-time-normaliser.js";
import {
  type GtfsTripParsingError,
  GtfsTripParser,
  DuplicateTripIdError,
  StopTimeReferencesNonExistentTripError,
  TripReferencesNonExistentCalendarError,
  TripReferencesUnmappedRouteIdError,
  StopTimeReferencesUnmappedStopIdError,
  UnexpectedPickupTypeError,
  UnexpectedDropOffTypeError,
} from "../../../src/parser/schedule/gtfs-trip-parser.js";

describe("GtfsTripParser", () => {
  const LINE_ID = 1;
  const LINE_GTFS_ID = "line-1";

  const LINE_GTFS_ID_MAPPING = new LineGtfsIdMapping(
    new Map([[LINE_ID, LineGtfsIdCollection.simple(LINE_ID, LINE_GTFS_ID)]]),
  );

  const STOP_GTFS_ID_MAPPING = new StopGtfsIdMapping(
    new Map([
      [1, StopGtfsIdCollection.simple(1, "1")],
      [2, StopGtfsIdCollection.simple(2, "2")],
    ]),
  );

  const LINE_ROUTES_MAPPING = LineRoutesMapping.build({
    [LINE_ID]: [
      {
        color: "blue",
        serviceTags: [7],
        stops: [
          { stopId: 1, collapseInStoppingPatterns: false },
          { stopId: 2, collapseInStoppingPatterns: false },
        ],
      },
    ],
  });

  const BONUS_LINES_MAPPING = BonusLinesMapping.build({});
  const CALENDAR_EVERYDAY = GtfsCalendar.everyday("cal");

  const TRIP_ROW = {
    trip_id: "trip-1",
    route_id: LINE_GTFS_ID,
    service_id: CALENDAR_EVERYDAY.gtfsCalendarId,
  };
  const STOP_TIME_1 = {
    trip_id: TRIP_ROW.trip_id,
    arrival_time: GtfsStopTime.parse("00:00:00"),
    departure_time: GtfsStopTime.parse("00:00:00"),
    stop_id: "1",
    stop_sequence: 1,
    pickup_type: 0,
    drop_off_type: 0,
  };
  const STOP_TIME_2 = {
    trip_id: TRIP_ROW.trip_id,
    arrival_time: GtfsStopTime.parse("00:10:00"),
    departure_time: GtfsStopTime.parse("00:10:00"),
    stop_id: "2",
    stop_sequence: 2,
    pickup_type: 0,
    drop_off_type: 0,
  };

  it("parses one simple trip end-to-end", () => {
    const errors: GtfsTripParsingError[] = [];
    const parser = new GtfsTripParser({
      lineRoutesMapping: LINE_ROUTES_MAPPING,
      bonusLinesMapping: BONUS_LINES_MAPPING,
      lineGtfsIdMapping: LINE_GTFS_ID_MAPPING,
      stopGtfsIdMapping: STOP_GTFS_ID_MAPPING,
      onError: (e) => errors.push(e),
    });

    const tripsCsv = [TRIP_ROW];
    const stopTimesCsv = [STOP_TIME_1, STOP_TIME_2];

    const { parsedTrips, ignoredTripIds } = parser.parse(
      tripsCsv,
      stopTimesCsv,
      [],
      [CALENDAR_EVERYDAY],
    );

    expect(errors).toEqual([]);
    expect(parsedTrips).toHaveLength(1);
    expect(ignoredTripIds).toEqual([]);

    const trip = parsedTrips[0];
    if (trip == null) throw new Error();

    expect(trip.gtfsTripId).toBe("trip-1");
    expect(trip.movements.map((stop) => stop.stopId)).toEqual([1, 2]);
  });

  it("reports the correct error when multiple stop time sequences are given for a trip", () => {
    // Identifying multiple stop time sequences is a responsibility of
    // StopTimeNormaliser, but it can't do it's job correctly if GtfsTripParser
    // sorts the stop times by stop_sequence before passing them onto
    // StopTimeNormaliser, so this test is essentially just checking that it
    // doesn't do that sort!

    const errors: GtfsTripParsingError[] = [];
    const parser = new GtfsTripParser({
      lineRoutesMapping: LINE_ROUTES_MAPPING,
      bonusLinesMapping: BONUS_LINES_MAPPING,
      lineGtfsIdMapping: LINE_GTFS_ID_MAPPING,
      stopGtfsIdMapping: STOP_GTFS_ID_MAPPING,
      onError: (e) => errors.push(e),
    });

    const tripsCsv = [TRIP_ROW];
    const stopTimesCsv = [
      STOP_TIME_1,
      STOP_TIME_2,

      // Repeat the same stop_sequence values again. (Use different
      // arrival/departure times to check which ones are ultimately used.)
      {
        ...STOP_TIME_1,
        arrival_time: GtfsStopTime.parse("01:00:00"),
        departure_time: GtfsStopTime.parse("01:00:00"),
      },
      {
        ...STOP_TIME_2,
        arrival_time: GtfsStopTime.parse("01:10:00"),
        departure_time: GtfsStopTime.parse("01:10:00"),
      },
    ];

    const trips = parser.parse(
      tripsCsv,
      stopTimesCsv,
      [],
      [CALENDAR_EVERYDAY],
    ).parsedTrips;

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(MultipleStopSequencesError);
    expect(trips).toHaveLength(1);

    const trip = trips[0];
    if (trip == null) throw new Error("Expected one trip.");

    expect(trip.movements.map((stop) => stop.stopId)).toEqual([1, 2]);
    expect(trip.origination.departureTime.toString()).toEqual("00:00:00");
    expect(trip.termination.arrivalTime.toString()).toEqual("00:10:00");
  });

  it("reports duplicate trip rows and keeps the first one", () => {
    const errors: GtfsTripParsingError[] = [];
    const parser = new GtfsTripParser({
      lineRoutesMapping: LINE_ROUTES_MAPPING,
      bonusLinesMapping: BONUS_LINES_MAPPING,
      lineGtfsIdMapping: LINE_GTFS_ID_MAPPING,
      stopGtfsIdMapping: STOP_GTFS_ID_MAPPING,
      onError: (e) => errors.push(e),
    });

    const tripsCsv = [TRIP_ROW, TRIP_ROW];
    const stopTimesCsv = [STOP_TIME_1, STOP_TIME_2];

    const trips = parser.parse(
      tripsCsv,
      stopTimesCsv,
      [],
      [CALENDAR_EVERYDAY],
    ).parsedTrips;

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(DuplicateTripIdError);
    expect(trips).toHaveLength(1);
  });

  it("reports stop_times rows that reference non-existent trips", () => {
    const errors: GtfsTripParsingError[] = [];
    const parser = new GtfsTripParser({
      lineRoutesMapping: LINE_ROUTES_MAPPING,
      bonusLinesMapping: BONUS_LINES_MAPPING,
      lineGtfsIdMapping: LINE_GTFS_ID_MAPPING,
      stopGtfsIdMapping: STOP_GTFS_ID_MAPPING,
      onError: (e) => errors.push(e),
    });

    const tripsCsv = [TRIP_ROW];
    const stopTimesCsv = [
      STOP_TIME_1,
      STOP_TIME_2,
      { ...STOP_TIME_1, trip_id: "missing-trip" },
    ];

    const trips = parser.parse(
      tripsCsv,
      stopTimesCsv,
      [],
      [CALENDAR_EVERYDAY],
    ).parsedTrips;

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(StopTimeReferencesNonExistentTripError);
    expect(trips).toHaveLength(1);
  });

  it("reports trips that reference non-existent calendars", () => {
    const errors: GtfsTripParsingError[] = [];
    const parser = new GtfsTripParser({
      lineRoutesMapping: LINE_ROUTES_MAPPING,
      bonusLinesMapping: BONUS_LINES_MAPPING,
      lineGtfsIdMapping: LINE_GTFS_ID_MAPPING,
      stopGtfsIdMapping: STOP_GTFS_ID_MAPPING,
      onError: (e) => errors.push(e),
    });

    const tripsCsv = [{ ...TRIP_ROW, service_id: "missing-cal" }];
    const stopTimesCsv = [STOP_TIME_1, STOP_TIME_2];

    const trips = parser.parse(
      tripsCsv,
      stopTimesCsv,
      [],
      [CALENDAR_EVERYDAY],
    ).parsedTrips;

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(TripReferencesNonExistentCalendarError);
    expect(trips).toEqual([]);
  });

  it("reports trips that reference unmapped route IDs", () => {
    const errors: GtfsTripParsingError[] = [];
    const parser = new GtfsTripParser({
      lineRoutesMapping: LINE_ROUTES_MAPPING,
      bonusLinesMapping: BONUS_LINES_MAPPING,
      lineGtfsIdMapping: LINE_GTFS_ID_MAPPING,
      stopGtfsIdMapping: STOP_GTFS_ID_MAPPING,
      onError: (e) => errors.push(e),
    });

    const tripsCsv = [{ ...TRIP_ROW, route_id: "missing-route" }];
    const stopTimesCsv = [STOP_TIME_1, STOP_TIME_2];

    const trips = parser.parse(
      tripsCsv,
      stopTimesCsv,
      [],
      [CALENDAR_EVERYDAY],
    ).parsedTrips;

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(TripReferencesUnmappedRouteIdError);
    expect(trips).toEqual([]);
  });

  it("reports stop IDs that are not in the GTFS stop mapping", () => {
    const errors: GtfsTripParsingError[] = [];
    const parser = new GtfsTripParser({
      lineRoutesMapping: LINE_ROUTES_MAPPING,
      bonusLinesMapping: BONUS_LINES_MAPPING,
      lineGtfsIdMapping: LINE_GTFS_ID_MAPPING,
      stopGtfsIdMapping: STOP_GTFS_ID_MAPPING,
      onError: (e) => errors.push(e),
    });

    const tripsCsv = [TRIP_ROW];
    const stopTimesCsv = [{ ...STOP_TIME_1, stop_id: "missing" }, STOP_TIME_2];

    const trips = parser.parse(
      tripsCsv,
      stopTimesCsv,
      [],
      [CALENDAR_EVERYDAY],
    ).parsedTrips;

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(StopTimeReferencesUnmappedStopIdError);
    expect(trips).toEqual([]);
  });

  it("reports unexpected pickup types but still matches the trip", () => {
    const errors: GtfsTripParsingError[] = [];
    const parser = new GtfsTripParser({
      lineRoutesMapping: LINE_ROUTES_MAPPING,
      bonusLinesMapping: BONUS_LINES_MAPPING,
      lineGtfsIdMapping: LINE_GTFS_ID_MAPPING,
      stopGtfsIdMapping: STOP_GTFS_ID_MAPPING,
      onError: (e) => errors.push(e),
    });

    const tripsCsv = [TRIP_ROW];
    const stopTimesCsv = [{ ...STOP_TIME_1, pickup_type: 2 }, STOP_TIME_2];

    const trips = parser.parse(
      tripsCsv,
      stopTimesCsv,
      [],
      [CALENDAR_EVERYDAY],
    ).parsedTrips;

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(UnexpectedPickupTypeError);
    expect(trips).toHaveLength(1);
  });

  it("reports unexpected drop-off types but still matches the trip", () => {
    const errors: GtfsTripParsingError[] = [];
    const parser = new GtfsTripParser({
      lineRoutesMapping: LINE_ROUTES_MAPPING,
      bonusLinesMapping: BONUS_LINES_MAPPING,
      lineGtfsIdMapping: LINE_GTFS_ID_MAPPING,
      stopGtfsIdMapping: STOP_GTFS_ID_MAPPING,
      onError: (e) => errors.push(e),
    });

    const tripsCsv = [TRIP_ROW];
    const stopTimesCsv = [STOP_TIME_1, { ...STOP_TIME_2, drop_off_type: 2 }];

    const trips = parser.parse(
      tripsCsv,
      stopTimesCsv,
      [],
      [CALENDAR_EVERYDAY],
    ).parsedTrips;

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(UnexpectedDropOffTypeError);
    expect(trips).toHaveLength(1);
  });

  it("outputs ignored trip IDs for any ignored line IDs", () => {
    const lineGtfsIdMapping = new LineGtfsIdMapping(
      new Map([
        [
          LINE_ID,
          new LineGtfsIdCollection(
            LINE_ID,
            [LINE_GTFS_ID],
            ["line-1-replacement-bus"],
          ),
        ],
      ]),
    );

    const errors: GtfsTripParsingError[] = [];
    const parser = new GtfsTripParser({
      lineRoutesMapping: LINE_ROUTES_MAPPING,
      bonusLinesMapping: BONUS_LINES_MAPPING,
      lineGtfsIdMapping,
      stopGtfsIdMapping: STOP_GTFS_ID_MAPPING,
      onError: (e) => errors.push(e),
    });

    const tripsCsv = [{ ...TRIP_ROW, route_id: "line-1-replacement-bus" }];
    const stopTimesCsv = [STOP_TIME_1, STOP_TIME_2];

    const { parsedTrips, ignoredTripIds } = parser.parse(
      tripsCsv,
      stopTimesCsv,
      [],
      [CALENDAR_EVERYDAY],
    );

    expect(errors).toEqual([]);
    expect(parsedTrips).toEqual([]);
    expect(ignoredTripIds).toHaveLength(1);
  });
});
