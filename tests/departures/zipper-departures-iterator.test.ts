import { it, describe, expect } from "vitest";
import { GtfsScheduledTrip } from "../../src/data/gtfs-scheduled-trip.js";
import { GtfsStopTime } from "../../src/data/gtfs-stop-time.js";
import {
  DeparturesIteratorResult,
  DeparturesIterator,
} from "../../src/departures/departures-iterator.js";
import { ZipperDeparturesIterator } from "../../src/departures/zipper-departures-iterator.js";
import type { DeparturesIterationDirection } from "../../src/corequery-types.js";

describe("ZipperDeparturesIterator", () => {
  it("returns departures in order of instant", () => {
    const iterators = [
      new DummyIterator([
        departure({ instant: "2026-01-01T00:00:00Z", tripId: "A" }),
        departure({ instant: "2026-01-01T00:04:00Z", tripId: "B" }),
      ]),
      new DummyIterator([
        departure({ instant: "2026-01-01T00:01:00Z", tripId: "C" }),
        departure({ instant: "2026-01-01T00:02:00Z", tripId: "D" }),
      ]),
    ];
    const zipperIterator = new ZipperDeparturesIterator(iterators, null);

    zipperIterator.set(
      Temporal.Instant.from("2026-01-01T00:00:00Z"),
      "forwards",
    );
    const result1 = zipperIterator.take();
    const result2 = zipperIterator.take();
    const result3 = zipperIterator.take();
    const result4 = zipperIterator.take();

    expect(zipperIterator.peek()).toBeNull();
    expect(() => zipperIterator.take()).toThrow();

    expect(result1.trip.gtfsTripId).toEqual("A");
    expect(result2.trip.gtfsTripId).toEqual("C");
    expect(result3.trip.gtfsTripId).toEqual("D");
    expect(result4.trip.gtfsTripId).toEqual("B");
  });

  it("works correctly if no feeds given", () => {
    const zipperIterator = new ZipperDeparturesIterator([], null);

    zipperIterator.set(
      Temporal.Instant.from("2026-01-01T00:00:00Z"),
      "forwards",
    );

    expect(zipperIterator.peek()).toBeNull();
    expect(() => zipperIterator.take()).toThrow();
  });

  it("works correctly if all iterators are empty", () => {
    const iterators = [new DummyIterator([]), new DummyIterator([])];

    const zipperIterator = new ZipperDeparturesIterator(iterators, null);

    zipperIterator.set(
      Temporal.Instant.from("2026-01-01T00:00:00Z"),
      "forwards",
    );

    expect(zipperIterator.peek()).toBeNull();
    expect(() => zipperIterator.take()).toThrow();
  });

  it("doesn't return anything beyond the iteration limit", () => {
    const iterators = [
      new DummyIterator([
        departure({ instant: "2026-01-03T17:00:00Z", tripId: "A" }),
        departure({ instant: "2026-01-03T17:04:00Z", tripId: "B" }),
      ]),
      new DummyIterator([
        departure({ instant: "2026-01-01T17:01:00Z", tripId: "C" }),
        departure({ instant: "2026-01-04T17:02:00Z", tripId: "D" }),
      ]),
    ];
    const zipperIterator = new ZipperDeparturesIterator(iterators, 2);

    zipperIterator.set(
      Temporal.Instant.from("2026-01-01T17:00:00Z"),
      "forwards",
    );
    const result1 = zipperIterator.take();
    const result2 = zipperIterator.take();

    expect(zipperIterator.peek()).toBeNull();
    expect(() => zipperIterator.take()).toThrow();

    expect(result1.trip.gtfsTripId).toEqual("C");
    expect(result2.trip.gtfsTripId).toEqual("A");
  });

  it("doesn't return anything beyond the iteration limit in backwards mode", () => {
    const iterators = [
      new DummyIterator([
        departure({ instant: "2026-01-03T17:00:00Z", tripId: "A" }),
        departure({ instant: "2026-01-03T17:04:00Z", tripId: "B" }),
      ]),
      new DummyIterator([
        departure({ instant: "2026-01-01T17:01:00Z", tripId: "C" }),
        departure({ instant: "2026-01-04T17:02:00Z", tripId: "D" }),
      ]),
    ];
    const zipperIterator = new ZipperDeparturesIterator(iterators, 2);

    zipperIterator.set(
      Temporal.Instant.from("2026-01-04T17:00:00Z"),
      "backwards",
    );
    const result1 = zipperIterator.take();
    const result2 = zipperIterator.take();

    expect(zipperIterator.peek()).toBeNull();
    expect(() => zipperIterator.take()).toThrow();

    expect(result1.trip.gtfsTripId).toEqual("B");
    expect(result2.trip.gtfsTripId).toEqual("A");
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
