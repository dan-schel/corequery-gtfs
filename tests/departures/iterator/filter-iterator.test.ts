import { it, describe, expect } from "vitest";
import { GtfsScheduledTrip } from "../../../src/data/gtfs-scheduled-trip.js";
import { GtfsStopTime } from "../../../src/data/gtfs-stop-time.js";
import {
  DeparturesIteratorResult,
  DeparturesIterator,
} from "../../../src/departures/iterator/departures-iterator.js";
import { FilterIterator } from "../../../src/departures/iterator/filter-iterator.js";
import type { DeparturesIterationDirection } from "../../../src/corequery-types.js";

describe("FilterIterator", () => {
  it("filters departures based on the predicate", () => {
    const iterator = new DummyIterator([
      departure({ instant: "2026-09-12T00:00:00Z", tripId: "A" }),
      departure({ instant: "2026-09-12T00:04:00Z", tripId: "B" }),
      departure({ instant: "2026-09-12T00:06:00Z", tripId: "C" }),
    ]);

    const filterIterator = new FilterIterator(
      iterator,
      (result) => result.trip.gtfsTripId !== "B",
    );
    filterIterator.set(
      Temporal.Instant.from("2026-09-12T00:00:00Z"),
      "forwards",
    );

    const result1 = filterIterator.take();
    const result2 = filterIterator.take();

    expect(filterIterator.peek()).toBeNull();
    expect(() => filterIterator.take()).toThrow();

    expect(result1.trip.gtfsTripId).toBe("A");
    expect(result2.trip.gtfsTripId).toBe("C");
  });

  it("behaves correctly when the first departure is skipped", () => {
    const iterator = new DummyIterator([
      departure({ instant: "2026-09-12T00:00:00Z", tripId: "A" }),
      departure({ instant: "2026-09-12T00:04:00Z", tripId: "B" }),
      departure({ instant: "2026-09-12T00:06:00Z", tripId: "C" }),
    ]);

    const filterIterator = new FilterIterator(
      iterator,
      (result) => result.trip.gtfsTripId !== "A",
    );
    filterIterator.set(
      Temporal.Instant.from("2026-09-12T00:00:00Z"),
      "forwards",
    );

    const result1 = filterIterator.take();
    const result2 = filterIterator.take();

    expect(filterIterator.peek()).toBeNull();
    expect(() => filterIterator.take()).toThrow();

    expect(result1.trip.gtfsTripId).toBe("B");
    expect(result2.trip.gtfsTripId).toBe("C");
  });

  it("behaves correctly when the last departure is skipped", () => {
    const iterator = new DummyIterator([
      departure({ instant: "2026-09-12T00:00:00Z", tripId: "A" }),
      departure({ instant: "2026-09-12T00:04:00Z", tripId: "B" }),
      departure({ instant: "2026-09-12T00:06:00Z", tripId: "C" }),
    ]);

    const filterIterator = new FilterIterator(
      iterator,
      (result) => result.trip.gtfsTripId !== "C",
    );
    filterIterator.set(
      Temporal.Instant.from("2026-09-12T00:00:00Z"),
      "forwards",
    );

    const result1 = filterIterator.take();
    const result2 = filterIterator.take();

    expect(filterIterator.peek()).toBeNull();
    expect(() => filterIterator.take()).toThrow();

    expect(result1.trip.gtfsTripId).toBe("A");
    expect(result2.trip.gtfsTripId).toBe("B");
  });
});

function departure({ instant, tripId }: { instant: string; tripId: string }) {
  const instantObj = Temporal.Instant.from(instant);
  const startOfDayUtc = instantObj.toZonedDateTimeISO("UTC").startOfDay();
  const serviceDay = startOfDayUtc.toPlainDate();
  const secOfDay = instantObj.since(startOfDayUtc.toInstant()).total("seconds");
  const stopTime = GtfsStopTime.fromSecondsSinceMidnight(secOfDay);

  const trip = GtfsScheduledTrip.simple({
    gtfsTripId: tripId,
    originStopId: 1,
    originationTime: stopTime,
    terminusStopId: 2,
    terminationTime: stopTime.plus({ minutes: 5 }),
  });

  return new DeparturesIteratorResult(
    trip,
    serviceDay,
    instantObj,
    trip.origination,
    0,
  );
}

class DummyIterator extends DeparturesIterator {
  constructor(readonly items: DeparturesIteratorResult[]) {
    super();
  }

  override set(
    _instant: Temporal.Instant,
    _direction: DeparturesIterationDirection,
  ): void {}

  override peek(): DeparturesIteratorResult | null {
    return this.items[0] ?? null;
  }

  override take(): DeparturesIteratorResult {
    const result = this.items.shift();
    if (result == null) throw new Error();
    return result;
  }
}
