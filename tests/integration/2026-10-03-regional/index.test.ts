import { describe, it } from "vitest";
import { setupIntegrationTest } from "../support/setup/index.js";
import { createStopNameMapping } from "../support/create-stop-name-mapping.js";
import { expectParsingErrorsToMatchSnapshot } from "../support/expect-parsing-errors.js";
import { expectDeparturesToMatchSnapshot } from "../support/expect-departures.js";

describe("2026-10-03-regional", async () => {
  const { source, system } = await setupIntegrationTest(import.meta.dirname);
  const stopNameMapping = await createStopNameMapping(import.meta.dirname);

  it("parses with expected errors only", () => {
    expectParsingErrorsToMatchSnapshot(system);
  });

  describe("Southern Cross, 2026-10-04T00:00:00+10:00, forwards", () => {
    it("gives correct departures", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Southern Cross",
        instant: "2026-10-04T00:00:00+10:00",
        direction: "forwards",
        maxResults: 10,
        formatTimezone: "Australia/Melbourne",
        maxConnectionsToFollow: 1,
      });
    });
  });
});
