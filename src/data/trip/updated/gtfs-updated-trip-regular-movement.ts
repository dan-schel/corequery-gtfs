import type { ServiceRegularMovementFields } from "../../../corequery-types.js";
import type { StopGtfsIdMetadata } from "../../ids/stop-gtfs-id-metadata.js";
import { GtfsReplacedTripOriginatingMovement } from "../replaced/gtfs-replaced-trip-originating-movement.js";
import { GtfsReplacedTripRegularMovement } from "../replaced/gtfs-replaced-trip-regular-movement.js";
import { GtfsReplacedTripTerminatingMovement } from "../replaced/gtfs-replaced-trip-terminating-movement.js";
import type { IGtfsUpdatedTripServicingMovement } from "./types.js";

export type GtfsUpdatedTripRegularMovementFields = {
  readonly stopId: number;
  readonly originalPositionId: number | null;
  readonly updatedPositionId: number | null;

  readonly scheduledArrivalTime: Temporal.Instant;
  readonly knownRealtimeArrivalTime: Temporal.Instant | null;
  readonly assumedRealtimeArrivalTime: Temporal.Instant | null;

  readonly scheduledDepartureTime: Temporal.Instant;
  readonly knownRealtimeDepartureTime: Temporal.Instant | null;
  readonly assumedRealtimeDepartureTime: Temporal.Instant | null;

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
  readonly assumedRealtimeArrivalTime: Temporal.Instant | null;

  readonly scheduledDepartureTime: Temporal.Instant;
  readonly knownRealtimeDepartureTime: Temporal.Instant | null;
  readonly assumedRealtimeDepartureTime: Temporal.Instant | null;

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
    this.assumedRealtimeArrivalTime = fields.assumedRealtimeArrivalTime;
    this.scheduledDepartureTime = fields.scheduledDepartureTime;
    this.knownRealtimeDepartureTime = fields.knownRealtimeDepartureTime;
    this.assumedRealtimeDepartureTime = fields.assumedRealtimeDepartureTime;
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
    return this.effectiveDepartureTime;
  }

  asCorequeryFields(): ServiceRegularMovementFields {
    return {
      stopId: this.stopId,
      originalPositionId: this.originalPositionId,
      updatedPositionId: this.updatedPositionId,

      ...this._arrivalTimeCorequeryFields,
      ...this._departureTimeCorequeryFields,

      picksUp: this.picksUp,
      dropsOff: this.dropsOff,
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
        departureTime: this.scheduledDepartureTime,
        formerDepartureTime: null,
      };
    }
  }

  get effectiveDepartureTime() {
    return (
      this.knownRealtimeDepartureTime ??
      this.assumedRealtimeDepartureTime ??
      this.scheduledDepartureTime
    );
  }

  get effectiveArrivalTime() {
    return (
      this.knownRealtimeArrivalTime ??
      this.assumedRealtimeArrivalTime ??
      this.scheduledArrivalTime
    );
  }

  get effectiveTimes() {
    return [this.effectiveArrivalTime, this.effectiveDepartureTime];
  }

  get knownRealtimeDelay(): Temporal.Duration | null {
    if (this.knownRealtimeDepartureTime != null) {
      return this.knownRealtimeDepartureTime.since(this.scheduledDepartureTime);
    } else if (this.knownRealtimeArrivalTime != null) {
      return this.knownRealtimeArrivalTime.since(this.scheduledArrivalTime);
    } else {
      return null;
    }
  }

  asReplacedTripOriginatingMovement(): GtfsReplacedTripOriginatingMovement {
    return new GtfsReplacedTripOriginatingMovement({
      stopId: this.stopId,
      positionId: this.updatedPositionId,
      departureTime: this.effectiveDepartureTime,
      gtfsIdMetadata: this.updatedGtfsIdMetadata,
      gtfsStopSequence: this.gtfsStopSequence,
    });
  }

  asReplacedTripRegularMovement(): GtfsReplacedTripRegularMovement {
    return new GtfsReplacedTripRegularMovement({
      stopId: this.stopId,
      positionId: this.updatedPositionId,
      arrivalTime: this.effectiveArrivalTime,
      departureTime: this.effectiveDepartureTime,
      picksUp: this.picksUp,
      dropsOff: this.dropsOff,
      gtfsIdMetadata: this.updatedGtfsIdMetadata,
      gtfsStopSequence: this.gtfsStopSequence,
    });
  }

  asReplacedTripTerminatingMovement(): GtfsReplacedTripTerminatingMovement {
    return new GtfsReplacedTripTerminatingMovement({
      stopId: this.stopId,
      positionId: this.updatedPositionId,
      arrivalTime: this.effectiveArrivalTime,
      gtfsIdMetadata: this.updatedGtfsIdMetadata,
      gtfsStopSequence: this.gtfsStopSequence,
    });
  }
}
