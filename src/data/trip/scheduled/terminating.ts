import type { GtfsStopTime } from "../../gtfs-stop-time.js";
import type { StopGtfsIdMetadata } from "../../ids/stop-gtfs-id-metadata.js";
import { GtfsUpdatedTripTerminatingMovement } from "../updated/terminating.js";
import type {
  IGtfsScheduledTripServicingMovement,
  PromotionToUpdatedTripFields,
} from "./types.js";

export type GtfsScheduledTripTerminatingMovementFields = {
  readonly stopId: number;
  readonly positionId: number | null;
  readonly arrivalTime: GtfsStopTime;
  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;
};

export class GtfsScheduledTripTerminatingMovement implements IGtfsScheduledTripServicingMovement {
  readonly stopId: number;
  readonly positionId: number | null;
  readonly arrivalTime: GtfsStopTime;
  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;

  constructor(fields: GtfsScheduledTripTerminatingMovementFields) {
    this.stopId = fields.stopId;
    this.positionId = fields.positionId;
    this.arrivalTime = fields.arrivalTime;
    this.gtfsIdMetadata = fields.gtfsIdMetadata;
    this.gtfsStopSequence = fields.gtfsStopSequence;
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

  with(
    newValues: Partial<GtfsScheduledTripTerminatingMovementFields>,
  ): GtfsScheduledTripTerminatingMovement {
    return new GtfsScheduledTripTerminatingMovement({ ...this, ...newValues });
  }

  asHollowUpdatedTripMovement(
    serviceDay: Temporal.PlainDate,
    timezone: string,
  ): GtfsUpdatedTripTerminatingMovement {
    return new GtfsUpdatedTripTerminatingMovement({
      stopId: this.stopId,
      originalPositionId: this.positionId,
      scheduledArrivalTime: this.arrivalTime.toInstant(serviceDay, timezone),
      originalGtfsIdMetadata: this.gtfsIdMetadata,
      gtfsStopSequence: this.gtfsStopSequence,

      knownRealtimeArrivalTime: null,
      updatedPositionId: this.positionId,
      updatedGtfsIdMetadata: this.gtfsIdMetadata,
    });
  }

  asUpdatedTripMovement(
    values: PromotionToUpdatedTripFields,
  ): GtfsUpdatedTripTerminatingMovement {
    return new GtfsUpdatedTripTerminatingMovement({
      stopId: this.stopId,
      originalPositionId: this.positionId,
      scheduledArrivalTime: this.arrivalTime.toInstant(
        values.serviceDay,
        values.timezone,
      ),
      originalGtfsIdMetadata: this.gtfsIdMetadata,
      gtfsStopSequence: this.gtfsStopSequence,

      knownRealtimeArrivalTime: values.arrivalTime,
      updatedPositionId: values.updatedPositionId,
      updatedGtfsIdMetadata: values.updatedGtfsIdMetadata,
    });
  }

  asDelayedUpdatedTripMovement(
    serviceDay: Temporal.PlainDate,
    timezone: string,
    delayMins: number,
  ): GtfsUpdatedTripTerminatingMovement {
    return this.asHollowUpdatedTripMovement(serviceDay, timezone).with({
      knownRealtimeArrivalTime: this.arrivalTime
        .toInstant(serviceDay, timezone)
        .add({ minutes: delayMins }),
    });
  }
}
