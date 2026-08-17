import { describe, expect, it } from "vitest";
import { LineGtfsIdMapping } from "../../../src/data/ids/line-gtfs-id-mapping.js";
import { LineGtfsIdCollection } from "../../../src/data/ids/line-gtfs-id-collection.js";
import { GtfsStopTime } from "../../../src/data/gtfs-stop-time.js";
import { StopGtfsIdCollection } from "../../../src/data/ids/stop-gtfs-id-collection.js";
import { StopGtfsIdMapping } from "../../../src/data/ids/stop-gtfs-id-mapping.js";
import { BonusLinesMapping } from "../../../src/data/route/bonus-lines-mapping.js";
import { LineRoutesMapping } from "../../../src/data/route/line-routes-mapping.js";
import { GtfsScheduleParser } from "../../../src/parser/schedule/gtfs-schedule-parser.js";

describe("GtfsScheduleParser", () => {
  const LINE_ID = 1;
  const LINE_GTFS_ID = "line-1";

  const LINE_GTFS_ID_MAPPING = new LineGtfsIdMapping(
    new Map([
      [LINE_ID, LineGtfsIdCollection.withParentOnly(LINE_ID, LINE_GTFS_ID)],
    ]),
  );
  const STOP_GTFS_ID_MAPPING = new StopGtfsIdMapping(
    new Map([
      [1, StopGtfsIdCollection.withParentOnly(1, "1")],
      [2, StopGtfsIdCollection.withParentOnly(2, "2")],
    ]),
  );

  const LINE_ROUTES_MAPPING = LineRoutesMapping.build({
    [LINE_ID]: [
      {
        color: "blue",
        serviceTags: [7],
        stops: [
          { stopId: 1, collapseInStoppingPatterns: false },
          { stopId: 2, collapseInStoppingPatterns: false },
        ],
      },
    ],
  });

  const BONUS_LINES_MAPPING = new BonusLinesMapping(new Map());

  const CALENDAR = {
    service_id: "svc",
    monday: true,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
    start_date: Temporal.PlainDate.from({ year: 2026, month: 6, day: 15 }),
    end_date: Temporal.PlainDate.from({ year: 2026, month: 6, day: 21 }),
  };

  const TRIP = {
    trip_id: "trip-1",
    route_id: LINE_GTFS_ID,
    service_id: CALENDAR.service_id,
  };
  const STOP_TIME_1 = {
    trip_id: "trip-1",
    arrival_time: GtfsStopTime.parse("00:00:00"),
    departure_time: GtfsStopTime.parse("00:00:00"),
    stop_id: "1",
    stop_sequence: 1,
    pickup_type: 0,
    drop_off_type: 0,
  };
  const STOP_TIME_2 = {
    trip_id: "trip-1",
    arrival_time: GtfsStopTime.parse("00:10:00"),
    departure_time: GtfsStopTime.parse("00:10:00"),
    stop_id: "2",
    stop_sequence: 2,
    pickup_type: 0,
    drop_off_type: 0,
  };

  it("builds a schedule from parsed calendars and trips", () => {
    const parser = new GtfsScheduleParser(
      LINE_ROUTES_MAPPING,
      BONUS_LINES_MAPPING,
      () => {},
    );

    const schedule = parser.parse(
      {
        calendar: [CALENDAR],
        calendarDates: [],
        routes: [],
        stops: [],
        trips: [TRIP],
        stopTimes: [STOP_TIME_1, STOP_TIME_2],
        transfers: [],
      },
      LINE_GTFS_ID_MAPPING,
      STOP_GTFS_ID_MAPPING,
    );

    const trips = schedule.allTrips();
    expect(trips).toHaveLength(1);

    const trip = trips[0];
    if (trip == null) throw new Error("Expected one trip.");

    expect(trip.gtfsTripId).toBe("trip-1");
    expect(trip.color).toBe("blue");
    expect(trip.serviceTags).toEqual([7]);
    expect(trip.movements.map((stop) => stop.stopId)).toEqual([1, 2]);
    expect(trip.calendar.gtfsCalendarId).toBe("svc");
    expect(trip.calendar.monday).toBe(true);
  });
});
