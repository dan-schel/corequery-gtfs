import type { StopGtfsIdMetadata } from "../../ids/stop-gtfs-id-metadata.js";
import type { IGtfsUpdatedTripServicingMovement } from "./types.js";

export type GtfsUpdatedTripRegularMovementFields = {
  readonly stopId: number;
  readonly originalPositionId: number | null;
  readonly updatedPositionId: number | null;
  readonly scheduledArrivalTime: Temporal.Instant;
  readonly knownRealtimeArrivalTime: Temporal.Instant | null;
  readonly scheduledDepartureTime: Temporal.Instant;
  readonly knownRealtimeDepartureTime: Temporal.Instant | null;
  readonly picksUp: boolean;
  readonly dropsOff: boolean;
  readonly originalGtfsIdMetadata: StopGtfsIdMetadata;
  readonly updatedGtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;
};

export class GtfsUpdatedTripRegularMovement implements IGtfsUpdatedTripServicingMovement {
  readonly stopId: number;
  readonly originalPositionId: number | null;
  readonly updatedPositionId: number | null;
  readonly scheduledArrivalTime: Temporal.Instant;
  readonly knownRealtimeArrivalTime: Temporal.Instant | null;
  readonly scheduledDepartureTime: Temporal.Instant;
  readonly knownRealtimeDepartureTime: Temporal.Instant | null;
  readonly picksUp: boolean;
  readonly dropsOff: boolean;
  readonly originalGtfsIdMetadata: StopGtfsIdMetadata;
  readonly updatedGtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;

  constructor(fields: GtfsUpdatedTripRegularMovementFields) {
    this.stopId = fields.stopId;
    this.originalPositionId = fields.originalPositionId;
    this.updatedPositionId = fields.updatedPositionId;
    this.scheduledArrivalTime = fields.scheduledArrivalTime;
    this.knownRealtimeArrivalTime = fields.knownRealtimeArrivalTime;
    this.scheduledDepartureTime = fields.scheduledDepartureTime;
    this.knownRealtimeDepartureTime = fields.knownRealtimeDepartureTime;
    this.picksUp = fields.picksUp;
    this.dropsOff = fields.dropsOff;
    this.originalGtfsIdMetadata = fields.originalGtfsIdMetadata;
    this.updatedGtfsIdMetadata = fields.updatedGtfsIdMetadata;
    this.gtfsStopSequence = fields.gtfsStopSequence;
  }

  with(
    newValues: Partial<GtfsUpdatedTripRegularMovementFields>,
  ): GtfsUpdatedTripRegularMovement {
    return new GtfsUpdatedTripRegularMovement({ ...this, ...newValues });
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
    return this.knownRealtimeDepartureTime ?? this.scheduledDepartureTime;
  }
  get realtimeTimeRelevantToDeparturesAlgorithm() {
    return this.knownRealtimeDepartureTime;
  }
  get scheduledTimeRelevantToDeparturesAlgorithm() {
    return this.scheduledDepartureTime;
  }
}
