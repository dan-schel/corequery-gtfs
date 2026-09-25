import { describe, expect, it } from "vitest";
import { GtfsScheduleData } from "../../../src/data/gtfs-schedule-data.js";
import { GtfsScheduledTrip } from "../../../src/data/trip/scheduled/gtfs-scheduled-trip.js";
import { GtfsStopTime } from "../../../src/data/gtfs-stop-time.js";
import { LineGtfsIdCollection } from "../../../src/data/ids/line-gtfs-id-collection.js";
import { LineGtfsIdMapping } from "../../../src/data/ids/line-gtfs-id-mapping.js";
import { StopGtfsIdCollection } from "../../../src/data/ids/stop-gtfs-id-collection.js";
import { StopGtfsIdMapping } from "../../../src/data/ids/stop-gtfs-id-mapping.js";
import { BonusLinesMapping } from "../../../src/data/route/bonus-lines-mapping.js";
import { LineRoutesMapping } from "../../../src/data/route/line-routes-mapping.js";
import { GtfsAddedTrip } from "../../../src/data/trip/added/gtfs-added-trip.js";
import {
  type GtfsAddedTripUpdateParsingError,
  GtfsAddedTripUpdateParser,
  AddedTripIdDuplicatesScheduledTripIdError,
  AddedTripReferencesUnmappedRouteIdError,
  AddedTripStopTimeUpdateMissingTimeError,
  NecessaryFieldNotSuppliedForAddedTripError,
} from "../../../src/parser/realtime/gtfs-added-trip-update-parser.js";
import { NoStopTimeUpdateFieldGivenError } from "../../../src/parser/realtime/gtfs-trip-update-parser-common-error-types.js";

const LINE_ID = 1;
const BONUS_LINE_ID = 2;
const SERVICE_DAY = Temporal.PlainDate.from("2026-07-14");

const STOP_MAPPING = new StopGtfsIdMapping(
  new Map([
    [1, StopGtfsIdCollection.simple(1, "stop-1")],
    [2, StopGtfsIdCollection.simple(2, "stop-2")],
    [3, StopGtfsIdCollection.simple(3, "stop-3")],
  ]),
);

const LINE_GTFS_ID_MAPPING = new LineGtfsIdMapping(
  new Map([[LINE_ID, LineGtfsIdCollection.simple(LINE_ID, "route-1")]]),
);

const LINE_ROUTES_MAPPING = LineRoutesMapping.build({
  [LINE_ID]: [
    {
      color: "blue",
      serviceTags: [],
      stops: [
        { stopId: 1, collapseInStoppingPatterns: false },
        { stopId: 2, collapseInStoppingPatterns: false },
      ],
    },
  ],
});

const BONUS_LINES_MAPPING = BonusLinesMapping.build({});
const SCHEDULE = GtfsScheduleData.fromTrips([]);

const TRIP_DESCRIPTOR = {
  tripId: "added-trip-1",
  routeId: "route-1",
  startDate: SERVICE_DAY,
  scheduleRelationship: "ADDED",
};

const T1 = 1_790_326_800; // 2026-09-25T09:00:00Z
const T2 = 1_790_328_600; // 2026-09-25T09:30:00Z
const T3 = 1_790_330_400; // 2026-09-25T10:00:00Z

const VALID_STOP_UPDATES = [
  {
    stopSequence: 1,
    stopId: "stop-1",
    departure: { time: T1 },
    scheduleRelationship: "SCHEDULED",
  },
  {
    stopSequence: 2,
    stopId: "stop-2",
    arrival: { time: T2 },
    scheduleRelationship: "SCHEDULED",
  },
];

describe("GtfsAddedTripUpdateParser", () => {
  it("parses a valid added trip with originating and terminating movements", () => {
    const errors: GtfsAddedTripUpdateParsingError[] = [];
    const parser = new GtfsAddedTripUpdateParser({
      stopGtfsIdMapping: STOP_MAPPING,
      lineGtfsIdMapping: LINE_GTFS_ID_MAPPING,
      lineRoutesMapping: LINE_ROUTES_MAPPING,
      bonusLinesMapping: BONUS_LINES_MAPPING,
      onError: (e) => errors.push(e),
    });

    const parsed = parser.parse(
      { trip: TRIP_DESCRIPTOR, stopTimeUpdate: VALID_STOP_UPDATES },
      SCHEDULE,
    );

    expect(errors).toEqual([]);
    if (parsed == null) throw new Error("Expected an added trip.");
    if (!(parsed instanceof GtfsAddedTrip)) throw new Error();
    expect(parsed.gtfsTripId).toBe(TRIP_DESCRIPTOR.tripId);
    expect(parsed.origination.departureTime).toEqual(
      Temporal.Instant.from("2026-09-25T09:00:00Z"),
    );
    expect(parsed.termination.arrivalTime).toEqual(
      Temporal.Instant.from("2026-09-25T09:30:00Z"),
    );
  });

  it("reports missing required fields in the trip descriptor", () => {
    const errors: GtfsAddedTripUpdateParsingError[] = [];
    const parser = new GtfsAddedTripUpdateParser({
      stopGtfsIdMapping: STOP_MAPPING,
      lineGtfsIdMapping: LINE_GTFS_ID_MAPPING,
      lineRoutesMapping: LINE_ROUTES_MAPPING,
      bonusLinesMapping: BONUS_LINES_MAPPING,
      onError: (e) => errors.push(e),
    });

    const parsed = parser.parse(
      { trip: { scheduleRelationship: "ADDED" } },
      SCHEDULE,
    );

    expect(parsed).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(
      NecessaryFieldNotSuppliedForAddedTripError,
    );
  });

  it("reports when the route ID is not mapped to a known line", () => {
    const errors: GtfsAddedTripUpdateParsingError[] = [];
    const parser = new GtfsAddedTripUpdateParser({
      stopGtfsIdMapping: STOP_MAPPING,
      lineGtfsIdMapping: LINE_GTFS_ID_MAPPING,
      lineRoutesMapping: LINE_ROUTES_MAPPING,
      bonusLinesMapping: BONUS_LINES_MAPPING,
      onError: (e) => errors.push(e),
    });

    const parsed = parser.parse(
      {
        trip: { ...TRIP_DESCRIPTOR, routeId: "unknown-route" },
        stopTimeUpdate: VALID_STOP_UPDATES,
      },
      SCHEDULE,
    );

    expect(parsed).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(AddedTripReferencesUnmappedRouteIdError);
  });

  it("reports when the added trip ID duplicates a scheduled trip ID", () => {
    const errors: GtfsAddedTripUpdateParsingError[] = [];
    const parser = new GtfsAddedTripUpdateParser({
      stopGtfsIdMapping: STOP_MAPPING,
      lineGtfsIdMapping: LINE_GTFS_ID_MAPPING,
      lineRoutesMapping: LINE_ROUTES_MAPPING,
      bonusLinesMapping: BONUS_LINES_MAPPING,
      onError: (e) => errors.push(e),
    });

    const existingTrip = GtfsScheduledTrip.simple({
      gtfsTripId: TRIP_DESCRIPTOR.tripId,
      originStopId: 1,
      originationTime: GtfsStopTime.parse("00:01:00"),
      terminusStopId: 2,
      terminationTime: GtfsStopTime.parse("00:02:00"),
    });

    const parsed = parser.parse(
      { trip: TRIP_DESCRIPTOR, stopTimeUpdate: VALID_STOP_UPDATES },
      GtfsScheduleData.fromTrips([existingTrip]),
    );

    expect(parsed).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(AddedTripIdDuplicatesScheduledTripIdError);
  });

  it("reports missing stopTimeUpdate field", () => {
    const errors: GtfsAddedTripUpdateParsingError[] = [];
    const parser = new GtfsAddedTripUpdateParser({
      stopGtfsIdMapping: STOP_MAPPING,
      lineGtfsIdMapping: LINE_GTFS_ID_MAPPING,
      lineRoutesMapping: LINE_ROUTES_MAPPING,
      bonusLinesMapping: BONUS_LINES_MAPPING,
      onError: (e) => errors.push(e),
    });

    const parsed = parser.parse({ trip: TRIP_DESCRIPTOR }, SCHEDULE);

    expect(parsed).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(NoStopTimeUpdateFieldGivenError);
  });

  it("reports when an entry is missing a required time", () => {
    const errors: GtfsAddedTripUpdateParsingError[] = [];
    const parser = new GtfsAddedTripUpdateParser({
      stopGtfsIdMapping: STOP_MAPPING,
      lineGtfsIdMapping: LINE_GTFS_ID_MAPPING,
      lineRoutesMapping: LINE_ROUTES_MAPPING,
      bonusLinesMapping: BONUS_LINES_MAPPING,
      onError: (e) => errors.push(e),
    });

    const parsed = parser.parse(
      {
        trip: TRIP_DESCRIPTOR,
        stopTimeUpdate: [
          {
            stopSequence: 1,
            stopId: "stop-1",
            scheduleRelationship: "SCHEDULED",
          },
          {
            stopSequence: 2,
            stopId: "stop-2",
            arrival: { time: T2 },
            scheduleRelationship: "SCHEDULED",
          },
        ],
      },
      SCHEDULE,
    );

    expect(parsed).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(AddedTripStopTimeUpdateMissingTimeError);
  });

  it("injects passing movements for stops not serviced on the route", () => {
    const errors: GtfsAddedTripUpdateParsingError[] = [];
    const lineRoutesMapping = LineRoutesMapping.build({
      [LINE_ID]: [
        {
          color: "blue",
          serviceTags: [],
          stops: [
            { stopId: 1, collapseInStoppingPatterns: false },
            { stopId: 2, collapseInStoppingPatterns: false },
            { stopId: 3, collapseInStoppingPatterns: false },
          ],
        },
      ],
    });
    const parser = new GtfsAddedTripUpdateParser({
      stopGtfsIdMapping: STOP_MAPPING,
      lineGtfsIdMapping: LINE_GTFS_ID_MAPPING,
      lineRoutesMapping,
      bonusLinesMapping: BONUS_LINES_MAPPING,
      onError: (e) => errors.push(e),
    });

    const parsed = parser.parse(
      {
        trip: TRIP_DESCRIPTOR,
        stopTimeUpdate: [
          {
            stopSequence: 1,
            stopId: "stop-1",
            departure: { time: T1 },
            scheduleRelationship: "SCHEDULED",
          },
          {
            stopSequence: 3,
            stopId: "stop-3",
            arrival: { time: T3 },
            scheduleRelationship: "SCHEDULED",
          },
        ],
      },
      SCHEDULE,
    );

    expect(errors).toEqual([]);
    if (parsed == null) throw new Error("Expected an added trip.");
    expect(parsed.movements.map((m) => m.type)).toEqual([
      "originating",
      "passing",
      "terminating",
    ]);
    expect(parsed.movements.map((m) => m.stopId)).toEqual([1, 2, 3]);
  });

  it("applies bonus line IDs and service tags", () => {
    const errors: GtfsAddedTripUpdateParsingError[] = [];
    const lineRoutesMapping = LineRoutesMapping.build({
      [LINE_ID]: [
        {
          color: "blue",
          serviceTags: [10],
          stops: [
            { stopId: 1, collapseInStoppingPatterns: false },
            { stopId: 2, collapseInStoppingPatterns: false },
          ],
        },
      ],
      [BONUS_LINE_ID]: [
        {
          color: "red",
          serviceTags: [20],
          stops: [
            { stopId: 1, collapseInStoppingPatterns: false },
            { stopId: 2, collapseInStoppingPatterns: false },
          ],
        },
      ],
    });
    const bonusLinesMapping = BonusLinesMapping.build({
      [LINE_ID]: { mode: "add", lines: [BONUS_LINE_ID] },
    });
    const parser = new GtfsAddedTripUpdateParser({
      stopGtfsIdMapping: STOP_MAPPING,
      lineGtfsIdMapping: LINE_GTFS_ID_MAPPING,
      lineRoutesMapping,
      bonusLinesMapping,
      onError: (e) => errors.push(e),
    });

    const parsed = parser.parse(
      { trip: TRIP_DESCRIPTOR, stopTimeUpdate: VALID_STOP_UPDATES },
      SCHEDULE,
    );

    expect(errors).toEqual([]);
    if (parsed == null) throw new Error("Expected an added trip.");
    expect(parsed.lineIds).toContain(LINE_ID);
    expect(parsed.lineIds).toContain(BONUS_LINE_ID);
    expect(parsed.serviceTags).toContain(10);
    expect(parsed.serviceTags).toContain(20);
  });
});
