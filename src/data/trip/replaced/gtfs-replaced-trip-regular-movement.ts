import type { ServiceRegularMovementFields } from "../../../corequery-types.js";
import type { StopGtfsIdMetadata } from "../../ids/stop-gtfs-id-metadata.js";
import type { IGtfsReplacedTripServicingMovement } from "./types.js";

export type GtfsReplacedTripRegularMovementFields = {
  readonly stopId: number;
  readonly positionId: number | null;
  readonly arrivalTime: Temporal.Instant;
  readonly departureTime: Temporal.Instant;
  readonly picksUp: boolean;
  readonly dropsOff: boolean;
  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;
};

export class GtfsReplacedTripRegularMovement implements IGtfsReplacedTripServicingMovement {
  readonly stopId: number;
  readonly positionId: number | null;
  readonly arrivalTime: Temporal.Instant;
  readonly departureTime: Temporal.Instant;
  readonly picksUp: boolean;
  readonly dropsOff: boolean;
  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;

  constructor(fields: GtfsReplacedTripRegularMovementFields) {
    this.stopId = fields.stopId;
    this.positionId = fields.positionId;
    this.arrivalTime = fields.arrivalTime;
    this.departureTime = fields.departureTime;
    this.picksUp = fields.picksUp;
    this.dropsOff = fields.dropsOff;
    this.gtfsIdMetadata = fields.gtfsIdMetadata;
    this.gtfsStopSequence = fields.gtfsStopSequence;
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
    return this.departureTime;
  }

  asCorequeryFields(): ServiceRegularMovementFields {
    return {
      stopId: this.stopId,
      originalPositionId: this.positionId,
      updatedPositionId: this.positionId,

      arrivalTimeType: "provided-live-time",
      arrivalTime: this.arrivalTime,
      formerArrivalTime: null,

      departureTimeType: "provided-live-time",
      departureTime: this.departureTime,
      formerDepartureTime: null,

      picksUp: this.picksUp,
      dropsOff: this.dropsOff,
    };
  }
}
