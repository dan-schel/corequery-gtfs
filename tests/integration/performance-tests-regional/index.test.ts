import { describe, it } from "vitest";
import { setupIntegrationTest } from "../support/setup/index.js";
import { createStopNameMapping } from "../support/create-stop-name-mapping.js";
import { expectDeparturesToMatchSnapshot } from "../support/expect-departures.js";

const iterationCount = 20;

// Only run these if `npm run test-performance` is called.
const skipPerformance = process.env.RUN_PERFORMANCE_TESTS !== "true";
describe.skipIf(skipPerformance)("performance-tests-regional", async () => {
  const { source } = await setupIntegrationTest(import.meta.dirname);
  const stopNameMapping = await createStopNameMapping(import.meta.dirname);

  // Southern Cross - A highly-serviced stop scenario.

  describe("Southern Cross, 2026-10-07T20:39:00+11:00, forwards", () => {
    it("completes in reasonable time", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Southern Cross",
        instant: "2026-10-07T20:39:00+11:00",
        direction: "forwards",
        maxResults: 50,
        formatTimezone: "Australia/Melbourne",
        iterationCount,
        maxConnectionsToFollow: 1,
      });
    });
  });

  describe("Southern Cross, 2026-10-07T20:39:00+11:00, backwards", () => {
    it("completes in reasonable time", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Southern Cross",
        instant: "2026-10-07T20:39:00+11:00",
        direction: "backwards",
        maxResults: 50,
        formatTimezone: "Australia/Melbourne",
        iterationCount,
        maxConnectionsToFollow: 1,
      });
    });
  });

  describe("Southern Cross, 2027-10-07T20:39:00+11:00, forwards", () => {
    it("completes in reasonable time", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Southern Cross",
        instant: "2027-10-07T20:39:00+11:00",
        direction: "forwards",
        maxResults: 50,
        formatTimezone: "Australia/Melbourne",
        iterationCount,
        maxConnectionsToFollow: 1,
      });
    });
  });

  describe("Southern Cross, 2027-10-07T20:39:00+11:00, backwards", () => {
    it("completes in reasonable time", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Southern Cross",
        instant: "2027-10-07T20:39:00+11:00",
        direction: "backwards",
        maxResults: 50,
        formatTimezone: "Australia/Melbourne",
        iterationCount,
        maxConnectionsToFollow: 1,
      });
    });
  });

  describe("Southern Cross, 2025-10-07T20:39:00+11:00, forwards", () => {
    it("completes in reasonable time", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Southern Cross",
        instant: "2025-10-07T20:39:00+11:00",
        direction: "forwards",
        maxResults: 50,
        formatTimezone: "Australia/Melbourne",
        iterationCount,
        maxConnectionsToFollow: 1,
      });
    });
  });

  describe("Southern Cross, 2025-10-07T20:39:00+11:00, backwards", () => {
    it("completes in reasonable time", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Southern Cross",
        instant: "2025-10-07T20:39:00+11:00",
        direction: "backwards",
        maxResults: 50,
        formatTimezone: "Australia/Melbourne",
        iterationCount,
        maxConnectionsToFollow: 1,
      });
    });
  });

  // Bairnsdale - A lowly-serviced stop scenario.

  describe("Bairnsdale, 2026-10-07T20:39:00+11:00, forwards", () => {
    it("completes in reasonable time", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Bairnsdale",
        instant: "2026-10-07T20:39:00+11:00",
        direction: "forwards",
        maxResults: 50,
        formatTimezone: "Australia/Melbourne",
        iterationCount,
        maxConnectionsToFollow: 1,
      });
    });
  });

  describe("Bairnsdale, 2026-10-07T20:39:00+11:00, backwards", () => {
    it("completes in reasonable time", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Bairnsdale",
        instant: "2026-10-07T20:39:00+11:00",
        direction: "backwards",
        maxResults: 50,
        formatTimezone: "Australia/Melbourne",
        iterationCount,
        maxConnectionsToFollow: 1,
      });
    });
  });

  describe("Bairnsdale, 2027-10-07T20:39:00+11:00, forwards", () => {
    it("completes in reasonable time", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Bairnsdale",
        instant: "2027-10-07T20:39:00+11:00",
        direction: "forwards",
        maxResults: 50,
        formatTimezone: "Australia/Melbourne",
        iterationCount,
        maxConnectionsToFollow: 1,
      });
    });
  });

  describe("Bairnsdale, 2027-10-07T20:39:00+11:00, backwards", () => {
    it("completes in reasonable time", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Bairnsdale",
        instant: "2027-10-07T20:39:00+11:00",
        direction: "backwards",
        maxResults: 50,
        formatTimezone: "Australia/Melbourne",
        iterationCount,
        maxConnectionsToFollow: 1,
      });
    });
  });

  describe("Bairnsdale, 2025-10-07T20:39:00+11:00, forwards", () => {
    it("completes in reasonable time", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Bairnsdale",
        instant: "2025-10-07T20:39:00+11:00",
        direction: "forwards",
        maxResults: 50,
        formatTimezone: "Australia/Melbourne",
        iterationCount,
        maxConnectionsToFollow: 1,
      });
    });
  });

  describe("Bairnsdale, 2025-10-07T20:39:00+11:00, backwards", () => {
    it("completes in reasonable time", async () => {
      await expectDeparturesToMatchSnapshot({
        source,
        stopNameMapping,
        stopName: "Bairnsdale",
        instant: "2025-10-07T20:39:00+11:00",
        direction: "backwards",
        maxResults: 50,
        formatTimezone: "Australia/Melbourne",
        iterationCount,
        maxConnectionsToFollow: 1,
      });
    });
  });
});
