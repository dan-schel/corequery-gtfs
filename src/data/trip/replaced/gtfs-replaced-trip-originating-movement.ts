import type { ServiceOriginatingMovementFields } from "../../../corequery-types.js";
import type { StopGtfsIdMetadata } from "../../ids/stop-gtfs-id-metadata.js";
import type { IGtfsReplacedTripServicingMovement } from "./types.js";

export type GtfsReplacedTripOriginatingMovementFields = {
  readonly stopId: number;
  readonly positionId: number | null;
  readonly departureTime: Temporal.Instant;
  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;
};

export class GtfsReplacedTripOriginatingMovement implements IGtfsReplacedTripServicingMovement {
  readonly stopId: number;
  readonly positionId: number | null;
  readonly departureTime: Temporal.Instant;
  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;

  constructor(fields: GtfsReplacedTripOriginatingMovementFields) {
    this.stopId = fields.stopId;
    this.positionId = fields.positionId;
    this.departureTime = fields.departureTime;
    this.gtfsIdMetadata = fields.gtfsIdMetadata;
    this.gtfsStopSequence = fields.gtfsStopSequence;
  }

  with(
    newValues: Partial<GtfsReplacedTripOriginatingMovementFields>,
  ): GtfsReplacedTripOriginatingMovement {
    return new GtfsReplacedTripOriginatingMovement({ ...this, ...newValues });
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
    return this.departureTime;
  }

  asCorequeryFields(): ServiceOriginatingMovementFields {
    return {
      stopId: this.stopId,
      originalPositionId: this.positionId,
      updatedPositionId: this.positionId,

      departureTimeType: "provided-live-time",
      departureTime: this.departureTime,
      formerDepartureTime: null,
    };
  }
}
