import type { ServiceRegularMovementFields } from "../../../corequery-types.js";
import type { StopGtfsIdMetadata } from "../../ids/stop-gtfs-id-metadata.js";
import type { IGtfsReplacedTripServicingMovement } from "./types.js";

export type GtfsReplacedTripRegularMovementFields = {
  readonly stopId: number;
  readonly originalPositionId: number | null;
  readonly currentPositionId: number | null;

  readonly scheduledArrivalTime: Temporal.Instant | null;
  readonly knownRealtimeArrivalTime: Temporal.Instant | null;
  readonly assumedRealtimeArrivalTime: Temporal.Instant | null;

  readonly scheduledDepartureTime: Temporal.Instant | null;
  readonly knownRealtimeDepartureTime: Temporal.Instant | null;
  readonly assumedRealtimeDepartureTime: Temporal.Instant | null;

  readonly picksUp: boolean;
  readonly dropsOff: boolean;

  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;
};

export class GtfsReplacedTripRegularMovement implements IGtfsReplacedTripServicingMovement {
  readonly stopId: number;
  readonly originalPositionId: number | null;
  readonly currentPositionId: number | null;

  readonly scheduledArrivalTime: Temporal.Instant | null;
  readonly knownRealtimeArrivalTime: Temporal.Instant | null;
  readonly assumedRealtimeArrivalTime: Temporal.Instant | null;
  readonly effectiveArrivalTime: Temporal.Instant;

  readonly scheduledDepartureTime: Temporal.Instant | null;
  readonly knownRealtimeDepartureTime: Temporal.Instant | null;
  readonly assumedRealtimeDepartureTime: Temporal.Instant | null;
  readonly effectiveDepartureTime: Temporal.Instant;

  readonly picksUp: boolean;
  readonly dropsOff: boolean;

  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;

  constructor(fields: GtfsReplacedTripRegularMovementFields) {
    this.stopId = fields.stopId;
    this.originalPositionId = fields.originalPositionId;
    this.currentPositionId = fields.currentPositionId;
    this.scheduledArrivalTime = fields.scheduledArrivalTime;
    this.knownRealtimeArrivalTime = fields.knownRealtimeArrivalTime;
    this.assumedRealtimeArrivalTime = fields.assumedRealtimeArrivalTime;
    this.scheduledDepartureTime = fields.scheduledDepartureTime;
    this.knownRealtimeDepartureTime = fields.knownRealtimeDepartureTime;
    this.assumedRealtimeDepartureTime = fields.assumedRealtimeDepartureTime;
    this.picksUp = fields.picksUp;
    this.dropsOff = fields.dropsOff;
    this.gtfsIdMetadata = fields.gtfsIdMetadata;
    this.gtfsStopSequence = fields.gtfsStopSequence;

    const effectiveArrivalTime =
      this.knownRealtimeArrivalTime ??
      this.assumedRealtimeArrivalTime ??
      this.scheduledArrivalTime;
    if (effectiveArrivalTime == null) throw new Error("No arrival time.");
    this.effectiveArrivalTime = effectiveArrivalTime;

    const effectiveDepartureTime =
      this.knownRealtimeDepartureTime ??
      this.assumedRealtimeDepartureTime ??
      this.scheduledDepartureTime;
    if (effectiveDepartureTime == null) throw new Error("No departure time.");
    this.effectiveDepartureTime = effectiveDepartureTime;
  }

  with(
    newValues: Partial<GtfsReplacedTripRegularMovementFields>,
  ): GtfsReplacedTripRegularMovement {
    return new GtfsReplacedTripRegularMovement({ ...this, ...newValues });
  }

  get type() {
    return "regular" as const;
  }

  get isServicing() {
    return true as const;
  }

  get isNonTerminal() {
    return true as const;
  }

  get timeRelevantToDeparturesAlgorithm() {
    return this.effectiveDepartureTime;
  }

  asCorequeryFields(): ServiceRegularMovementFields {
    return {
      stopId: this.stopId,
      originalPositionId: this.originalPositionId,
      currentPositionId: this.currentPositionId,

      ...this._arrivalTimeCorequeryFields,
      ...this._departureTimeCorequeryFields,

      picksUp: this.picksUp,
      dropsOff: this.dropsOff,
    };
  }

  private get _arrivalTimeCorequeryFields() {
    if (this.knownRealtimeArrivalTime !== null) {
      return {
        arrivalTimeType: "provided-live-time" as const,
        arrivalTime: this.knownRealtimeArrivalTime,
        formerArrivalTime: this.scheduledArrivalTime,
      };
    } else if (this.assumedRealtimeArrivalTime !== null) {
      return {
        arrivalTimeType: "interpolated-live-time" as const,
        arrivalTime: this.assumedRealtimeArrivalTime,
        formerArrivalTime: this.scheduledArrivalTime,
      };
    } else {
      return {
        arrivalTimeType: "scheduled-time" as const,

        // Given the others must be null at this point, the effective time must
        // equal the scheduled time.
        arrivalTime: this.effectiveArrivalTime,

        formerArrivalTime: null,
      };
    }
  }

  private get _departureTimeCorequeryFields() {
    if (this.knownRealtimeDepartureTime !== null) {
      return {
        departureTimeType: "provided-live-time" as const,
        departureTime: this.knownRealtimeDepartureTime,
        formerDepartureTime: this.scheduledDepartureTime,
      };
    } else if (this.assumedRealtimeDepartureTime !== null) {
      return {
        departureTimeType: "interpolated-live-time" as const,
        departureTime: this.assumedRealtimeDepartureTime,
        formerDepartureTime: this.scheduledDepartureTime,
      };
    } else {
      return {
        departureTimeType: "scheduled-time" as const,

        // Given the others must be null at this point, the effective time must
        // equal the scheduled time.
        departureTime: this.effectiveDepartureTime,

        formerDepartureTime: null,
      };
    }
  }
}
