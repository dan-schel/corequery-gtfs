import { describe, expect, it } from "vitest";
import { GtfsScheduleData } from "../../../src/data/gtfs-schedule-data.js";
import { GtfsScheduledTrip } from "../../../src/data/trip/scheduled/gtfs-scheduled-trip.js";
import { GtfsStopTime } from "../../../src/data/gtfs-stop-time.js";
import { StopGtfsIdCollection } from "../../../src/data/ids/stop-gtfs-id-collection.js";
import { StopGtfsIdMapping } from "../../../src/data/ids/stop-gtfs-id-mapping.js";
import {
  type GtfsTripUpdateParsingError,
  GtfsTripUpdateParser,
  UnsupportedTripUpdateScheduleRelationshipError,
} from "../../../src/parser/realtime/gtfs-trip-update-parser.js";
import { GtfsUpdatedTrip } from "../../../src/data/trip/updated/gtfs-updated-trip.js";

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

describe("GtfsTripUpdateParser", () => {
  it("orchestrates scheduled trip updates", () => {
    const errors: GtfsTripUpdateParsingError[] = [];
    const parser = new GtfsTripUpdateParser({
      timezone: TIMEZONE,
      stopGtfsIdMapping: STOP_MAPPING,
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

  it("reports unsupported trip schedule relationships", () => {
    const errors: GtfsTripUpdateParsingError[] = [];
    const parser = new GtfsTripUpdateParser({
      timezone: TIMEZONE,
      stopGtfsIdMapping: STOP_MAPPING,
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
