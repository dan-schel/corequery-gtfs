import { describe, expect, it } from "vitest";
import { GtfsRealtimeData } from "../../src/data/gtfs-realtime-data.js";
import { GtfsStopTime } from "../../src/data/gtfs-stop-time.js";
import { GtfsScheduledTrip } from "../../src/data/trip/scheduled/gtfs-scheduled-trip.js";
import { GtfsUpdatedTrip } from "../../src/data/trip/updated/gtfs-updated-trip.js";

describe("GtfsRealtimeData", () => {
  describe("#getTrip", () => {
    it("retrieves separate realtime updates for the same trip on different service days", () => {
      const scheduledTrip = GtfsScheduledTrip.simple({
        gtfsTripId: "trip-1",
        originStopId: 1,
        originationTime: GtfsStopTime.parse("23:00:00"),
        terminusStopId: 2,
        terminationTime: GtfsStopTime.parse("25:00:00"),
      });

      const OCT_3 = Temporal.PlainDate.from("2026-10-03");
      const OCT_4 = Temporal.PlainDate.from("2026-10-04");
      const OCT_5 = Temporal.PlainDate.from("2026-10-05");

      const firstUpdate = GtfsUpdatedTrip.unmodified(
        scheduledTrip,
        OCT_3,
        "Australia/Melbourne",
      );

      const secondUpdate = GtfsUpdatedTrip.unmodified(
        scheduledTrip,
        OCT_4,
        "Australia/Melbourne",
      ).with({ isCancelled: true });

      const data = GtfsRealtimeData.fromTrips([firstUpdate, secondUpdate]);

      expect(data.getTrip("trip-1", OCT_3)).toBe(firstUpdate);
      expect(data.getTrip("trip-1", OCT_4)).toBe(secondUpdate);
      expect(data.getTrip("trip-1", OCT_5)).toBeNull();

      expect(data.getTrip("unknown-trip", OCT_3)).toBeNull();
    });
  });
});
