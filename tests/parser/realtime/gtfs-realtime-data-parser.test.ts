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
import { GtfsEntireVehicleFormsServiceTransfer } from "../../../src/data/gtfs-transfer.js";

const TIMEZONE = "Australia/Melbourne";

const TRIP_1 = GtfsScheduledTrip.simple({
  gtfsTripId: "trip-1",
  originStopId: 1,
  originationTime: GtfsStopTime.parse("00:01:00"),
  terminusStopId: 2,
  terminationTime: GtfsStopTime.parse("00:02:00"),
});
const TRIP_2 = GtfsScheduledTrip.simple({
  gtfsTripId: "trip-2",
  originStopId: 2,
  originationTime: GtfsStopTime.parse("00:02:00"),
  terminusStopId: 3,
  terminationTime: GtfsStopTime.parse("00:03:00"),
});

const SCHEDULE = GtfsScheduleData.fromTrips([TRIP_1, TRIP_2]);

const TRIP_1_DESCRIPTOR = {
  tripId: TRIP_1.gtfsTripId,
  routeId: TRIP_1.gtfsRouteId,
  startTime: TRIP_1.origination.departureTime,
  startDate: Temporal.PlainDate.from("2026-07-14"),
  scheduleRelationship: "SCHEDULED",
};

const STOP_MAPPING = new StopGtfsIdMapping(
  new Map([
    [1, StopGtfsIdCollection.withParentOnly(1, "stop-1")],
    [2, StopGtfsIdCollection.withParentOnly(2, "stop-2")],
    [3, StopGtfsIdCollection.withParentOnly(3, "stop-3")],
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
          trip: TRIP_1_DESCRIPTOR,
          stopTimeUpdate: [
            {
              stopSequence: TRIP_1.origination.gtfsStopSequence,
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

    expect(updatedTrip.scheduledTrip.gtfsTripId).toBe(TRIP_1.gtfsTripId);
    const parsedDepartureTime = updatedTrip.origination.realtimeDepartureTime;
    const expectedDepartureTime = TRIP_1.origination.departureTime
      .toInstant(TRIP_1_DESCRIPTOR.startDate, TIMEZONE)
      .add({ seconds: 120 });
    expect(parsedDepartureTime?.equals(expectedDepartureTime)).toBe(true);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(
      UnsupportedTripUpdateScheduleRelationshipError,
    );
  });

  it("tracks broken transfers for cancelled trips", () => {
    const errors: GtfsTripUpdateParsingError[] = [];
    const parser = new GtfsRealtimeDataParser(TIMEZONE, (e) => errors.push(e));

    const realtimeFeed = {
      tripUpdates: [
        {
          trip: { ...TRIP_1_DESCRIPTOR, scheduleRelationship: "CANCELED" },
        },
      ],
    };

    const transfers = [
      new GtfsEntireVehicleFormsServiceTransfer({
        fromTripId: TRIP_1.gtfsTripId,
        toTripId: TRIP_2.gtfsTripId,
      }),
    ];
    const schedule = SCHEDULE.withTransfers(transfers);
    const parsed = parser.parse(realtimeFeed, schedule, STOP_MAPPING);

    expect(errors).toHaveLength(0);
    expect(parsed.allTrips()).toHaveLength(1);
    expect(parsed.allTrips()[0]?.isCancelled).toBe(true);

    const sd = TRIP_1_DESCRIPTOR.startDate;
    const brokenTrip1 = parsed.getBrokenTransfersForTrip(TRIP_1.gtfsTripId, sd);
    const brokenTrip2 = parsed.getBrokenTransfersForTrip(TRIP_2.gtfsTripId, sd);

    expect(brokenTrip1).toHaveLength(1);
    expect(brokenTrip1[0]?.transfer.type).toBe("entire-vehicle-forms-service");
    expect(brokenTrip1[0]?.transfer.fromTripId).toBe(TRIP_1.gtfsTripId);
    expect(brokenTrip1[0]?.transfer.toTripId).toBe(TRIP_2.gtfsTripId);
    expect(brokenTrip1[0]?.serviceDay).toBe(TRIP_1_DESCRIPTOR.startDate);

    expect(brokenTrip2).toHaveLength(1);
    expect(brokenTrip2[0]?.transfer.type).toBe("entire-vehicle-forms-service");
    expect(brokenTrip2[0]?.transfer.fromTripId).toBe(TRIP_1.gtfsTripId);
    expect(brokenTrip2[0]?.transfer.toTripId).toBe(TRIP_2.gtfsTripId);
    expect(brokenTrip2[0]?.serviceDay).toBe(TRIP_1_DESCRIPTOR.startDate);
  });
});
