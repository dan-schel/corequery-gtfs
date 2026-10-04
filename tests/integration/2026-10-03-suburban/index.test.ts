import { describe, it } from "vitest";
import { setupIntegrationTest } from "../support/setup/index.js";
import { createStopNameMapping } from "../support/create-stop-name-mapping.js";
import { expectParsingErrorsToMatchSnapshot } from "../support/expect-parsing-errors.js";
import { expectDeparturesToMatchSnapshot } from "../support/expect-departures.js";

describe("2026-10-03-suburban", async () => {
  const { source, system } = await setupIntegrationTest(import.meta.dirname);
  const stopNameMapping = await createStopNameMapping(import.meta.dirname);

  it("parses with expected errors only", () => {
    expectParsingErrorsToMatchSnapshot(system);
  });

  describe("Richmond, 2026-10-04T01:30:00+10:00, forwards", () => {
    it("gives correct departures", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Richmond",
        instant: "2026-10-04T01:30:00+10:00",
        direction: "forwards",
        maxResults: 10,
        formatTimezone: "Australia/Melbourne",
        maxConnectionsToFollow: 1,
      });
    });
  });

  describe("Richmond, 2026-10-11T01:30:00+11:00, forwards", () => {
    it("gives correct departures", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Richmond",
        instant: "2026-10-11T01:30:00+11:00",
        direction: "forwards",
        maxResults: 10,
        formatTimezone: "Australia/Melbourne",
        maxConnectionsToFollow: 1,
      });
    });
  });
});
