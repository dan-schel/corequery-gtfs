import { describe, it } from "vitest";
import { createGtfsSystemForIntegrationTest } from "../support/create-gtfs-system/index.js";
import { createStopNameMapping } from "../support/create-stop-name-mapping.js";
import { expectParsingErrorsToMatchSnapshot } from "../support/expect-parsing-errors.js";
import { expectDeparturesToMatchSnapshot } from "../support/expect-departures.js";

describe("2026-08-17-suburban", async () => {
  const system = await createGtfsSystemForIntegrationTest(import.meta.dirname);
  const stopNameMapping = await createStopNameMapping(import.meta.dirname);

  it("parses with expected errors only", () => {
    expectParsingErrorsToMatchSnapshot(system);
  });

  describe("Flinders Street, 2026-08-17T12:25:00+10:00, forwards", () => {
    it("gives correct departures", () => {
      expectDeparturesToMatchSnapshot({
        system,
        stopNameMapping,
        stopName: "Flinders Street",
        instant: "2026-08-17T12:25:00+10:00",
        direction: "forwards",
        maxResults: 10,
        formatTimezone: "Australia/Melbourne",
      });
    });
  });
});
