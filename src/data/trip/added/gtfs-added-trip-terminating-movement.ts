import type { ServiceTerminatingMovementFields } from "../../../corequery-types.js";
import type { StopGtfsIdMetadata } from "../../ids/stop-gtfs-id-metadata.js";
import type { IGtfsAddedTripServicingMovement } from "./types.js";

export type GtfsAddedTripTerminatingMovementFields = {
  readonly stopId: number;
  readonly positionId: number | null;
  readonly arrivalTime: Temporal.Instant;
  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;
};

export class GtfsAddedTripTerminatingMovement implements IGtfsAddedTripServicingMovement {
  readonly stopId: number;
  readonly positionId: number | null;
  readonly arrivalTime: Temporal.Instant;
  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;

  constructor(fields: GtfsAddedTripTerminatingMovementFields) {
    this.stopId = fields.stopId;
    this.positionId = fields.positionId;
    this.arrivalTime = fields.arrivalTime;
    this.gtfsIdMetadata = fields.gtfsIdMetadata;
    this.gtfsStopSequence = fields.gtfsStopSequence;
  }

  with(
    newValues: Partial<GtfsAddedTripTerminatingMovementFields>,
  ): GtfsAddedTripTerminatingMovement {
    return new GtfsAddedTripTerminatingMovement({ ...this, ...newValues });
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
    return this.arrivalTime;
  }

  asCorequeryFields(): ServiceTerminatingMovementFields {
    return {
      stopId: this.stopId,
      originalPositionId: this.positionId,
      updatedPositionId: this.positionId,

      arrivalTimeType: "provided-live-time",
      arrivalTime: this.arrivalTime,
      formerArrivalTime: null,
    };
  }
}
