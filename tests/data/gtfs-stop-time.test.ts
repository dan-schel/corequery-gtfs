import { describe, it, expect } from "vitest";
import { GtfsStopTime } from "../../src/data/gtfs-stop-time.js";

describe("GtfsStopTime", () => {
  describe("#secondOfDay", () => {
    function run(secondsSinceMidnight: number) {
      return GtfsStopTime.fromSecondsSinceMidnight(secondsSinceMidnight)
        .secondOfDay;
    }

    it("returns the number of seconds since midnight, modulo 24 hours", () => {
      expect(run(0)).toBe(0);
      expect(run(10)).toBe(10);
      expect(run(24 * 60 * 60)).toBe(0);
      expect(run(24 * 60 * 60 + 10)).toBe(10);
      expect(run(24 * 60 * 60 * 2 + 10)).toBe(10);
      expect(run(24 * 60 * 60 * 2 + 0.2)).toBeCloseTo(0.2, 8);
    });

    // I don't really expect negative secondsSinceMidnight to be used in
    // practice, but being resilient never hurts.
    it("works for negative secondsSinceMidnight", () => {
      expect(run(-10)).toBe(24 * 60 * 60 - 10);
      expect(run(-0.2)).toBeCloseTo(24 * 60 * 60 - 0.2, 8);
      expect(run(-0)).toBe(0);
    });
  });

  describe("#dayOffset", () => {
    function run(secondsSinceMidnight: number) {
      return GtfsStopTime.fromSecondsSinceMidnight(secondsSinceMidnight)
        .dayOffset;
    }

    it("returns the number of days since midnight", () => {
      expect(run(0)).toBe(0);
      expect(run(10)).toBe(0);
      expect(run(24 * 60 * 60)).toBe(1);
      expect(run(24 * 60 * 60 + 10)).toBe(1);
      expect(run(24 * 60 * 60 * 2 + 10)).toBe(2);
      expect(run(24 * 60 * 60 * 2 + 0.2)).toBe(2);
      expect(run(24 * 60 * 60 * 2 - 0.2)).toBe(1);
    });

    // I don't really expect negative secondsSinceMidnight to be used in
    // practice, but being resilient never hurts.
    it("works for negative secondsSinceMidnight", () => {
      expect(run(-10)).toBe(-1);
      expect(run(-0.2)).toBe(-1);
    });
  });

  describe("#toInstant", () => {
    const timezone = "Australia/Melbourne";

    function run(stopTimeStr: string, dateStr: string) {
      const serviceDay = Temporal.PlainDate.from(dateStr);
      const stopTime = GtfsStopTime.parse(stopTimeStr);
      return stopTime.toInstant(serviceDay, timezone).toString();
    }

    it("calculates the correct Temporal.Instant", () => {
      expect(run("00:00:00", "2026-07-13")).toEqual("2026-07-12T14:00:00Z");
      expect(run("11:35:00", "2026-07-13")).toEqual("2026-07-13T01:35:00Z");
      expect(run("24:35:00", "2026-07-13")).toEqual("2026-07-13T14:35:00Z");

      expect(run("00:00:00", "2026-01-13")).toEqual("2026-01-12T13:00:00Z");
      expect(run("11:35:00", "2026-01-13")).toEqual("2026-01-13T00:35:00Z");
      expect(run("24:35:00", "2026-01-13")).toEqual("2026-01-13T13:35:00Z");
    });

    it("uses the offset at midday for all times on that service day", () => {
      // On the first Sunday of April:

      // Uses +11:00 offset (even beyond 3:00am) for all services timetabled
      // for Saturday.
      expect(run("24:00:00", "2026-04-04")).toEqual("2026-04-04T13:00:00Z");
      expect(run("27:30:00", "2026-04-04")).toEqual("2026-04-04T16:30:00Z");

      // Uses +10:00 offset (even before 3:00am) for all services timetabled
      // for Sunday.
      expect(run("00:00:00", "2026-04-05")).toEqual("2026-04-04T14:00:00Z");
      expect(run("02:00:00", "2026-04-05")).toEqual("2026-04-04T16:00:00Z");
      expect(run("03:00:00", "2026-04-05")).toEqual("2026-04-04T17:00:00Z");
      expect(run("24:00:00", "2026-04-05")).toEqual("2026-04-05T14:00:00Z");
      expect(run("27:30:00", "2026-04-05")).toEqual("2026-04-05T17:30:00Z");

      // And then on the first Sunday of October:

      // Uses +10:00 offset (even beyond 2:00am) for all services timetabled
      // for Saturday.
      expect(run("24:00:00", "2026-10-03")).toEqual("2026-10-03T14:00:00Z");
      expect(run("27:30:00", "2026-10-03")).toEqual("2026-10-03T17:30:00Z");

      // Uses +11:00 offset (even before 2:00am) for all services timetabled
      // for Sunday.
      expect(run("00:00:00", "2026-10-04")).toEqual("2026-10-03T13:00:00Z");
      expect(run("02:00:00", "2026-10-04")).toEqual("2026-10-03T15:00:00Z");
      expect(run("03:00:00", "2026-10-04")).toEqual("2026-10-03T16:00:00Z");
      expect(run("24:00:00", "2026-10-04")).toEqual("2026-10-04T13:00:00Z");
      expect(run("27:30:00", "2026-10-04")).toEqual("2026-10-04T16:30:00Z");
    });
  });
});
