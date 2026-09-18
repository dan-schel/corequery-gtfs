import type { ServiceOriginatingMovementFields } from "../../../corequery-types.js";
import type { StopGtfsIdMetadata } from "../../ids/stop-gtfs-id-metadata.js";
import type { IGtfsUpdatedTripServicingMovement } from "./types.js";

export type GtfsUpdatedTripOriginatingMovementFields = {
  readonly stopId: number;
  readonly originalPositionId: number | null;
  readonly updatedPositionId: number | null;

  readonly scheduledDepartureTime: Temporal.Instant;
  readonly knownRealtimeDepartureTime: Temporal.Instant | null;
  readonly assumedRealtimeDepartureTime: Temporal.Instant | null;

  readonly originalGtfsIdMetadata: StopGtfsIdMetadata;
  readonly updatedGtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;
};

export class GtfsUpdatedTripOriginatingMovement implements IGtfsUpdatedTripServicingMovement {
  readonly stopId: number;
  readonly originalPositionId: number | null;
  readonly updatedPositionId: number | null;

  readonly scheduledDepartureTime: Temporal.Instant;
  readonly knownRealtimeDepartureTime: Temporal.Instant | null;
  readonly assumedRealtimeDepartureTime: Temporal.Instant | null;

  readonly originalGtfsIdMetadata: StopGtfsIdMetadata;
  readonly updatedGtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;

  constructor(fields: GtfsUpdatedTripOriginatingMovementFields) {
    this.stopId = fields.stopId;
    this.originalPositionId = fields.originalPositionId;
    this.updatedPositionId = fields.updatedPositionId;

    this.scheduledDepartureTime = fields.scheduledDepartureTime;
    this.knownRealtimeDepartureTime = fields.knownRealtimeDepartureTime;
    this.assumedRealtimeDepartureTime = fields.assumedRealtimeDepartureTime;

    this.originalGtfsIdMetadata = fields.originalGtfsIdMetadata;
    this.updatedGtfsIdMetadata = fields.updatedGtfsIdMetadata;
    this.gtfsStopSequence = fields.gtfsStopSequence;
  }

  with(
    newValues: Partial<GtfsUpdatedTripOriginatingMovementFields>,
  ): GtfsUpdatedTripOriginatingMovement {
    return new GtfsUpdatedTripOriginatingMovement({ ...this, ...newValues });
  }

  get type() {
    return "originating" as const;
  }

  get isServicing() {
    return true as const;
  }

  get isNonTerminal() {
    return false as const;
  }

  get timeRelevantToDeparturesAlgorithm() {
    return (
      this.knownRealtimeDepartureTime ??
      this.assumedRealtimeDepartureTime ??
      this.scheduledDepartureTime
    );
  }

  asCorequeryFields(): ServiceOriginatingMovementFields {
    return {
      stopId: this.stopId,
      originalPositionId: this.originalPositionId,
      updatedPositionId: this.updatedPositionId,

      departureTimeType:
        this.knownRealtimeDepartureTime !== null
          ? "provided-live-time"
          : "scheduled-time",
      departureTime:
        this.knownRealtimeDepartureTime ?? this.scheduledDepartureTime,
      formerDepartureTime:
        this.knownRealtimeDepartureTime !== null
          ? this.scheduledDepartureTime
          : null,
    };
  }
}
