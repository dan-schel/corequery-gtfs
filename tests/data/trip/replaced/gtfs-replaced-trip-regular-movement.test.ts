import { describe, expect, it } from "vitest";
import {
  GtfsReplacedTripRegularMovement,
  type GtfsReplacedTripRegularMovementFields,
} from "../../../../src/data/trip/replaced/gtfs-replaced-trip-regular-movement.js";

const SCHEDULED = Temporal.Instant.from("2026-09-25T09:00:00Z");
const KNOWN = Temporal.Instant.from("2026-09-25T09:02:00Z");
const ASSUMED = Temporal.Instant.from("2026-09-25T09:01:00Z");

const FIELDS: GtfsReplacedTripRegularMovementFields = {
  stopId: 1,
  originalPositionId: null,
  currentPositionId: null,
  scheduledArrivalTime: SCHEDULED,
  knownRealtimeArrivalTime: null,
  assumedRealtimeArrivalTime: null,
  scheduledDepartureTime: SCHEDULED,
  knownRealtimeDepartureTime: null,
  assumedRealtimeDepartureTime: null,
  picksUp: true,
  dropsOff: true,
  gtfsIdMetadata: { type: "general", id: "stop-1", stopId: 1 },
  gtfsStopSequence: 1,
};

describe("GtfsReplacedTripRegularMovement", () => {
  it("prefers known, then assumed, then scheduled times", () => {
    const movement = new GtfsReplacedTripRegularMovement({
      ...FIELDS,
      assumedRealtimeArrivalTime: ASSUMED,
      knownRealtimeDepartureTime: KNOWN,
      assumedRealtimeDepartureTime: ASSUMED,
    });

    expect(movement.effectiveArrivalTime).toEqual(ASSUMED);
    expect(movement.effectiveDepartureTime).toEqual(KNOWN);
  });

  it("allows scheduled times to be null", () => {
    const movement = new GtfsReplacedTripRegularMovement({
      ...FIELDS,
      scheduledArrivalTime: null,
      knownRealtimeArrivalTime: KNOWN,
      scheduledDepartureTime: null,
      knownRealtimeDepartureTime: KNOWN,
    });

    expect(movement.effectiveArrivalTime).toEqual(KNOWN);
    expect(movement.effectiveDepartureTime).toEqual(KNOWN);
  });

  it("throws if there's no arrival or departure time", () => {
    expect(
      () =>
        new GtfsReplacedTripRegularMovement({
          ...FIELDS,
          scheduledArrivalTime: null,
        }),
    ).toThrow();
    expect(
      () =>
        new GtfsReplacedTripRegularMovement({
          ...FIELDS,
          scheduledDepartureTime: null,
        }),
    ).toThrow();
  });

  it("recalculates effective times when using with", () => {
    const movement = new GtfsReplacedTripRegularMovement(FIELDS).with({
      knownRealtimeDepartureTime: KNOWN,
    });

    expect(movement.effectiveArrivalTime).toEqual(SCHEDULED);
    expect(movement.effectiveDepartureTime).toEqual(KNOWN);
  });
});
