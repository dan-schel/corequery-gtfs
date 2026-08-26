import { it, describe, expect } from "vitest";
import { GtfsScheduledTrip } from "../../src/data/gtfs-scheduled-trip.js";
import { GtfsStopTime } from "../../src/data/gtfs-stop-time.js";
import {
  DeparturesIteratorResult,
  DeparturesIterator,
} from "../../src/departures/departures-iterator.js";
import { MultifeedDeparturesIterator } from "../../src/departures/multifeed-departures-iterator.js";
import type { DeparturesIterationDirection } from "../../src/corequery-types.js";

describe("MultifeedDeparturesIterator", () => {
  it("returns departures in order of instant, and tags them with their feed ID", () => {
    const iterator1 = new DummyIterator([
      departure({ instant: "2026-01-01T00:00:00Z", tripId: "A" }),
      departure({ instant: "2026-01-01T00:04:00Z", tripId: "B" }),
    ]);
    const iterator2 = new DummyIterator([
      departure({ instant: "2026-01-01T00:01:00Z", tripId: "C" }),
      departure({ instant: "2026-01-01T00:02:00Z", tripId: "D" }),
    ]);
    const multifeedIterator = MultifeedDeparturesIterator.build({
      feed1: iterator1,
      feed2: iterator2,
    });

    multifeedIterator.set(
      Temporal.Instant.from("2026-01-01T00:00:00Z"),
      "forwards",
    );
    const result1 = multifeedIterator.take();
    const result2 = multifeedIterator.take();
    const result3 = multifeedIterator.take();
    const result4 = multifeedIterator.take();

    expect(multifeedIterator.peek()).toBeNull();
    expect(() => multifeedIterator.take()).toThrow();

    expect(result1.trip.gtfsTripId).toEqual("A");
    expect(result1.feed).toEqual("feed1");
    expect(result2.trip.gtfsTripId).toEqual("C");
    expect(result2.feed).toEqual("feed2");
    expect(result3.trip.gtfsTripId).toEqual("D");
    expect(result3.feed).toEqual("feed2");
    expect(result4.trip.gtfsTripId).toEqual("B");
    expect(result4.feed).toEqual("feed1");
  });

  it("works correctly if no feeds given", () => {
    const multifeedIterator = new MultifeedDeparturesIterator(new Map());

    multifeedIterator.set(
      Temporal.Instant.from("2026-01-01T00:00:00Z"),
      "forwards",
    );

    expect(multifeedIterator.peek()).toBeNull();
    expect(() => multifeedIterator.take()).toThrow();
  });

  it("works correctly if all iterators are empty", () => {
    const iterator1 = new DummyIterator([]);
    const iterator2 = new DummyIterator([]);

    const multifeedIterator = MultifeedDeparturesIterator.build({
      feed1: iterator1,
      feed2: iterator2,
    });

    multifeedIterator.set(
      Temporal.Instant.from("2026-01-01T00:00:00Z"),
      "forwards",
    );

    expect(multifeedIterator.peek()).toBeNull();
    expect(() => multifeedIterator.take()).toThrow();
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
