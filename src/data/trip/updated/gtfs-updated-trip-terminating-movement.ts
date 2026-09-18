import type { ServiceTerminatingMovementFields } from "../../../corequery-types.js";
import type { StopGtfsIdMetadata } from "../../ids/stop-gtfs-id-metadata.js";
import type { IGtfsUpdatedTripServicingMovement } from "./types.js";

export type GtfsUpdatedTripTerminatingMovementFields = {
  readonly stopId: number;
  readonly originalPositionId: number | null;
  readonly updatedPositionId: number | null;

  readonly scheduledArrivalTime: Temporal.Instant;
  readonly knownRealtimeArrivalTime: Temporal.Instant | null;
  readonly assumedRealtimeArrivalTime: Temporal.Instant | null;

  readonly originalGtfsIdMetadata: StopGtfsIdMetadata;
  readonly updatedGtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;
};

export class GtfsUpdatedTripTerminatingMovement implements IGtfsUpdatedTripServicingMovement {
  readonly stopId: number;
  readonly originalPositionId: number | null;
  readonly updatedPositionId: number | null;

  readonly scheduledArrivalTime: Temporal.Instant;
  readonly knownRealtimeArrivalTime: Temporal.Instant | null;
  readonly assumedRealtimeArrivalTime: Temporal.Instant | null;

  readonly originalGtfsIdMetadata: StopGtfsIdMetadata;
  readonly updatedGtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;

  constructor(fields: GtfsUpdatedTripTerminatingMovementFields) {
    this.stopId = fields.stopId;
    this.originalPositionId = fields.originalPositionId;
    this.updatedPositionId = fields.updatedPositionId;

    this.scheduledArrivalTime = fields.scheduledArrivalTime;
    this.knownRealtimeArrivalTime = fields.knownRealtimeArrivalTime;
    this.assumedRealtimeArrivalTime = fields.assumedRealtimeArrivalTime;

    this.originalGtfsIdMetadata = fields.originalGtfsIdMetadata;
    this.updatedGtfsIdMetadata = fields.updatedGtfsIdMetadata;
    this.gtfsStopSequence = fields.gtfsStopSequence;
  }

  with(
    newValues: Partial<GtfsUpdatedTripTerminatingMovementFields>,
  ): GtfsUpdatedTripTerminatingMovement {
    return new GtfsUpdatedTripTerminatingMovement({ ...this, ...newValues });
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
    return (
      this.knownRealtimeArrivalTime ??
      this.assumedRealtimeArrivalTime ??
      this.scheduledArrivalTime
    );
  }

  asCorequeryFields(): ServiceTerminatingMovementFields {
    return {
      stopId: this.stopId,
      originalPositionId: this.originalPositionId,
      updatedPositionId: this.updatedPositionId,

      arrivalTimeType:
        this.knownRealtimeArrivalTime !== null
          ? "provided-live-time"
          : "scheduled-time",
      arrivalTime: this.knownRealtimeArrivalTime ?? this.scheduledArrivalTime,
      formerArrivalTime:
        this.knownRealtimeArrivalTime !== null
          ? this.scheduledArrivalTime
          : null,
    };
  }
}
