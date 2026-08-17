import { describe, expect, it } from "vitest";
import { BoundedInstantRange } from "../../../../src/gtfs/corequery-gtfs/data/bounded-instant-range.js";

describe("BoundedInstantRange", () => {
  describe("constructor", () => {
    it("throws when start is after end", () => {
      expect(
        () =>
          new BoundedInstantRange(
            Temporal.Instant.from("2026-06-17T10:00:00Z"),
            Temporal.Instant.from("2026-06-17T09:00:00Z"),
          ),
      ).toThrow();
    });
  });

  const a = new BoundedInstantRange(
    Temporal.Instant.from("2026-06-17T09:00:00Z"),
    Temporal.Instant.from("2026-06-17T10:00:00Z"),
  );
  const b = new BoundedInstantRange(
    Temporal.Instant.from("2026-06-17T09:30:00Z"),
    Temporal.Instant.from("2026-06-17T10:30:00Z"),
  );
  const c = new BoundedInstantRange(
    Temporal.Instant.from("2026-06-17T10:30:00Z"),
    Temporal.Instant.from("2026-06-17T11:30:00Z"),
  );

  describe("#intersects", () => {
    it("works", () => {
      expect(a.intersects(a)).toBe(true);
      expect(a.intersects(b)).toBe(true);
      expect(a.intersects(c)).toBe(false);

      expect(b.intersects(a)).toBe(true);
      expect(b.intersects(b)).toBe(true);
      expect(b.intersects(c)).toBe(false);

      expect(c.intersects(a)).toBe(false);
      expect(c.intersects(b)).toBe(false);
      expect(c.intersects(c)).toBe(true);
    });
  });

  describe("#touches", () => {
    it("works", () => {
      expect(a.touches(a)).toBe(true);
      expect(a.touches(b)).toBe(true);
      expect(a.touches(c)).toBe(false);

      expect(b.touches(a)).toBe(true);
      expect(b.touches(b)).toBe(true);
      expect(b.touches(c)).toBe(true);

      expect(c.touches(a)).toBe(false);
      expect(c.touches(b)).toBe(true);
      expect(c.touches(c)).toBe(true);
    });
  });
});
