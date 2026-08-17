import { itsOk } from "@dan-schel/js-utils";
import { it, describe, expect } from "vitest";
import { GtfsCalendar } from "../../src/data/gtfs-calendar.js";
import { GtfsRealtimeData } from "../../src/data/gtfs-realtime-data.js";
import { GtfsScheduleData } from "../../src/data/gtfs-schedule-data.js";
import { GtfsScheduledTrip } from "../../src/data/gtfs-scheduled-trip.js";
import { GtfsStopTime } from "../../src/data/gtfs-stop-time.js";
import { PlainDateRange } from "../../src/data/plain-date-range.js";
import { GtfsScheduledMovementsIndex } from "../../src/departures/gtfs-scheduled-movements-index.js";
import { ScheduledDeparturesBlocksBuilder } from "../../src/departures/scheduled-departures-blocks-builder.js";
import { ScheduledDeparturesIterator } from "../../src/departures/scheduled-departures-iterator.js";
import type { TimezoneData } from "../../src/config/timezone-data.js";

export const MELBOURNE_TIMEZONE_DATA: TimezoneData = {
  timezone: "Australia/Melbourne",
  minimumViableOffsetSeconds: 10 * 60 * 60,
  maximumViableOffsetSeconds: 11 * 60 * 60,
};

describe("ScheduledDeparturesIterator", () => {
  const EMPTY_RT_DATA = GtfsRealtimeData.empty;

  it("iterates through departures in order", () => {
    const builder = blockBuilder([
      trip({ tripId: "trip-1", departureTime: "04:00:00" }),
      trip({ tripId: "trip-2", departureTime: "05:00:00" }),
      trip({ tripId: "trip-3", departureTime: "06:00:00" }),
    ]);
    const iterator = new ScheduledDeparturesIterator(builder, EMPTY_RT_DATA);

    const startTime = Temporal.Instant.from("2026-08-13T05:30:00+10:00");
    iterator.set(startTime, "forwards");

    expectResults(iterator, [
      { id: "trip-3", time: "2026-08-13T06:00:00+10:00", svcDay: "2026-08-13" },
      { id: "trip-1", time: "2026-08-14T04:00:00+10:00", svcDay: "2026-08-14" },
      { id: "trip-2", time: "2026-08-14T05:00:00+10:00", svcDay: "2026-08-14" },
      { id: "trip-3", time: "2026-08-14T06:00:00+10:00", svcDay: "2026-08-14" },
      { id: "trip-1", time: "2026-08-15T04:00:00+10:00", svcDay: "2026-08-15" },
    ]);
  });

  it("interleaves departures from multiple blocks if needed", () => {
    const builder = blockBuilder([
      trip({ tripId: "trip-1", departureTime: "04:00:00" }),
      trip({ tripId: "trip-2", departureTime: "24:30:00" }),
      trip({ tripId: "trip-3", departureTime: "29:00:00" }),
    ]);
    const iterator = new ScheduledDeparturesIterator(builder, EMPTY_RT_DATA);

    const startTime = Temporal.Instant.from("2026-08-13T05:30:00+10:00");
    iterator.set(startTime, "forwards");

    expectResults(iterator, [
      { id: "trip-2", time: "2026-08-14T00:30:00+10:00", svcDay: "2026-08-13" },
      { id: "trip-1", time: "2026-08-14T04:00:00+10:00", svcDay: "2026-08-14" },
      { id: "trip-3", time: "2026-08-14T05:00:00+10:00", svcDay: "2026-08-13" },
      { id: "trip-2", time: "2026-08-15T00:30:00+10:00", svcDay: "2026-08-14" },
      { id: "trip-1", time: "2026-08-15T04:00:00+10:00", svcDay: "2026-08-15" },
      { id: "trip-3", time: "2026-08-15T05:00:00+10:00", svcDay: "2026-08-14" },
    ]);
  });

  it("just keeps going if the calendars are infinite", () => {
    const builder = blockBuilder([
      trip({ tripId: "trip-1", departureTime: "04:00:00" }),
      trip({ tripId: "trip-2", departureTime: "05:00:00" }),
      trip({ tripId: "trip-3", departureTime: "06:00:00" }),
    ]);
    const iterator = new ScheduledDeparturesIterator(builder, EMPTY_RT_DATA);

    const startTime = Temporal.Instant.from("2026-08-13T03:30:00+10:00");
    iterator.set(startTime, "forwards");

    for (let i = 0; i < 500; i++) {
      iterator.take();
    }

    expectResults(iterator, [
      // The 501st result.
      { id: "trip-3", time: "2027-01-26T06:00:00+11:00", svcDay: "2027-01-26" },
    ]);
  });

  it("stops if the calendars are finite", () => {
    const DAY_2026_08_13 = Temporal.PlainDate.from("2026-08-13");
    const DAY_2026_08_14 = Temporal.PlainDate.from("2026-08-14");
    const DAY_2026_08_15 = Temporal.PlainDate.from("2026-08-15");
    const cal1Range = new PlainDateRange(DAY_2026_08_13, DAY_2026_08_15);

    const cal1 = GtfsCalendar.everydayWithinRange("cal-1", cal1Range);
    const cal2 = GtfsCalendar.singleDay("cal-2", DAY_2026_08_13);
    const cal3 = GtfsCalendar.singleDay("cal-3", DAY_2026_08_14);

    const builder = blockBuilder([
      trip({ tripId: "trip-1", departureTime: "04:00:00", calendar: cal1 }),
      trip({ tripId: "trip-2", departureTime: "05:00:00", calendar: cal2 }),
      trip({ tripId: "trip-3", departureTime: "06:00:00", calendar: cal3 }),
    ]);

    const iterator = new ScheduledDeparturesIterator(builder, EMPTY_RT_DATA);

    const startTime = Temporal.Instant.from("2026-08-13T03:30:00+10:00");
    iterator.set(startTime, "forwards");

    expectResults(iterator, [
      { id: "trip-1", time: "2026-08-13T04:00:00+10:00", svcDay: "2026-08-13" },
      { id: "trip-2", time: "2026-08-13T05:00:00+10:00", svcDay: "2026-08-13" },
      { id: "trip-1", time: "2026-08-14T04:00:00+10:00", svcDay: "2026-08-14" },
      { id: "trip-3", time: "2026-08-14T06:00:00+10:00", svcDay: "2026-08-14" },
      { id: "trip-1", time: "2026-08-15T04:00:00+10:00", svcDay: "2026-08-15" },
    ]);

    expect(iterator.peek()).toBeNull();

    // Everything fits within 96 hours of the search starting, so 2 searches.
    expect(iterator.getStats().blockSearchesRan).toBe(2);

    // There's only 3 possible unique scheduled departures blocks.
    expect(iterator.getStats().subiteratorsCreated).toBe(3);
  });

  it("makes sure it's seen everything before stopping", () => {
    const DAY_2026_08_13 = Temporal.PlainDate.from("2026-08-13");
    const DAY_2026_12_13 = Temporal.PlainDate.from("2026-12-13");
    const cal1 = GtfsCalendar.singleDay("cal-1", DAY_2026_08_13);
    const cal2 = GtfsCalendar.singleDay("cal-2", DAY_2026_12_13);

    const builder = blockBuilder([
      trip({ tripId: "trip-1", departureTime: "04:00:00", calendar: cal1 }),
      trip({ tripId: "trip-2", departureTime: "05:00:00", calendar: cal2 }),
    ]);

    const iterator = new ScheduledDeparturesIterator(builder, EMPTY_RT_DATA);

    const startTime = Temporal.Instant.from("2026-08-13T03:30:00+10:00");
    iterator.set(startTime, "forwards");

    expectResults(iterator, [
      { id: "trip-1", time: "2026-08-13T04:00:00+10:00", svcDay: "2026-08-13" },
      { id: "trip-2", time: "2026-12-13T05:00:00+11:00", svcDay: "2026-12-13" },
    ]);

    expect(iterator.peek()).toBeNull();

    // 4 months ~= 120 days ~= 60 searches.
    expect(iterator.getStats().blockSearchesRan).toBeGreaterThan(58);
    expect(iterator.getStats().blockSearchesRan).toBeLessThan(62);

    // We still create scheduled departures blocks for every day inbetween, they
    // just all get skipped through, so intuitively you'd think ~120... BUT
    // because the search range optimisation moves the first search range
    // forward to the time of the first movement, we end up querying at 4:00am
    // every time, and then as that's right on the boundary, we get 3 blocks
    // each search, so it's actually ~180. I won't assume that for this test
    // though, so I'll allow down to 110.
    expect(iterator.getStats().subiteratorsCreated).toBeGreaterThan(110);
    expect(iterator.getStats().subiteratorsCreated).toBeLessThan(190);
  });

  it("works in reverse", () => {
    const builder = blockBuilder([
      trip({ tripId: "trip-1", departureTime: "04:00:00" }),
      trip({ tripId: "trip-2", departureTime: "05:00:00" }),
      trip({ tripId: "trip-3", departureTime: "06:00:00" }),
    ]);
    const iterator = new ScheduledDeparturesIterator(builder, EMPTY_RT_DATA);

    const startTime = Temporal.Instant.from("2026-08-13T05:30:00+10:00");
    iterator.set(startTime, "backwards");

    expectResults(iterator, [
      { id: "trip-2", time: "2026-08-13T05:00:00+10:00", svcDay: "2026-08-13" },
      { id: "trip-1", time: "2026-08-13T04:00:00+10:00", svcDay: "2026-08-13" },
      { id: "trip-3", time: "2026-08-12T06:00:00+10:00", svcDay: "2026-08-12" },
      { id: "trip-2", time: "2026-08-12T05:00:00+10:00", svcDay: "2026-08-12" },
      { id: "trip-1", time: "2026-08-12T04:00:00+10:00", svcDay: "2026-08-12" },
    ]);
  });

  it("doesn't duplicate trips when blocks begin/end at the next search query boundary", () => {
    const builder = blockBuilder([
      trip({ tripId: "trip-1", departureTime: "04:00:00" }),
      trip({ tripId: "trip-2", departureTime: "05:00:00" }),
      trip({ tripId: "trip-3", departureTime: "06:00:00" }),
    ]);
    const iterator = new ScheduledDeparturesIterator(builder, EMPTY_RT_DATA);

    const startTime = Temporal.Instant.from("2026-08-13T05:00:00+10:00");
    iterator.set(startTime, "forwards");

    expectResults(iterator, [
      { id: "trip-2", time: "2026-08-13T05:00:00+10:00", svcDay: "2026-08-13" },
      { id: "trip-3", time: "2026-08-13T06:00:00+10:00", svcDay: "2026-08-13" },
      { id: "trip-1", time: "2026-08-14T04:00:00+10:00", svcDay: "2026-08-14" },
      { id: "trip-2", time: "2026-08-14T05:00:00+10:00", svcDay: "2026-08-14" },
      { id: "trip-3", time: "2026-08-14T06:00:00+10:00", svcDay: "2026-08-14" },
      { id: "trip-1", time: "2026-08-15T04:00:00+10:00", svcDay: "2026-08-15" },
    ]);

    expect(iterator.getStats().blockSearchesRan).toBe(1);

    // Because the result AFTER this one would be outside the current search,
    // after taking this one, a new block search will run.
    expectResults(iterator, [
      { id: "trip-2", time: "2026-08-15T05:00:00+10:00", svcDay: "2026-08-15" },
    ]);

    expect(iterator.getStats().blockSearchesRan).toBe(2);

    // After the new search we don't want to see that 5:00am duplicated.
    expectResults(iterator, [
      { id: "trip-3", time: "2026-08-15T06:00:00+10:00", svcDay: "2026-08-15" },
    ]);
  });
});

function trip({
  tripId,
  departureTime,
  calendar = GtfsCalendar.everyday("cal-1"),
}: {
  tripId: string;
  departureTime: string;
  calendar?: GtfsCalendar;
}) {
  return GtfsScheduledTrip.simple({
    gtfsTripId: tripId,
    originStopId: 1,
    originationTime: GtfsStopTime.parse(departureTime),
    terminusStopId: 2,
    terminationTime: GtfsStopTime.parse(departureTime).plus({ minutes: 5 }),
  }).with({ calendar });
}

function blockBuilder(trips: GtfsScheduledTrip[]) {
  const schedule = GtfsScheduleData.fromTrips(trips);
  const index = GtfsScheduledMovementsIndex.build(schedule);
  const tz = MELBOURNE_TIMEZONE_DATA;
  const builder = ScheduledDeparturesBlocksBuilder.tryBuild(1, index, tz);
  return itsOk(builder);
}

function expectResults(
  iterator: ScheduledDeparturesIterator,
  expectedResults: { id: string; time: string; svcDay: string }[],
) {
  for (const expected of expectedResults) {
    const departure = iterator.take();

    expect(departure.trip.gtfsTripId).toEqual(expected.id);
    expect(departure.instant).toEqual(Temporal.Instant.from(expected.time));
    expect(departure.serviceDay).toEqual(
      Temporal.PlainDate.from(expected.svcDay),
    );
  }
}
