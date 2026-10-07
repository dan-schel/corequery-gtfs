import { describe, it } from "vitest";
import { setupIntegrationTest } from "../support/setup/index.js";
import { createStopNameMapping } from "../support/create-stop-name-mapping.js";
import { expectDeparturesToMatchSnapshot } from "../support/expect-departures.js";

describe("performance-tests-suburban", async () => {
  const { source } = await setupIntegrationTest(import.meta.dirname);
  const stopNameMapping = await createStopNameMapping(import.meta.dirname);

  // Flinders Street - A highly-serviced stop scenario.

  describe("Flinders Street, 2026-10-07T20:39:00+11:00, forwards", () => {
    it("completes in reasonable time", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Flinders Street",
        instant: "2026-10-07T20:39:00+11:00",
        direction: "forwards",
        maxResults: 50,
        formatTimezone: "Australia/Melbourne",
        maxConnectionsToFollow: 1,
      });
    });
  });

  describe("Flinders Street, 2026-10-07T20:39:00+11:00, backwards", () => {
    it("completes in reasonable time", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Flinders Street",
        instant: "2026-10-07T20:39:00+11:00",
        direction: "backwards",
        maxResults: 50,
        formatTimezone: "Australia/Melbourne",
        maxConnectionsToFollow: 1,
      });
    });
  });

  describe("Flinders Street, 2027-10-07T20:39:00+11:00, forwards", () => {
    it("completes in reasonable time", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Flinders Street",
        instant: "2027-10-07T20:39:00+11:00",
        direction: "forwards",
        maxResults: 50,
        formatTimezone: "Australia/Melbourne",
        maxConnectionsToFollow: 1,
      });
    });
  });

  describe("Flinders Street, 2027-10-07T20:39:00+11:00, backwards", () => {
    it("completes in reasonable time", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Flinders Street",
        instant: "2027-10-07T20:39:00+11:00",
        direction: "backwards",
        maxResults: 50,
        formatTimezone: "Australia/Melbourne",
        maxConnectionsToFollow: 1,
      });
    });
  });

  describe("Flinders Street, 2025-10-07T20:39:00+11:00, forwards", () => {
    it("completes in reasonable time", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Flinders Street",
        instant: "2025-10-07T20:39:00+11:00",
        direction: "forwards",
        maxResults: 50,
        formatTimezone: "Australia/Melbourne",
        maxConnectionsToFollow: 1,
      });
    });
  });

  describe("Flinders Street, 2025-10-07T20:39:00+11:00, backwards", () => {
    it("completes in reasonable time", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Flinders Street",
        instant: "2025-10-07T20:39:00+11:00",
        direction: "backwards",
        maxResults: 50,
        formatTimezone: "Australia/Melbourne",
        maxConnectionsToFollow: 1,
      });
    });
  });

  // Clayton - A normally-serviced stop scenario.

  describe("Clayton, 2026-10-07T20:39:00+11:00, forwards", () => {
    it("completes in reasonable time", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Clayton",
        instant: "2026-10-07T20:39:00+11:00",
        direction: "forwards",
        maxResults: 50,
        formatTimezone: "Australia/Melbourne",
        maxConnectionsToFollow: 1,
      });
    });
  });

  describe("Clayton, 2026-10-07T20:39:00+11:00, backwards", () => {
    it("completes in reasonable time", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Clayton",
        instant: "2026-10-07T20:39:00+11:00",
        direction: "backwards",
        maxResults: 50,
        formatTimezone: "Australia/Melbourne",
        maxConnectionsToFollow: 1,
      });
    });
  });

  describe("Clayton, 2027-10-07T20:39:00+11:00, forwards", () => {
    it("completes in reasonable time", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Clayton",
        instant: "2027-10-07T20:39:00+11:00",
        direction: "forwards",
        maxResults: 50,
        formatTimezone: "Australia/Melbourne",
        maxConnectionsToFollow: 1,
      });
    });
  });

  describe("Clayton, 2027-10-07T20:39:00+11:00, backwards", () => {
    it("completes in reasonable time", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Clayton",
        instant: "2027-10-07T20:39:00+11:00",
        direction: "backwards",
        maxResults: 50,
        formatTimezone: "Australia/Melbourne",
        maxConnectionsToFollow: 1,
      });
    });
  });

  describe("Clayton, 2025-10-07T20:39:00+11:00, forwards", () => {
    it("completes in reasonable time", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Clayton",
        instant: "2025-10-07T20:39:00+11:00",
        direction: "forwards",
        maxResults: 50,
        formatTimezone: "Australia/Melbourne",
        maxConnectionsToFollow: 1,
      });
    });
  });

  describe("Clayton, 2025-10-07T20:39:00+11:00, backwards", () => {
    it("completes in reasonable time", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Clayton",
        instant: "2025-10-07T20:39:00+11:00",
        direction: "backwards",
        maxResults: 50,
        formatTimezone: "Australia/Melbourne",
        maxConnectionsToFollow: 1,
      });
    });
  });
});
