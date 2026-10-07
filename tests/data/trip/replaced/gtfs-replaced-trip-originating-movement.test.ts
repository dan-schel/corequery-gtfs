import { describe, expect, it } from "vitest";
import { GtfsReplacedTripOriginatingMovement } from "../../../../src/data/trip/replaced/gtfs-replaced-trip-originating-movement.js";

describe("GtfsReplacedTripOriginatingMovement", () => {
  describe("#constructor", () => {
    it("throws if no departure time is given", () => {
      expect(() => {
        new GtfsReplacedTripOriginatingMovement({
          stopId: 1,
          originalPositionId: null,
          currentPositionId: null,
          scheduledDepartureTime: null,
          knownRealtimeDepartureTime: null,
          assumedRealtimeDepartureTime: null,
          gtfsIdMetadata: { type: "general", id: "stop-1", stopId: 1 },
          gtfsStopSequence: 1,
        });
      }).toThrow();
    });
  });
});
