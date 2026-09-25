import { describe, expect, it } from "vitest";
import { GtfsScheduleData } from "../../../src/data/gtfs-schedule-data.js";
import { GtfsStopTime } from "../../../src/data/gtfs-stop-time.js";
import { GtfsScheduledTrip } from "../../../src/data/trip/scheduled/gtfs-scheduled-trip.js";
import { GtfsUpdatedTrip } from "../../../src/data/trip/updated/gtfs-updated-trip.js";
import {
  type GtfsCancelledTripUpdateParsingError,
  GtfsCancelledTripUpdateParser,
} from "../../../src/parser/realtime/gtfs-cancelled-trip-update-parser.js";

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
  scheduleRelationship: "CANCELED",
};

describe("GtfsCancelledTripUpdateParser", () => {
  it("parses cancelled trip updates", () => {
    const errors: GtfsCancelledTripUpdateParsingError[] = [];
    const parser = new GtfsCancelledTripUpdateParser({
      timezone: TIMEZONE,
      onError: (e) => errors.push(e),
    });

    const tripUpdate = {
      trip: TRIP_DESCRIPTOR,
    };

    const parsed = parser.parse(tripUpdate, SCHEDULE);

    expect(errors).toEqual([]);
    expect(parsed).not.toBeNull();
    if (!(parsed instanceof GtfsUpdatedTrip)) throw new Error();
    expect(parsed.isCancelled).toBe(true);
  });
});
