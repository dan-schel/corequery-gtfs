import { itsOk } from "@dan-schel/js-utils";
import { describe, expect, it } from "vitest";
import { GtfsScheduleData } from "../../../src/data/gtfs-schedule-data.js";
import { GtfsScheduledTrip } from "../../../src/data/gtfs-scheduled-trip.js";
import { GtfsStopTime } from "../../../src/data/gtfs-stop-time.js";
import { StopGtfsIdCollection } from "../../../src/data/ids/stop-gtfs-id-collection.js";
import { StopGtfsIdMapping } from "../../../src/data/ids/stop-gtfs-id-mapping.js";
import { GtfsRealtimeDataParser } from "../../../src/parser/realtime/gtfs-realtime-data-parser.js";
import {
  type GtfsTripUpdateParsingError,
  UnsupportedTripUpdateScheduleRelationshipError,
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

describe("GtfsRealtimeDataParser", () => {
  it("parses realtime feed into updated trips and drops invalid updates", () => {
    const errors: GtfsTripUpdateParsingError[] = [];
    const parser = new GtfsRealtimeDataParser(TIMEZONE, (e) => errors.push(e));

    const realtimeFeed = {
      tripUpdates: [
        // Valid update.
        {
          trip: TRIP_DESCRIPTOR,
          stopTimeUpdate: [
            {
              stopSequence: TRIP.origination.gtfsStopSequence,
              stopId: "stop-1",
              arrival: { delay: 120 },
              departure: { delay: 120 },
              scheduleRelationship: "SCHEDULED",
            },
          ],
        },

        // Invalid update.
        {
          trip: {
            scheduleRelationship: "ADDED",
          },
        },
      ],
    };

    const parsed = parser.parse(realtimeFeed, SCHEDULE, STOP_MAPPING);

    expect(parsed.allTrips()).toHaveLength(1);
    const updatedTrip = itsOk(parsed.allTrips()[0]);

    expect(updatedTrip.scheduledTrip.gtfsTripId).toBe(TRIP.gtfsTripId);
    const parsedDepartureTime = updatedTrip.origination.realtimeDepartureTime;
    const expectedDepartureTime = TRIP.origination.departureTime
      .toInstant(TRIP_DESCRIPTOR.startDate, TIMEZONE)
      .add({ seconds: 120 });
    expect(parsedDepartureTime?.equals(expectedDepartureTime)).toBe(true);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(
      UnsupportedTripUpdateScheduleRelationshipError,
    );
  });
});
