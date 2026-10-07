import type { ServiceTerminatingMovementFields } from "../../../corequery-types.js";
import type { StopGtfsIdMetadata } from "../../ids/stop-gtfs-id-metadata.js";
import type { IGtfsReplacedTripServicingMovement } from "./types.js";

export type GtfsReplacedTripTerminatingMovementFields = {
  readonly stopId: number;
  readonly positionId: number | null;

  readonly scheduledArrivalTime: Temporal.Instant;
  readonly knownRealtimeArrivalTime: Temporal.Instant | null;
  readonly assumedRealtimeArrivalTime: Temporal.Instant | null;

  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;
};

export class GtfsReplacedTripTerminatingMovement implements IGtfsReplacedTripServicingMovement {
  readonly stopId: number;
  readonly positionId: number | null;

  readonly scheduledArrivalTime: Temporal.Instant;
  readonly knownRealtimeArrivalTime: Temporal.Instant | null;
  readonly assumedRealtimeArrivalTime: Temporal.Instant | null;

  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;

  constructor(fields: GtfsReplacedTripTerminatingMovementFields) {
    this.stopId = fields.stopId;
    this.positionId = fields.positionId;

    this.scheduledArrivalTime = fields.scheduledArrivalTime;
    this.knownRealtimeArrivalTime = fields.knownRealtimeArrivalTime;
    this.assumedRealtimeArrivalTime = fields.assumedRealtimeArrivalTime;

    this.gtfsIdMetadata = fields.gtfsIdMetadata;
    this.gtfsStopSequence = fields.gtfsStopSequence;
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
      originalPositionId: this.positionId,
      currentPositionId: this.positionId,

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
        arrivalTime: this.scheduledArrivalTime,
        formerArrivalTime: null,
      };
    }
  }

  get effectiveArrivalTime() {
    return (
      this.knownRealtimeArrivalTime ??
      this.assumedRealtimeArrivalTime ??
      this.scheduledArrivalTime
    );
  }
}
