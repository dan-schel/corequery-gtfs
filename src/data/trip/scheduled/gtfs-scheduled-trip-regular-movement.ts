import type { ServiceRegularMovementFields } from "../../../corequery-types.js";
import type { GtfsStopTime } from "../../gtfs-stop-time.js";
import type { StopGtfsIdMetadata } from "../../ids/stop-gtfs-id-metadata.js";
import { GtfsUpdatedTripRegularMovement } from "../updated/gtfs-updated-trip-regular-movement.js";
import type {
  IGtfsScheduledTripServicingMovement,
  PromotionToUpdatedTripFields,
} from "./types.js";

export type GtfsScheduledTripRegularMovementFields = {
  readonly stopId: number;
  readonly positionId: number | null;
  readonly arrivalTime: GtfsStopTime;
  readonly departureTime: GtfsStopTime;
  readonly picksUp: boolean;
  readonly dropsOff: boolean;
  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;
};

export class GtfsScheduledTripRegularMovement implements IGtfsScheduledTripServicingMovement {
  readonly stopId: number;
  readonly positionId: number | null;
  readonly arrivalTime: GtfsStopTime;
  readonly departureTime: GtfsStopTime;
  readonly picksUp: boolean;
  readonly dropsOff: boolean;
  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;

  constructor(fields: GtfsScheduledTripRegularMovementFields) {
    this.stopId = fields.stopId;
    this.positionId = fields.positionId;
    this.arrivalTime = fields.arrivalTime;
    this.departureTime = fields.departureTime;
    this.picksUp = fields.picksUp;
    this.dropsOff = fields.dropsOff;
    this.gtfsIdMetadata = fields.gtfsIdMetadata;
    this.gtfsStopSequence = fields.gtfsStopSequence;
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

  with(
    newValues: Partial<GtfsScheduledTripRegularMovementFields>,
  ): GtfsScheduledTripRegularMovement {
    return new GtfsScheduledTripRegularMovement({ ...this, ...newValues });
  }

  asHollowUpdatedTripMovement(
    serviceDay: Temporal.PlainDate,
    timezone: string,
  ): GtfsUpdatedTripRegularMovement {
    return new GtfsUpdatedTripRegularMovement({
      stopId: this.stopId,
      originalPositionId: this.positionId,
      scheduledArrivalTime: this.arrivalTime.toInstant(serviceDay, timezone),
      scheduledDepartureTime: this.departureTime.toInstant(
        serviceDay,
        timezone,
      ),
      picksUp: this.picksUp,
      dropsOff: this.dropsOff,
      originalGtfsIdMetadata: this.gtfsIdMetadata,
      gtfsStopSequence: this.gtfsStopSequence,

      knownRealtimeArrivalTime: null,
      knownRealtimeDepartureTime: null,
      updatedPositionId: this.positionId,
      updatedGtfsIdMetadata: this.gtfsIdMetadata,
    });
  }

  asUpdatedTripMovement(
    values: PromotionToUpdatedTripFields,
  ): GtfsUpdatedTripRegularMovement {
    return new GtfsUpdatedTripRegularMovement({
      stopId: this.stopId,
      originalPositionId: this.positionId,
      scheduledArrivalTime: this.arrivalTime.toInstant(
        values.serviceDay,
        values.timezone,
      ),
      scheduledDepartureTime: this.departureTime.toInstant(
        values.serviceDay,
        values.timezone,
      ),
      picksUp: this.picksUp,
      dropsOff: this.dropsOff,
      originalGtfsIdMetadata: this.gtfsIdMetadata,
      gtfsStopSequence: this.gtfsStopSequence,

      knownRealtimeArrivalTime: values.arrivalTime,
      knownRealtimeDepartureTime: values.departureTime,
      updatedPositionId: values.updatedPositionId,
      updatedGtfsIdMetadata: values.updatedGtfsIdMetadata,
    });
  }

  asDelayedUpdatedTripMovement(
    serviceDay: Temporal.PlainDate,
    timezone: string,
    delayMins: number,
  ): GtfsUpdatedTripRegularMovement {
    return this.asHollowUpdatedTripMovement(serviceDay, timezone).with({
      knownRealtimeArrivalTime: this.arrivalTime
        .toInstant(serviceDay, timezone)
        .add({ minutes: delayMins }),
      knownRealtimeDepartureTime: this.departureTime
        .toInstant(serviceDay, timezone)
        .add({ minutes: delayMins }),
    });
  }

  asCorequeryFields(
    serviceDay: Temporal.PlainDate,
    timezone: string,
  ): ServiceRegularMovementFields {
    return {
      stopId: this.stopId,
      originalPositionId: this.positionId,
      updatedPositionId: null,

      arrivalTimeType: "scheduled-time",
      arrivalTime: this.arrivalTime.toInstant(serviceDay, timezone),
      formerArrivalTime: null,

      departureTimeType: "scheduled-time",
      departureTime: this.departureTime.toInstant(serviceDay, timezone),
      formerDepartureTime: null,

      picksUp: this.picksUp,
      dropsOff: this.dropsOff,
    };
  }
}
