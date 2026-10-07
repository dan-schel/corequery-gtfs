import { describe, expect, it } from "vitest";
import { GtfsReplacedTripTerminatingMovement } from "../../../../src/data/trip/replaced/gtfs-replaced-trip-terminating-movement.js";

describe("GtfsReplacedTripTerminatingMovement", () => {
  describe("#constructor", () => {
    it("throws if no arrival time is given", () => {
      expect(() => {
        new GtfsReplacedTripTerminatingMovement({
          stopId: 1,
          originalPositionId: null,
          currentPositionId: null,
          scheduledArrivalTime: null,
          knownRealtimeArrivalTime: null,
          assumedRealtimeArrivalTime: null,
          gtfsIdMetadata: { type: "general", id: "stop-1", stopId: 1 },
          gtfsStopSequence: 1,
        });
      }).toThrow();
    });
  });
});
