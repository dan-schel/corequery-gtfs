import type { ServiceRegularMovementFields } from "../../../corequery-types.js";
import type { StopGtfsIdMetadata } from "../../ids/stop-gtfs-id-metadata.js";
import type { IGtfsAddedTripServicingMovement } from "./types.js";

export type GtfsAddedTripRegularMovementFields = {
  readonly stopId: number;
  readonly positionId: number | null;

  readonly scheduledArrivalTime: Temporal.Instant | null;
  readonly knownRealtimeArrivalTime: Temporal.Instant;

  readonly scheduledDepartureTime: Temporal.Instant | null;
  readonly knownRealtimeDepartureTime: Temporal.Instant;

  readonly picksUp: boolean;
  readonly dropsOff: boolean;

  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;
};

export class GtfsAddedTripRegularMovement implements IGtfsAddedTripServicingMovement {
  readonly stopId: number;
  readonly positionId: number | null;

  readonly scheduledArrivalTime: Temporal.Instant | null;
  readonly knownRealtimeArrivalTime: Temporal.Instant;

  readonly scheduledDepartureTime: Temporal.Instant | null;
  readonly knownRealtimeDepartureTime: Temporal.Instant;

  readonly picksUp: boolean;
  readonly dropsOff: boolean;

  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;

  constructor(fields: GtfsAddedTripRegularMovementFields) {
    this.stopId = fields.stopId;
    this.positionId = fields.positionId;
    this.scheduledArrivalTime = fields.scheduledArrivalTime;
    this.knownRealtimeArrivalTime = fields.knownRealtimeArrivalTime;
    this.scheduledDepartureTime = fields.scheduledDepartureTime;
    this.knownRealtimeDepartureTime = fields.knownRealtimeDepartureTime;
    this.picksUp = fields.picksUp;
    this.dropsOff = fields.dropsOff;
    this.gtfsIdMetadata = fields.gtfsIdMetadata;
    this.gtfsStopSequence = fields.gtfsStopSequence;
  }

  with(
    newValues: Partial<GtfsAddedTripRegularMovementFields>,
  ): GtfsAddedTripRegularMovement {
    return new GtfsAddedTripRegularMovement({ ...this, ...newValues });
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
    return this.knownRealtimeDepartureTime;
  }

  asCorequeryFields(): ServiceRegularMovementFields {
    return {
      stopId: this.stopId,
      originalPositionId: this.positionId,
      currentPositionId: this.positionId,

      arrivalTimeType: "provided-live-time",
      arrivalTime: this.knownRealtimeArrivalTime,
      formerArrivalTime: this.scheduledArrivalTime,

      departureTimeType: "provided-live-time",
      departureTime: this.knownRealtimeDepartureTime,
      formerDepartureTime: this.scheduledDepartureTime,

      picksUp: this.picksUp,
      dropsOff: this.dropsOff,
    };
  }
}
