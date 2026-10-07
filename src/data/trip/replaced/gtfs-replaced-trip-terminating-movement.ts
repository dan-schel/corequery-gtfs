import type { ServiceTerminatingMovementFields } from "../../../corequery-types.js";
import type { StopGtfsIdMetadata } from "../../ids/stop-gtfs-id-metadata.js";
import type { IGtfsReplacedTripServicingMovement } from "./types.js";

export type GtfsReplacedTripTerminatingMovementFields = {
  readonly stopId: number;
  readonly originalPositionId: number | null;
  readonly currentPositionId: number | null;

  readonly scheduledArrivalTime: Temporal.Instant | null;
  readonly knownRealtimeArrivalTime: Temporal.Instant | null;
  readonly assumedRealtimeArrivalTime: Temporal.Instant | null;

  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;
};

export class GtfsReplacedTripTerminatingMovement implements IGtfsReplacedTripServicingMovement {
  readonly stopId: number;
  readonly originalPositionId: number | null;
  readonly currentPositionId: number | null;

  readonly scheduledArrivalTime: Temporal.Instant | null;
  readonly knownRealtimeArrivalTime: Temporal.Instant | null;
  readonly assumedRealtimeArrivalTime: Temporal.Instant | null;
  readonly effectiveArrivalTime: Temporal.Instant;

  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;

  constructor(fields: GtfsReplacedTripTerminatingMovementFields) {
    this.stopId = fields.stopId;
    this.originalPositionId = fields.originalPositionId;
    this.currentPositionId = fields.currentPositionId;

    this.scheduledArrivalTime = fields.scheduledArrivalTime;
    this.knownRealtimeArrivalTime = fields.knownRealtimeArrivalTime;
    this.assumedRealtimeArrivalTime = fields.assumedRealtimeArrivalTime;

    this.gtfsIdMetadata = fields.gtfsIdMetadata;
    this.gtfsStopSequence = fields.gtfsStopSequence;

    const effectiveArrivalTime =
      this.knownRealtimeArrivalTime ??
      this.assumedRealtimeArrivalTime ??
      this.scheduledArrivalTime;
    if (effectiveArrivalTime == null) throw new Error("No arrival time.");
    this.effectiveArrivalTime = effectiveArrivalTime;
  }

  with(
    newValues: Partial<GtfsReplacedTripTerminatingMovementFields>,
  ): GtfsReplacedTripTerminatingMovement {
    return new GtfsReplacedTripTerminatingMovement({ ...this, ...newValues });
  }

  get type() {
    return "terminating" as const;
  }

  get isServicing() {
    return true as const;
  }

  get isNonTerminal() {
    return false as const;
  }

  get timeRelevantToDeparturesAlgorithm() {
    return this.effectiveArrivalTime;
  }

  asCorequeryFields(): ServiceTerminatingMovementFields {
    return {
      stopId: this.stopId,
      originalPositionId: this.originalPositionId,
      currentPositionId: this.currentPositionId,

      ...this._arrivalTimeCorequeryFields,
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
}
