import { itsOk } from "@dan-schel/js-utils";
import { it, describe, expect } from "vitest";
import { GtfsCalendar } from "../../src/data/gtfs-calendar.js";
import { GtfsRealtimeData } from "../../src/data/gtfs-realtime-data.js";
import { GtfsScheduleData } from "../../src/data/gtfs-schedule-data.js";
import { GtfsScheduledTrip } from "../../src/data/gtfs-scheduled-trip.js";
import { GtfsStopTime } from "../../src/data/gtfs-stop-time.js";
import { GtfsUpdatedTrip } from "../../src/data/gtfs-updated-trip.js";
import {
  GtfsScheduledMovementsIndex,
  type GtfsScheduledMovementsIndexEntry,
} from "../../src/departures/gtfs-scheduled-movements-index.js";
import { ScheduledDeparturesBlockIterator } from "../../src/departures/scheduled-departures-block-iterator.js";
import { ScheduledDeparturesBlock } from "../../src/departures/scheduled-departures-block.js";

describe("ScheduledDeparturesBlockIterator", () => {
  const MOVEMENTS = [
    movement({ tripId: "trip-1", departureTime: "04:00:00" }),
    movement({ tripId: "trip-2", departureTime: "05:00:00" }),
    movement({ tripId: "trip-3", departureTime: "06:00:00" }),
  ];
  const SERVICE_DAY = Temporal.PlainDate.from("2026-08-13");
  const NEXT_DAY = Temporal.PlainDate.from("2026-08-14");
  const TZ = "Australia/Melbourne";
  const BLOCK = ScheduledDeparturesBlock.build(MOVEMENTS, SERVICE_DAY, TZ);
  const EMPTY_RT_DATA = GtfsRealtimeData.empty;

  it("iterates through departures in order", () => {
    const iterator = new ScheduledDeparturesBlockIterator(BLOCK, EMPTY_RT_DATA);

    const startTime = Temporal.Instant.from("2026-08-13T03:30:00+10:00");
    iterator.set(startTime, "forwards");

    expectResults(iterator, [
      { tripId: "trip-1", instant: "2026-08-13T04:00:00+10:00" },
      { tripId: "trip-2", instant: "2026-08-13T05:00:00+10:00" },
      { tripId: "trip-3", instant: "2026-08-13T06:00:00+10:00" },
    ]);
  });

  it("skips departures that occured before the set time", () => {
    const iterator = new ScheduledDeparturesBlockIterator(BLOCK, EMPTY_RT_DATA);

    const startTime = Temporal.Instant.from("2026-08-13T04:30:00+10:00");
    iterator.set(startTime, "forwards");

    expectResults(iterator, [
      { tripId: "trip-2", instant: "2026-08-13T05:00:00+10:00" },
      { tripId: "trip-3", instant: "2026-08-13T06:00:00+10:00" },
    ]);
  });

  it("works correctly in reverse direction", () => {
    const iterator = new ScheduledDeparturesBlockIterator(BLOCK, EMPTY_RT_DATA);

    const startTime = Temporal.Instant.from("2026-08-13T05:30:00+10:00");
    iterator.set(startTime, "backwards");

    expectResults(iterator, [
      { tripId: "trip-2", instant: "2026-08-13T05:00:00+10:00" },
      { tripId: "trip-1", instant: "2026-08-13T04:00:00+10:00" },
    ]);
  });

  it("skips departures that don't run today", () => {
    const movements = [
      movement({ tripId: "trip-1", departureTime: "04:00:00" }),
      movement({
        tripId: "trip-2",
        departureTime: "05:00:00",
        calendar: GtfsCalendar.singleDay("cal-2", NEXT_DAY),
      }),
      movement({ tripId: "trip-3", departureTime: "06:00:00" }),
    ];
    const block = ScheduledDeparturesBlock.build(movements, SERVICE_DAY, TZ);
    const iterator = new ScheduledDeparturesBlockIterator(block, EMPTY_RT_DATA);

    const startTime = Temporal.Instant.from("2026-08-13T03:30:00+10:00");
    iterator.set(startTime, "forwards");

    expectResults(iterator, [
      { tripId: "trip-1", instant: "2026-08-13T04:00:00+10:00" },
      { tripId: "trip-3", instant: "2026-08-13T06:00:00+10:00" },
    ]);
  });

  it("skips departures that have realtime data", () => {
    const rtData = GtfsRealtimeData.fromTrips([
      GtfsUpdatedTrip.unmodified(itsOk(MOVEMENTS[1]).trip, SERVICE_DAY, TZ),
    ]);
    const iterator = new ScheduledDeparturesBlockIterator(BLOCK, rtData);

    const startTime = Temporal.Instant.from("2026-08-13T03:30:00+10:00");
    iterator.set(startTime, "forwards");

    expectResults(iterator, [
      { tripId: "trip-1", instant: "2026-08-13T04:00:00+10:00" },
      { tripId: "trip-3", instant: "2026-08-13T06:00:00+10:00" },
    ]);
  });

  it("only skips departures if the realtime data is for the same service day", () => {
    const rtData = GtfsRealtimeData.fromTrips([
      GtfsUpdatedTrip.unmodified(itsOk(MOVEMENTS[1]).trip, NEXT_DAY, TZ),
    ]);
    const iterator = new ScheduledDeparturesBlockIterator(BLOCK, rtData);

    const startTime = Temporal.Instant.from("2026-08-13T03:30:00+10:00");
    iterator.set(startTime, "forwards");

    expectResults(iterator, [
      { tripId: "trip-1", instant: "2026-08-13T04:00:00+10:00" },
      { tripId: "trip-2", instant: "2026-08-13T05:00:00+10:00" },
      { tripId: "trip-3", instant: "2026-08-13T06:00:00+10:00" },
    ]);
  });

  it("receives movements from the index already sorted by departure time", () => {
    const schedule = GtfsScheduleData.fromTrips([
      itsOk(MOVEMENTS[2]).trip,
      itsOk(MOVEMENTS[0]).trip,
      itsOk(MOVEMENTS[1]).trip,
    ]);
    const index = GtfsScheduledMovementsIndex.build(schedule);
    const block = ScheduledDeparturesBlock.build(
      index.getMovementsForStop(1),
      SERVICE_DAY,
      TZ,
    );
    const iterator = new ScheduledDeparturesBlockIterator(block, EMPTY_RT_DATA);

    const startTime = Temporal.Instant.from("2026-08-13T03:30:00+10:00");
    iterator.set(startTime, "forwards");

    expectResults(iterator, [
      { tripId: "trip-1", instant: "2026-08-13T04:00:00+10:00" },
      { tripId: "trip-2", instant: "2026-08-13T05:00:00+10:00" },
      { tripId: "trip-3", instant: "2026-08-13T06:00:00+10:00" },
    ]);
  });
});

function movement({
  tripId,
  departureTime,
  calendar = GtfsCalendar.everyday("cal-1"),
}: {
  tripId: string;
  departureTime: string;
  calendar?: GtfsCalendar;
}): GtfsScheduledMovementsIndexEntry {
  const time = GtfsStopTime.parse(departureTime);

  const trip = GtfsScheduledTrip.simple({
    gtfsTripId: tripId,
    originStopId: 1,
    originationTime: time,
    terminusStopId: 2,
    terminationTime: time.plus({ minutes: 5 }),
  }).with({ calendar });

  return { trip, time, movement: trip.origination, movementIndex: 0 };
}

function expectResults(
  iterator: ScheduledDeparturesBlockIterator,
  expectedResults: { tripId: string; instant: string }[],
) {
  for (const expected of expectedResults) {
    const departure = iterator.take();

    expect(departure.trip.gtfsTripId).toEqual(expected.tripId);
    expect(departure.instant).toEqual(Temporal.Instant.from(expected.instant));
  }

  expect(iterator.peek()).toBeNull();
}
