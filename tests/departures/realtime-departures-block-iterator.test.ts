import { describe, it, expect } from "vitest";
import { RealtimeDeparturesBlockIterator } from "../../../../src/gtfs/corequery-gtfs/departures/realtime-departures-block-iterator.js";
import { GtfsRealtimeData } from "../../../../src/gtfs/corequery-gtfs/data/gtfs-realtime-data.js";
import { GtfsUpdatedTrip } from "../../../../src/gtfs/corequery-gtfs/data/gtfs-updated-trip.js";
import { GtfsScheduledTrip } from "../../../../src/gtfs/corequery-gtfs/data/gtfs-scheduled-trip.js";
import { GtfsStopTime } from "../../../../src/gtfs/corequery-gtfs/data/gtfs-stop-time.js";

const MELBOURNE_TIMEZONE = "Australia/Melbourne";

describe("RealtimeDeparturesBlockIterator", () => {
  it("iterates through departures in order", () => {
    const rtData = realtimeData([
      trip({ id: "trip-1", scheduledTime: "12:00:00", delayMins: 5 }),
      trip({ id: "trip-2", scheduledTime: "12:02:00", delayMins: 0 }),
      trip({ id: "trip-3", scheduledTime: "14:00:00", delayMins: 2 }),
    ]);
    const iterator = RealtimeDeparturesBlockIterator.tryBuild(1, rtData);
    if (iterator == null) throw new Error("Iterator not built");

    const startTime = Temporal.Instant.from("2026-08-15T11:30:00+10:00");
    iterator.set(startTime, "forwards");

    expectResults(iterator, [
      { tripId: "trip-2", instant: "2026-08-15T12:02:00+10:00" },
      { tripId: "trip-1", instant: "2026-08-15T12:05:00+10:00" },
      { tripId: "trip-3", instant: "2026-08-15T14:02:00+10:00" },
    ]);
  });

  it("skips departures that occured before the set time", () => {
    const rtData = realtimeData([
      trip({ id: "trip-1", scheduledTime: "12:00:00", delayMins: 5 }),
      trip({ id: "trip-2", scheduledTime: "12:02:00", delayMins: 0 }),
      trip({ id: "trip-3", scheduledTime: "14:00:00", delayMins: 2 }),
    ]);
    const iterator = RealtimeDeparturesBlockIterator.tryBuild(1, rtData);
    if (iterator == null) throw new Error("Iterator not built");

    const startTime = Temporal.Instant.from("2026-08-15T12:05:00+10:00");
    iterator.set(startTime, "forwards");

    expectResults(iterator, [
      { tripId: "trip-1", instant: "2026-08-15T12:05:00+10:00" },
      { tripId: "trip-3", instant: "2026-08-15T14:02:00+10:00" },
    ]);
  });

  it("works correctly in reverse direction", () => {
    const rtData = realtimeData([
      trip({ id: "trip-1", scheduledTime: "12:00:00", delayMins: 5 }),
      trip({ id: "trip-2", scheduledTime: "12:02:00", delayMins: 0 }),
      trip({ id: "trip-3", scheduledTime: "14:00:00", delayMins: 2 }),
    ]);
    const iterator = RealtimeDeparturesBlockIterator.tryBuild(1, rtData);
    if (iterator == null) throw new Error("Iterator not built");

    const startTime = Temporal.Instant.from("2026-08-15T14:00:00+10:00");
    iterator.set(startTime, "backwards");

    expectResults(iterator, [
      { tripId: "trip-1", instant: "2026-08-15T12:05:00+10:00" },
      { tripId: "trip-2", instant: "2026-08-15T12:02:00+10:00" },
    ]);
  });

  // Users might like to see which trips have been cancelled, so just like
  // arrivals, the iterator presents them and allows filtering to occur down the
  // track if desired.
  it("iterates through cancelled trips too (doesn't omit them)", () => {
    const rtData = realtimeData([
      trip({ id: "trip-1", scheduledTime: "12:00:00", delayMins: 5 }),
      trip({ id: "trip-2", scheduledTime: "12:02:00", cancelled: true }),
      trip({ id: "trip-3", scheduledTime: "14:00:00", delayMins: 2 }),
    ]);
    const iterator = RealtimeDeparturesBlockIterator.tryBuild(1, rtData);
    if (iterator == null) throw new Error("Iterator not built");

    const startTime = Temporal.Instant.from("2026-08-15T11:30:00+10:00");
    iterator.set(startTime, "forwards");

    expectResults(iterator, [
      { tripId: "trip-2", instant: "2026-08-15T12:02:00+10:00" },
      { tripId: "trip-1", instant: "2026-08-15T12:05:00+10:00" },
      { tripId: "trip-3", instant: "2026-08-15T14:02:00+10:00" },
    ]);
  });

  it("does not rely on realtime data to enter sorted", () => {
    const rtData = realtimeData([
      trip({ id: "trip-1", scheduledTime: "12:00:00", delayMins: 5 }),
      trip({ id: "trip-3", scheduledTime: "14:00:00", delayMins: 2 }),
      trip({ id: "trip-2", scheduledTime: "12:02:00", delayMins: 0 }),
    ]);
    const iterator = RealtimeDeparturesBlockIterator.tryBuild(1, rtData);
    if (iterator == null) throw new Error("Iterator not built");

    const startTime = Temporal.Instant.from("2026-08-15T11:30:00+10:00");
    iterator.set(startTime, "forwards");

    expectResults(iterator, [
      { tripId: "trip-2", instant: "2026-08-15T12:02:00+10:00" },
      { tripId: "trip-1", instant: "2026-08-15T12:05:00+10:00" },
      { tripId: "trip-3", instant: "2026-08-15T14:02:00+10:00" },
    ]);
  });

  describe(".tryBuild", () => {
    it("returns null if no block can be built", () => {
      const rtData = GtfsRealtimeData.empty;
      const iterator = RealtimeDeparturesBlockIterator.tryBuild(1, rtData);
      expect(iterator).toBeNull();
    });
  });
});

function trip({
  id,
  scheduledTime,
  delayMins = 0,
  cancelled = false,
}: {
  id: string;
  scheduledTime: string;
  delayMins?: number;
  cancelled?: boolean;
}) {
  const scheduledTrip = GtfsScheduledTrip.simple({
    gtfsTripId: id,
    originStopId: 1,
    originationTime: GtfsStopTime.parse(scheduledTime),
    terminusStopId: 2,
    terminationTime: GtfsStopTime.parse(scheduledTime).plus({ minutes: 5 }),
  });

  const serviceDay = Temporal.PlainDate.from("2026-08-15");

  return new GtfsUpdatedTrip({
    scheduledTrip,
    serviceDay: serviceDay,
    movements: scheduledTrip.movements.map((m) =>
      m.asDelayedUpdatedTripMovement(serviceDay, MELBOURNE_TIMEZONE, delayMins),
    ),
    isCancelled: cancelled,
  });
}

function realtimeData(trips: GtfsUpdatedTrip[]) {
  return new GtfsRealtimeData(trips);
}

function expectResults(
  iterator: RealtimeDeparturesBlockIterator,
  expectedResults: { tripId: string; instant: string }[],
) {
  for (const expected of expectedResults) {
    const departure = iterator.take();

    expect(departure.trip.gtfsTripId).toEqual(expected.tripId);
    expect(departure.instant).toEqual(Temporal.Instant.from(expected.instant));
  }

  expect(iterator.peek()).toBeNull();
}
