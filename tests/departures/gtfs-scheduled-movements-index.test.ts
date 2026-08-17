import { it, describe, expect } from "vitest";
import { GtfsStopTime } from "../../../../src/gtfs/corequery-gtfs/data/gtfs-stop-time.js";
import { GtfsScheduledTrip } from "../../../../src/gtfs/corequery-gtfs/data/gtfs-scheduled-trip.js";
import { GtfsCalendar } from "../../../../src/gtfs/corequery-gtfs/data/gtfs-calendar.js";
import { GtfsScheduledMovementsIndex } from "../../../../src/gtfs/corequery-gtfs/departures/gtfs-scheduled-movements-index.js";
import { GtfsScheduleData } from "../../../../src/gtfs/corequery-gtfs/data/gtfs-schedule-data.js";
import { PlainDateRange } from "../../../../src/gtfs/corequery-gtfs/data/plain-date-range.js";

describe("GtfsScheduledMovementsIndex", () => {
  describe("#getMovementsForStop", () => {
    const trips = [
      createTrip({
        tripId: "trip-1",
        originationTime: GtfsStopTime.parse("05:00:00"),
      }),
      createTrip({
        tripId: "trip-2",
        originationTime: GtfsStopTime.parse("06:00:00"),
      }),
      createTrip({
        tripId: "trip-3",
        originationTime: GtfsStopTime.parse("04:00:00"),
      }),
    ];
    const schedule = GtfsScheduleData.fromTrips(trips);
    const index = GtfsScheduledMovementsIndex.build(schedule);

    it("returns a sorted list of the movements for the given stop", () => {
      const result = index.getMovementsForStop(1);

      expect(result.map((entry) => entry.trip.gtfsTripId)).toEqual([
        "trip-3",
        "trip-1",
        "trip-2",
      ]);
    });

    it("returns an empty array if there are no movements for the given stop", () => {
      const result = index.getMovementsForStop(999);
      expect(result).toEqual([]);
    });
  });

  describe("#getRangeEncompassingAllCalendarsForStop", () => {
    it("returns the range encompassing all calendars for the given stop", () => {
      const trips = [
        createTrip({
          tripId: "trip-1",
          calendar: createCalendar("cal-1", "2026-01-01", "2026-01-31"),
        }),
        createTrip({
          tripId: "trip-2",
          calendar: createCalendar("cal-2", "2026-02-01", "2026-02-28"),
        }),
      ];
      const schedule = GtfsScheduleData.fromTrips(trips);
      const index = GtfsScheduledMovementsIndex.build(schedule);

      const result = index.getRangeEncompassingAllCalendarsForStop(1);
      expect(result).not.toBeNull();
      expect(result?.start?.toString()).toEqual("2026-01-01");
      expect(result?.end?.toString()).toEqual("2026-02-28");
    });

    it("returns null if there are no movements for the given stop", () => {
      const trips = [
        createTrip({
          tripId: "trip-1",
          calendar: createCalendar("cal-1", "2026-01-01", "2026-01-31"),
        }),
      ];
      const schedule = GtfsScheduleData.fromTrips(trips);
      const index = GtfsScheduledMovementsIndex.build(schedule);

      const result = index.getRangeEncompassingAllCalendarsForStop(999);
      expect(result).toBeNull();
    });

    it("handles infinite ranges", () => {
      const trips = [
        createTrip({
          tripId: "trip-1",
          calendar: createCalendar("cal-1", null, "2026-01-31"),
        }),
        createTrip({
          tripId: "trip-2",
          calendar: createCalendar("cal-2", "2026-03-01", null),
        }),
      ];
      const schedule = GtfsScheduleData.fromTrips(trips);
      const index = GtfsScheduledMovementsIndex.build(schedule);

      const result = index.getRangeEncompassingAllCalendarsForStop(1);
      expect(result).not.toBeNull();
      expect(result?.start).toBeNull();
      expect(result?.end).toBeNull();
    });

    it("doesn't include calendars for trips from other stops", () => {
      const trips = [
        createTrip({
          tripId: "trip-1",
          originStopId: 1,
          calendar: createCalendar("cal-1", "2026-01-01", "2026-01-31"),
        }),
        createTrip({
          tripId: "trip-2",
          originStopId: 4,
          calendar: createCalendar("cal-2", "2026-02-01", "2026-02-28"),
        }),
      ];
      const schedule = GtfsScheduleData.fromTrips(trips);
      const index = GtfsScheduledMovementsIndex.build(schedule);

      const result = index.getRangeEncompassingAllCalendarsForStop(1);
      expect(result).not.toBeNull();
      expect(result?.start?.toString()).toEqual("2026-01-01");
      expect(result?.end?.toString()).toEqual("2026-01-31");
    });
  });
});

function createTrip({
  tripId,
  originationTime = GtfsStopTime.parse("05:00:00"),
  originStopId = 1,
  calendar = GtfsCalendar.everyday("cal-1"),
}: {
  tripId: string;
  originationTime?: GtfsStopTime;
  originStopId?: number;
  calendar?: GtfsCalendar;
}) {
  return GtfsScheduledTrip.simple({
    gtfsTripId: tripId,
    originStopId: originStopId,
    originationTime: originationTime,
    terminusStopId: 2,
    terminationTime: originationTime.plus({ minutes: 5 }),
  }).with({
    calendar: calendar,
  });
}

function createCalendar(
  id: string,
  starting: string | null,
  ending: string | null,
) {
  const range = new PlainDateRange(
    starting != null ? Temporal.PlainDate.from(starting) : null,
    ending != null ? Temporal.PlainDate.from(ending) : null,
  );
  return GtfsCalendar.everydayWithinRange(id, range);
}
