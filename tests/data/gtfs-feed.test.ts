import { describe, expect, it } from "vitest";
import type { TimezoneData } from "../../src/config/timezone-data.js";
import { GtfsCalendar } from "../../src/data/gtfs-calendar.js";
import { GtfsFeed } from "../../src/data/gtfs-feed.js";
import { GtfsRealtimeData } from "../../src/data/gtfs-realtime-data.js";
import { GtfsScheduleData } from "../../src/data/gtfs-schedule-data.js";
import { GtfsScheduledTrip } from "../../src/data/trip/scheduled/gtfs-scheduled-trip.js";
import { GtfsStopTime } from "../../src/data/gtfs-stop-time.js";
import { GtfsEntireVehicleFormsServiceTransfer } from "../../src/data/gtfs-transfer.js";

const TIMEZONE_DATA: TimezoneData = {
  timezone: "UTC",
  minimumViableOffsetSeconds: 0,
  maximumViableOffsetSeconds: 0,
};

describe("GtfsFeed", () => {
  describe("#getUpheldTransfersForTrip", () => {
    const transfer = new GtfsEntireVehicleFormsServiceTransfer({
      fromTripId: "1",
      toTripId: "2",
    });
    const trip1 = GtfsScheduledTrip.simple({
      gtfsTripId: "1",
      originStopId: 1,
      originationTime: GtfsStopTime.parse("00:01:00"),
      terminusStopId: 2,
      terminationTime: GtfsStopTime.parse("00:02:00"),
    });
    const trip2 = GtfsScheduledTrip.simple({
      gtfsTripId: "2",
      originStopId: 2,
      originationTime: GtfsStopTime.parse("00:02:00"),
      terminusStopId: 3,
      terminationTime: GtfsStopTime.parse("00:03:00"),
    });

    it("returns scheduled transfers involving that trip", () => {
      const serviceDay = Temporal.PlainDate.from("2026-09-12");

      const feed = GtfsFeed.fromNewScheduleData(
        GtfsScheduleData.fromTrips([trip1, trip2]).withTransfers([transfer]),
        GtfsRealtimeData.empty,
        TIMEZONE_DATA,
      );
      const upheldTransfers = feed.getUpheldTransfersForTrip("1", serviceDay);

      expect(upheldTransfers).toEqual([transfer]);
    });

    it("omits scheduled transfers involving trips which aren't running that day", () => {
      const serviceDay = Temporal.PlainDate.from("2026-09-12");

      const newTrip2 = trip2.with({
        calendar: GtfsCalendar.singleDay("cal-2", serviceDay.add({ days: 1 })),
      });

      const feed = GtfsFeed.fromNewScheduleData(
        GtfsScheduleData.fromTrips([trip1, newTrip2]).withTransfers([transfer]),
        GtfsRealtimeData.empty,
        TIMEZONE_DATA,
      );
      const upheldTransfers = feed.getUpheldTransfersForTrip("1", serviceDay);

      expect(upheldTransfers).toHaveLength(0);
    });
  });
});
