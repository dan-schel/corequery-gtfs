import { describe, expect, it } from "vitest";
import { GtfsScheduleData } from "../../../src/data/gtfs-schedule-data.js";
import { GtfsScheduledTrip } from "../../../src/data/gtfs-scheduled-trip.js";
import { GtfsStopTime } from "../../../src/data/gtfs-stop-time.js";
import { StopGtfsIdCollection } from "../../../src/data/ids/stop-gtfs-id-collection.js";
import { StopGtfsIdMapping } from "../../../src/data/ids/stop-gtfs-id-mapping.js";
import {
  type GtfsTripUpdateParsingError,
  GtfsTripUpdateParser,
  UnsupportedTripUpdateScheduleRelationshipError,
  NoStopTimeUpdateFieldGivenError,
  UnsupportedStopTimeUpdateEntryScheduleRelationshipError,
  NecessaryFieldNotInStopTimeUpdateEntryError,
  StopTimeUpdateEntryReferencesNonExistentStopSequenceError,
  MultipleStopTimeUpdateEntriesForSameMovementIndexError,
  StopTimeUpdateEntryReferencesUnmappedStopIdError,
  StopTimeUpdateEntryChangesStopError,
  NeitherTimeNorDelayGivenError,
  TimeAndDelayDisagreeWithEachOtherError,
  NeitherArrivalNorDepartureGivenError,
  StopTimeUpdateEntryChangesPlatformError,
} from "../../../src/parser/realtime/gtfs-trip-update-parser.js";

const TIMEZONE = "Australia/Melbourne";

const TRIP = GtfsScheduledTrip.simple({
  gtfsTripId: "trip-1",
  originStopId: 1,
  originationTime: GtfsStopTime.parse("00:01:00"),
  terminusStopId: 2,
  terminationTime: GtfsStopTime.parse("00:02:00"),
});

const SCHEDULE = new GtfsScheduleData([TRIP], [TRIP.calendar]);

const TRIP_DESCRIPTOR = {
  tripId: TRIP.gtfsTripId,
  routeId: TRIP.gtfsRouteId,
  startTime: TRIP.origination.departureTime,
  startDate: Temporal.PlainDate.from("2026-07-14"),
  scheduleRelationship: "SCHEDULED",
};

const STOP_MAPPING = new StopGtfsIdMapping(
  new Map([
    [1, StopGtfsIdCollection.withParentOnly(1, "stop-1")],
    [2, StopGtfsIdCollection.withParentOnly(2, "stop-2")],
  ]),
);

describe("GtfsTripUpdateParser", () => {
  it("parses a scheduled trip update and applies realtime stop times", () => {
    const errors: GtfsTripUpdateParsingError[] = [];
    const parser = new GtfsTripUpdateParser(TIMEZONE, (e) => errors.push(e));

    const realtimeDeparture = TRIP.origination.departureTime
      .toInstant(TRIP_DESCRIPTOR.startDate, TIMEZONE)
      .add({ seconds: 120 });

    const realtimeArrival = TRIP.termination.arrivalTime
      .toInstant(TRIP_DESCRIPTOR.startDate, TIMEZONE)
      .add({ seconds: 120 });

    const tripUpdate = {
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

    const parsed = parser.parse(tripUpdate, SCHEDULE, STOP_MAPPING);

    expect(errors).toEqual([]);
    if (parsed == null) throw new Error("Expected updated trip.");
    expect(parsed.isCancelled).toBe(false);

    expect(
      parsed.origination.realtimeDepartureTime?.equals(realtimeDeparture),
    ).toBe(true);
    expect(
      parsed.termination.realtimeArrivalTime?.equals(realtimeArrival),
    ).toBe(true);
  });

  it("parses cancelled trip updates", () => {
    const errors: GtfsTripUpdateParsingError[] = [];
    const parser = new GtfsTripUpdateParser(TIMEZONE, (e) => errors.push(e));

    const tripUpdate = {
      trip: {
        ...TRIP_DESCRIPTOR,
        scheduleRelationship: "CANCELED",
      },
    };

    const parsed = parser.parse(tripUpdate, SCHEDULE, STOP_MAPPING);

    expect(errors).toEqual([]);
    expect(parsed).not.toBeNull();
    expect(parsed?.isCancelled).toBe(true);
  });

  it("reports unsupported trip schedule relationships", () => {
    const errors: GtfsTripUpdateParsingError[] = [];
    const parser = new GtfsTripUpdateParser(TIMEZONE, (e) => errors.push(e));

    const tripUpdate = {
      trip: {
        scheduleRelationship: "ADDED",
      },
    };

    const parsed = parser.parse(tripUpdate, SCHEDULE, STOP_MAPPING);

    expect(parsed).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(
      UnsupportedTripUpdateScheduleRelationshipError,
    );
  });

  it("reports scheduled updates without stopTimeUpdate fields", () => {
    const errors: GtfsTripUpdateParsingError[] = [];
    const parser = new GtfsTripUpdateParser(TIMEZONE, (e) => errors.push(e));

    const tripUpdate = {
      trip: TRIP_DESCRIPTOR,
      stopTimeUpdate: undefined,
    };

    const parsed = parser.parse(tripUpdate, SCHEDULE, STOP_MAPPING);

    expect(parsed).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(NoStopTimeUpdateFieldGivenError);
  });

  it("reports unsupported stop time entry schedule relationships", () => {
    const errors: GtfsTripUpdateParsingError[] = [];
    const parser = new GtfsTripUpdateParser(TIMEZONE, (e) => errors.push(e));

    const tripUpdate = {
      trip: TRIP_DESCRIPTOR,
      stopTimeUpdate: [{ scheduleRelationship: "SKIPPED" }],
    };

    const parsed = parser.parse(tripUpdate, SCHEDULE, STOP_MAPPING);

    expect(parsed).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(
      UnsupportedStopTimeUpdateEntryScheduleRelationshipError,
    );
  });

  it("reports missing necessary fields in stop time update entries", () => {
    const errors: GtfsTripUpdateParsingError[] = [];
    const parser = new GtfsTripUpdateParser(TIMEZONE, (e) => errors.push(e));

    const tripUpdate = {
      trip: TRIP_DESCRIPTOR,
      stopTimeUpdate: [
        {
          stopSequence: undefined,
          stopId: "stop-1",
          arrival: { delay: 120 },
          departure: { delay: 120 },
          scheduleRelationship: "SCHEDULED",
        },
      ],
    };

    const parsed = parser.parse(tripUpdate, SCHEDULE, STOP_MAPPING);

    expect(parsed).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(
      NecessaryFieldNotInStopTimeUpdateEntryError,
    );
  });

  it("reports stop sequences that do not exist in the matched trip", () => {
    const errors: GtfsTripUpdateParsingError[] = [];
    const parser = new GtfsTripUpdateParser(TIMEZONE, (e) => errors.push(e));

    const tripUpdate = {
      trip: TRIP_DESCRIPTOR,
      stopTimeUpdate: [
        {
          stopSequence: 999,
          stopId: "stop-1",
          arrival: { delay: 120 },
          departure: { delay: 120 },
          scheduleRelationship: "SCHEDULED",
        },
      ],
    };

    const parsed = parser.parse(tripUpdate, SCHEDULE, STOP_MAPPING);

    expect(parsed).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(
      StopTimeUpdateEntryReferencesNonExistentStopSequenceError,
    );
  });

  it("reports duplicate stop updates for the same stop sequence", () => {
    const errors: GtfsTripUpdateParsingError[] = [];
    const parser = new GtfsTripUpdateParser(TIMEZONE, (e) => errors.push(e));

    const tripUpdate = {
      trip: TRIP_DESCRIPTOR,
      stopTimeUpdate: [
        {
          stopSequence: 1,
          stopId: "stop-1",
          arrival: { delay: 120 },
          departure: { delay: 120 },
          scheduleRelationship: "SCHEDULED",
        },
        {
          stopSequence: 1,
          stopId: "stop-1",
          arrival: { delay: 240 },
          departure: { delay: 240 },
          scheduleRelationship: "SCHEDULED",
        },
      ],
    };

    const parsed = parser.parse(tripUpdate, SCHEDULE, STOP_MAPPING);

    expect(parsed).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(
      MultipleStopTimeUpdateEntriesForSameMovementIndexError,
    );
  });

  it("reports unmapped stop IDs in stop time updates", () => {
    const errors: GtfsTripUpdateParsingError[] = [];
    const parser = new GtfsTripUpdateParser(TIMEZONE, (e) => errors.push(e));

    const tripUpdate = {
      trip: TRIP_DESCRIPTOR,
      stopTimeUpdate: [
        {
          stopSequence: 1,
          stopId: "missing-stop",
          arrival: { delay: 0 },
          departure: { delay: 0 },
          scheduleRelationship: "SCHEDULED",
        },
      ],
    };

    const parsed = parser.parse(tripUpdate, SCHEDULE, STOP_MAPPING);

    expect(parsed).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(
      StopTimeUpdateEntryReferencesUnmappedStopIdError,
    );
  });

  it("reports stop updates that change the station", () => {
    const errors: GtfsTripUpdateParsingError[] = [];
    const parser = new GtfsTripUpdateParser(TIMEZONE, (e) => errors.push(e));

    const tripUpdate = {
      trip: TRIP_DESCRIPTOR,
      stopTimeUpdate: [
        {
          stopSequence: 1,
          stopId: "stop-2",
          arrival: { delay: 0 },
          departure: { delay: 0 },
          scheduleRelationship: "SCHEDULED",
        },
      ],
    };

    const parsed = parser.parse(tripUpdate, SCHEDULE, STOP_MAPPING);

    expect(parsed).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(StopTimeUpdateEntryChangesStopError);
  });

  it("reports updated time objects with neither time nor delay", () => {
    const errors: GtfsTripUpdateParsingError[] = [];
    const parser = new GtfsTripUpdateParser(TIMEZONE, (e) => errors.push(e));

    const tripUpdate = {
      trip: TRIP_DESCRIPTOR,
      stopTimeUpdate: [
        {
          stopSequence: 1,
          stopId: "stop-1",
          arrival: {},
          departure: {},
          scheduleRelationship: "SCHEDULED",
        },
      ],
    };

    const parsed = parser.parse(tripUpdate, SCHEDULE, STOP_MAPPING);

    expect(parsed).not.toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(NeitherTimeNorDelayGivenError);
  });

  it("reports when time and delay disagree for the same update", () => {
    const errors: GtfsTripUpdateParsingError[] = [];
    const parser = new GtfsTripUpdateParser(TIMEZONE, (e) => errors.push(e));

    const scheduledDepartureSeconds =
      TRIP.origination.departureTime.toInstant(
        TRIP_DESCRIPTOR.startDate,
        TIMEZONE,
      ).epochMilliseconds / 1000;

    const tripUpdate = {
      trip: TRIP_DESCRIPTOR,
      stopTimeUpdate: [
        {
          stopSequence: 1,
          stopId: "stop-1",
          arrival: { delay: 0 },
          departure: { time: scheduledDepartureSeconds + 60, delay: 120 },
          scheduleRelationship: "SCHEDULED",
        },
      ],
    };

    const parsed = parser.parse(tripUpdate, SCHEDULE, STOP_MAPPING);

    expect(parsed).not.toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(TimeAndDelayDisagreeWithEachOtherError);
  });

  it("reports entries where both arrival and departure updates are missing", () => {
    const errors: GtfsTripUpdateParsingError[] = [];
    const parser = new GtfsTripUpdateParser(TIMEZONE, (e) => errors.push(e));

    const tripUpdate = {
      trip: TRIP_DESCRIPTOR,
      stopTimeUpdate: [
        {
          stopSequence: 1,
          stopId: "stop-1",
          scheduleRelationship: "SCHEDULED",
        },
      ],
    };

    const parsed = parser.parse(tripUpdate, SCHEDULE, STOP_MAPPING);

    expect(parsed).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(NeitherArrivalNorDepartureGivenError);
  });

  it("allows platform changes when they still map to the same stop", () => {
    const errors: GtfsTripUpdateParsingError[] = [];
    const parser = new GtfsTripUpdateParser(TIMEZONE, (e) => errors.push(e));

    const stop1Platforms = new Map([
      [1, ["1-PLATFORM-A"]],
      [2, ["1-PLATFORM-B"]],
    ]);

    const mapping = new StopGtfsIdMapping(
      new Map([
        [1, new StopGtfsIdCollection(1, "1", [], stop1Platforms, [])],
        [2, StopGtfsIdCollection.withParentOnly(2, "2")],
      ]),
    );

    const trip = TRIP.with({
      movements: [
        TRIP.origination.with({
          positionId: 1,
          gtfsIdMetadata: {
            type: "platform",
            id: "1-PLATFORM-A",
            stopId: 1,
            positionId: 1,
          },
        }),
        TRIP.termination,
      ],
    });
    const schedule = new GtfsScheduleData([trip], [trip.calendar]);

    const tripUpdate = {
      trip: TRIP_DESCRIPTOR,
      stopTimeUpdate: [
        {
          stopSequence: 1,
          stopId: "1-PLATFORM-B",
          arrival: { delay: 0 },
          departure: { delay: 0 },
          scheduleRelationship: "SCHEDULED",
        },
      ],
    };

    const parsed = parser.parse(tripUpdate, schedule, mapping);

    expect(parsed).not.toBeNull();

    // Despite parsing everything just fine (we SUPPORT platform changes), we
    // still log an "error" just for my curiousity to see if this ever actually
    // happens.
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(StopTimeUpdateEntryChangesPlatformError);

    const updatedFirstMovement = parsed?.movements[0];
    if (updatedFirstMovement?.type !== "originating")
      throw new Error("Expected originating movement.");

    expect(updatedFirstMovement.stopId).toBe(1);
    expect(updatedFirstMovement.originalPositionId).toBe(1);
    expect(updatedFirstMovement.updatedPositionId).toBe(2);
    expect(updatedFirstMovement.originalGtfsIdMetadata.id).toBe("1-PLATFORM-A");
    expect(updatedFirstMovement.updatedGtfsIdMetadata.id).toBe("1-PLATFORM-B");
  });
});
