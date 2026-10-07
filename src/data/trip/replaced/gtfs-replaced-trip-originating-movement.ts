import type { ServiceOriginatingMovementFields } from "../../../corequery-types.js";
import type { StopGtfsIdMetadata } from "../../ids/stop-gtfs-id-metadata.js";
import type { IGtfsReplacedTripServicingMovement } from "./types.js";

export type GtfsReplacedTripOriginatingMovementFields = {
  readonly stopId: number;
  readonly originalPositionId: number | null;
  readonly currentPositionId: number | null;

  readonly scheduledDepartureTime: Temporal.Instant | null;
  readonly knownRealtimeDepartureTime: Temporal.Instant | null;
  readonly assumedRealtimeDepartureTime: Temporal.Instant | null;

  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;
};

export class GtfsReplacedTripOriginatingMovement implements IGtfsReplacedTripServicingMovement {
  readonly stopId: number;
  readonly originalPositionId: number | null;
  readonly currentPositionId: number | null;

  readonly scheduledDepartureTime: Temporal.Instant | null;
  readonly knownRealtimeDepartureTime: Temporal.Instant | null;
  readonly assumedRealtimeDepartureTime: Temporal.Instant | null;
  readonly effectiveDepartureTime: Temporal.Instant;

  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;

  constructor(fields: GtfsReplacedTripOriginatingMovementFields) {
    this.stopId = fields.stopId;
    this.originalPositionId = fields.originalPositionId;
    this.currentPositionId = fields.currentPositionId;

    this.scheduledDepartureTime = fields.scheduledDepartureTime;
    this.knownRealtimeDepartureTime = fields.knownRealtimeDepartureTime;
    this.assumedRealtimeDepartureTime = fields.assumedRealtimeDepartureTime;

    this.gtfsIdMetadata = fields.gtfsIdMetadata;
    this.gtfsStopSequence = fields.gtfsStopSequence;

    const effectiveDepartureTime =
      this.knownRealtimeDepartureTime ??
      this.assumedRealtimeDepartureTime ??
      this.scheduledDepartureTime;
    if (effectiveDepartureTime == null) throw new Error("No departure time.");
    this.effectiveDepartureTime = effectiveDepartureTime;
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
    return this.effectiveDepartureTime;
  }

  asCorequeryFields(): ServiceOriginatingMovementFields {
    return {
      stopId: this.stopId,
      originalPositionId: this.originalPositionId,
      currentPositionId: this.currentPositionId,

      ...this._departureTimeCorequeryFields,
    };
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
