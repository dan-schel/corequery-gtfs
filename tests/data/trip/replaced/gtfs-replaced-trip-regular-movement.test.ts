import { describe, expect, it } from "vitest";
import { GtfsReplacedTripRegularMovement } from "../../../../src/data/trip/replaced/gtfs-replaced-trip-regular-movement.js";

describe("GtfsReplacedTripRegularMovement", () => {
  describe("#constructor", () => {
    it("throws if no arrival time is given", () => {
      expect(() => {
        new GtfsReplacedTripRegularMovement({
          stopId: 1,
          originalPositionId: null,
          currentPositionId: null,

          scheduledArrivalTime: null,
          knownRealtimeArrivalTime: null,
          assumedRealtimeArrivalTime: null,

          scheduledDepartureTime: Temporal.Instant.from("2026-09-25T09:00:00Z"),
          knownRealtimeDepartureTime: null,
          assumedRealtimeDepartureTime: null,

          picksUp: true,
          dropsOff: true,

          gtfsIdMetadata: { type: "general", id: "stop-1", stopId: 1 },
          gtfsStopSequence: 1,
        });
      }).toThrow();
    });

    it("throws if no departure time is given", () => {
      expect(() => {
        new GtfsReplacedTripRegularMovement({
          stopId: 1,
          originalPositionId: null,
          currentPositionId: null,

          scheduledArrivalTime: Temporal.Instant.from("2026-09-25T09:00:00Z"),
          knownRealtimeArrivalTime: null,
          assumedRealtimeArrivalTime: null,

          scheduledDepartureTime: null,
          knownRealtimeDepartureTime: null,
          assumedRealtimeDepartureTime: null,

          picksUp: true,
          dropsOff: true,

          gtfsIdMetadata: { type: "general", id: "stop-1", stopId: 1 },
          gtfsStopSequence: 1,
        });
      }).toThrow();
    });
  });
});
