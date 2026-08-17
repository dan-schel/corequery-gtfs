import { describe, expect, it } from "vitest";
import { PlainDateRange } from "../../../../src/gtfs/corequery-gtfs/data/plain-date-range.js";

describe("PlainDateRange", () => {
  it("throws when start date is after end date", () => {
    expect(
      () =>
        new PlainDateRange(
          Temporal.PlainDate.from("2026-06-18"),
          Temporal.PlainDate.from("2026-06-17"),
        ),
    ).toThrow();
  });

  it("includes both boundaries", () => {
    const range = new PlainDateRange(
      Temporal.PlainDate.from("2026-06-17"),
      Temporal.PlainDate.from("2026-06-19"),
    );

    expect(range.includes(Temporal.PlainDate.from("2026-06-16"))).toBe(false);
    expect(range.includes(Temporal.PlainDate.from("2026-06-17"))).toBe(true);
    expect(range.includes(Temporal.PlainDate.from("2026-06-18"))).toBe(true);
    expect(range.includes(Temporal.PlainDate.from("2026-06-19"))).toBe(true);
    expect(range.includes(Temporal.PlainDate.from("2026-06-20"))).toBe(false);
  });

  it("supports open-ended ranges", () => {
    const noStart = new PlainDateRange(
      null,
      Temporal.PlainDate.from("2026-06-19"),
    );
    const noEnd = new PlainDateRange(
      Temporal.PlainDate.from("2026-06-17"),
      null,
    );

    expect(noStart.includes(Temporal.PlainDate.from("1900-01-01"))).toBe(true);
    expect(noStart.includes(Temporal.PlainDate.from("2026-06-20"))).toBe(false);
    expect(noEnd.includes(Temporal.PlainDate.from("2026-06-16"))).toBe(false);
    expect(noEnd.includes(Temporal.PlainDate.from("2100-01-01"))).toBe(true);
  });
});
