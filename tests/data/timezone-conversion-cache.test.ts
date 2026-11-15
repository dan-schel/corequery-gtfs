import { describe, expect, it } from "vitest";
import { TimezoneConversionCache } from "../../src/data/timezone-conversion-cache.js";

describe("TimezoneConversionCache", () => {
  it("reuses values for equivalent service days", () => {
    const cache = new TimezoneConversionCache();

    const first = cache.get(
      Temporal.PlainDate.from("2026-07-13"),
      "Australia/Melbourne",
    );
    const second = cache.get(
      Temporal.PlainDate.from("2026-07-13"),
      "Australia/Melbourne",
    );

    // Intentionally using toBe to check that the cache hasn't been written
    // twice for the same input.
    expect(second).toBe(first);
  });
});
