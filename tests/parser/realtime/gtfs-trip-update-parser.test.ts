import { describe, expect, it } from "vitest";
import { GtfsScheduleData } from "../../../src/data/gtfs-schedule-data.js";
import { GtfsScheduledTrip } from "../../../src/data/trip/scheduled/gtfs-scheduled-trip.js";
import { GtfsStopTime } from "../../../src/data/gtfs-stop-time.js";
import { LineGtfsIdMapping } from "../../../src/data/ids/line-gtfs-id-mapping.js";
import { StopGtfsIdCollection } from "../../../src/data/ids/stop-gtfs-id-collection.js";
import { StopGtfsIdMapping } from "../../../src/data/ids/stop-gtfs-id-mapping.js";
import { BonusLinesMapping } from "../../../src/data/route/bonus-lines-mapping.js";
import { LineRoutesMapping } from "../../../src/data/route/line-routes-mapping.js";
import {
  type GtfsTripUpdateParsingError,
  GtfsTripUpdateParser,
  UnsupportedTripUpdateScheduleRelationshipError,
} from "../../../src/parser/realtime/gtfs-trip-update-parser.js";
import { GtfsUpdatedTrip } from "../../../src/data/trip/updated/gtfs-updated-trip.js";
import { GtfsReplacedTrip } from "../../../src/data/trip/replaced/gtfs-replaced-trip.js";
import { GtfsScheduledTripRegularMovement } from "../../../src/data/trip/scheduled/gtfs-scheduled-trip-regular-movement.js";
import { GtfsScheduledTripTerminatingMovement } from "../../../src/data/trip/scheduled/gtfs-scheduled-trip-terminating-movement.js";
import { LineGtfsIdCollection } from "../../../src/data/ids/line-gtfs-id-collection.js";

const TIMEZONE = "Australia/Melbourne";

const TRIP = GtfsScheduledTrip.simple({
  gtfsTripId: "trip-1",
  originStopId: 1,
  originationTime: GtfsStopTime.parse("00:01:00"),
  terminusStopId: 2,
  terminationTime: GtfsStopTime.parse("00:02:00"),
});

const SCHEDULE = GtfsScheduleData.fromTrips([TRIP]);

const TRIP_DESCRIPTOR = {
  tripId: TRIP.gtfsTripId,
  routeId: TRIP.gtfsRouteId,
  startTime: TRIP.origination.departureTime,
  startDate: Temporal.PlainDate.from("2026-07-14"),
  scheduleRelationship: "SCHEDULED",
};

const STOP_MAPPING = new StopGtfsIdMapping(
  new Map([
    [1, StopGtfsIdCollection.simple(1, "stop-1")],
    [2, StopGtfsIdCollection.simple(2, "stop-2")],
  ]),
);

const LINE_GTFS_ID_MAPPING = new LineGtfsIdMapping(new Map());
const LINE_ROUTES_MAPPING = LineRoutesMapping.build({});
const BONUS_LINES_MAPPING = BonusLinesMapping.build({});

describe("GtfsTripUpdateParser", () => {
  it("orchestrates scheduled trip updates", () => {
    const errors: GtfsTripUpdateParsingError[] = [];
    const parser = new GtfsTripUpdateParser({
      timezone: TIMEZONE,
      stopGtfsIdMapping: STOP_MAPPING,
      lineGtfsIdMapping: LINE_GTFS_ID_MAPPING,
      lineRoutesMapping: LINE_ROUTES_MAPPING,
      bonusLinesMapping: BONUS_LINES_MAPPING,
      onError: (e) => errors.push(e),
    });

    const realtimeDeparture = TRIP.origination.departureTime
      .toInstant(TRIP_DESCRIPTOR.startDate, TIMEZONE)
      .add({ seconds: 120 });

    const realtimeArrival = TRIP.termination.arrivalTime
      .toInstant(TRIP_DESCRIPTOR.startDate, TIMEZONE)
      .add({ seconds: 120 });

    const scheduledTripUpdate = {
      trip: TRIP_DESCRIPTOR,
      stopTimeUpdate: [
        {
          stopSequence: TRIP.origination.gtfsStopSequence,
          stopId: "stop-1",
          arrival: { time: realtimeDeparture.epochMilliseconds / 1000 },
          departure: { time: realtimeDeparture.epochMilliseconds / 1000 },
          scheduleRelationship: "SCHEDULED",
        },
        {
          stopSequence: TRIP.termination.gtfsStopSequence,
          stopId: "stop-2",
          arrival: { delay: 120 },
          departure: { delay: 120 },
          scheduleRelationship: "SCHEDULED",
        },
      ],
    };

    const scheduledParsed = parser.parse(scheduledTripUpdate, SCHEDULE);

    expect(errors).toEqual([]);
    if (scheduledParsed == null) throw new Error("Expected updated trip.");
    if (!(scheduledParsed instanceof GtfsUpdatedTrip)) throw new Error();
    expect(scheduledParsed.isCancelled).toBe(false);

    expect(
      scheduledParsed.origination.knownRealtimeDepartureTime?.equals(
        realtimeDeparture,
      ),
    ).toBe(true);
    expect(
      scheduledParsed.termination.knownRealtimeArrivalTime?.equals(
        realtimeArrival,
      ),
    ).toBe(true);
  });

  it("routes scheduled updates containing skipped stops to the replaced parser", () => {
    const errors: GtfsTripUpdateParsingError[] = [];
    const trip = TRIP.with({
      movements: [
        TRIP.origination,
        new GtfsScheduledTripRegularMovement({
          stopId: 2,
          positionId: null,
          arrivalTime: GtfsStopTime.parse("00:02:00"),
          departureTime: GtfsStopTime.parse("00:02:30"),
          picksUp: true,
          dropsOff: true,
          gtfsIdMetadata: { type: "general", id: "stop-2", stopId: 2 },
          gtfsStopSequence: 2,
        }),
        new GtfsScheduledTripRegularMovement({
          stopId: 3,
          positionId: null,
          arrivalTime: GtfsStopTime.parse("00:03:00"),
          departureTime: GtfsStopTime.parse("00:03:30"),
          picksUp: true,
          dropsOff: true,
          gtfsIdMetadata: { type: "general", id: "stop-3", stopId: 3 },
          gtfsStopSequence: 3,
        }),
        new GtfsScheduledTripTerminatingMovement({
          stopId: 4,
          positionId: null,
          arrivalTime: GtfsStopTime.parse("00:04:00"),
          gtfsIdMetadata: { type: "general", id: "stop-4", stopId: 4 },
          gtfsStopSequence: 4,
        }),
      ],
    });
    const schedule = GtfsScheduleData.fromTrips([trip]);
    const parser = new GtfsTripUpdateParser({
      timezone: TIMEZONE,
      stopGtfsIdMapping: new StopGtfsIdMapping(
        new Map([
          [1, StopGtfsIdCollection.simple(1, "stop-1")],
          [2, StopGtfsIdCollection.simple(2, "stop-2")],
          [3, StopGtfsIdCollection.simple(3, "stop-3")],
          [4, StopGtfsIdCollection.simple(4, "stop-4")],
        ]),
      ),
      lineGtfsIdMapping: new LineGtfsIdMapping(
        new Map([[1, LineGtfsIdCollection.simple(1, "route-1")]]),
      ),
      lineRoutesMapping: LineRoutesMapping.build({
        1: [
          {
            color: "blue",
            serviceTags: [],
            stops: [1, 2, 3, 4].map((stopId) => ({
              stopId,
              collapseInStoppingPatterns: false,
            })),
          },
        ],
        2: [
          {
            color: "green",
            serviceTags: [],
            stops: [1, 2, 3].map((stopId) => ({
              stopId,
              collapseInStoppingPatterns: false,
            })),
          },
        ],
      }),
      bonusLinesMapping: BonusLinesMapping.build({
        1: { mode: "add", lines: [2] },
      }),
      onError: (e) => errors.push(e),
    });

    const parsed = parser.parse(
      {
        trip: TRIP_DESCRIPTOR,
        stopTimeUpdate: [
          {
            stopSequence: 4,
            stopId: "stop-4",
            scheduleRelationship: "SKIPPED",
          },
        ],
      },
      schedule,
    );

    expect(errors).toEqual([]);
    if (!(parsed instanceof GtfsReplacedTrip)) {
      throw new Error("Expected a replaced trip.");
    }
    expect(parsed.termination.stopId).toBe(3);
    expect(parsed.lineIds).toEqual([2, 1]);
  });

  it("reports unsupported trip schedule relationships", () => {
    const errors: GtfsTripUpdateParsingError[] = [];
    const parser = new GtfsTripUpdateParser({
      timezone: TIMEZONE,
      stopGtfsIdMapping: STOP_MAPPING,
      lineGtfsIdMapping: LINE_GTFS_ID_MAPPING,
      lineRoutesMapping: LINE_ROUTES_MAPPING,
      bonusLinesMapping: BONUS_LINES_MAPPING,
      onError: (e) => errors.push(e),
    });

    const tripUpdate = {
      trip: {
        scheduleRelationship: "CHEESEBURGER",
      },
    };

    const parsed = parser.parse(tripUpdate, SCHEDULE);

    expect(parsed).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(
      UnsupportedTripUpdateScheduleRelationshipError,
    );
  });
});
