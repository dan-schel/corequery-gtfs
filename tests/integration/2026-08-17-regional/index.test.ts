import { describe, it } from "vitest";
import { setupIntegrationTest } from "../support/setup/index.js";
import { createStopNameMapping } from "../support/create-stop-name-mapping.js";
import { expectParsingErrorsToMatchSnapshot } from "../support/expect-parsing-errors.js";
import { expectDeparturesToMatchSnapshot } from "../support/expect-departures.js";

describe("2026-08-17-regional", async () => {
  const { source, system } = await setupIntegrationTest(import.meta.dirname);
  const stopNameMapping = await createStopNameMapping(import.meta.dirname);

  it("parses with expected errors only", () => {
    expectParsingErrorsToMatchSnapshot(system);
  });

  describe("Flinders Street, 2026-08-17T12:25:00+10:00, forwards", () => {
    it("gives correct departures", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
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
