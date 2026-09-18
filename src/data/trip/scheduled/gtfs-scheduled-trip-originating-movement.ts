import type { GtfsStopTime } from "../../gtfs-stop-time.js";
import type { StopGtfsIdMetadata } from "../../ids/stop-gtfs-id-metadata.js";
import { GtfsUpdatedTripOriginatingMovement } from "../updated/gtfs-updated-trip-originating-movement.js";
import type {
  IGtfsScheduledTripServicingMovement,
  PromotionToUpdatedTripFields,
} from "./types.js";

export type GtfsScheduledTripOriginatingMovementFields = {
  readonly stopId: number;
  readonly positionId: number | null;
  readonly departureTime: GtfsStopTime;
  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;
};

export class GtfsScheduledTripOriginatingMovement implements IGtfsScheduledTripServicingMovement {
  readonly stopId: number;
  readonly positionId: number | null;
  readonly departureTime: GtfsStopTime;
  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;

  constructor(fields: GtfsScheduledTripOriginatingMovementFields) {
    this.stopId = fields.stopId;
    this.positionId = fields.positionId;
    this.departureTime = fields.departureTime;
    this.gtfsIdMetadata = fields.gtfsIdMetadata;
    this.gtfsStopSequence = fields.gtfsStopSequence;
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

  with(
    newValues: Partial<GtfsScheduledTripOriginatingMovementFields>,
  ): GtfsScheduledTripOriginatingMovement {
    return new GtfsScheduledTripOriginatingMovement({ ...this, ...newValues });
  }

  asHollowUpdatedTripMovement(
    serviceDay: Temporal.PlainDate,
    timezone: string,
  ): GtfsUpdatedTripOriginatingMovement {
    return new GtfsUpdatedTripOriginatingMovement({
      stopId: this.stopId,
      originalPositionId: this.positionId,
      scheduledDepartureTime: this.departureTime.toInstant(
        serviceDay,
        timezone,
      ),
      originalGtfsIdMetadata: this.gtfsIdMetadata,
      gtfsStopSequence: this.gtfsStopSequence,

      knownRealtimeDepartureTime: null,
      updatedPositionId: this.positionId,
      updatedGtfsIdMetadata: this.gtfsIdMetadata,
    });
  }

  asUpdatedTripMovement(
    values: PromotionToUpdatedTripFields,
  ): GtfsUpdatedTripOriginatingMovement {
    return new GtfsUpdatedTripOriginatingMovement({
      stopId: this.stopId,
      originalPositionId: this.positionId,
      scheduledDepartureTime: this.departureTime.toInstant(
        values.serviceDay,
        values.timezone,
      ),
      originalGtfsIdMetadata: this.gtfsIdMetadata,
      gtfsStopSequence: this.gtfsStopSequence,

      knownRealtimeDepartureTime: values.departureTime,
      updatedPositionId: values.updatedPositionId,
      updatedGtfsIdMetadata: values.updatedGtfsIdMetadata,
    });
  }

  asDelayedUpdatedTripMovement(
    serviceDay: Temporal.PlainDate,
    timezone: string,
    delayMins: number,
  ): GtfsUpdatedTripOriginatingMovement {
    return this.asHollowUpdatedTripMovement(serviceDay, timezone).with({
      knownRealtimeDepartureTime: this.departureTime
        .toInstant(serviceDay, timezone)
        .add({ minutes: delayMins }),
    });
  }
}
