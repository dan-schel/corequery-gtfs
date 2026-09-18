import type { GtfsStopTime } from "../../gtfs-stop-time.js";
import type { StopGtfsIdMetadata } from "../../ids/stop-gtfs-id-metadata.js";
import type { GtfsScheduledTripOriginatingMovement } from "./gtfs-scheduled-trip-originating-movement.js";
import type { GtfsScheduledTripPassingMovement } from "./gtfs-scheduled-trip-passing-movement.js";
import type { GtfsScheduledTripRegularMovement } from "./gtfs-scheduled-trip-regular-movement.js";
import type { GtfsScheduledTripTerminatingMovement } from "./gtfs-scheduled-trip-terminating-movement.js";
import type { GtfsUpdatedTripMovement } from "../updated/types.js";

export type GtfsScheduledTripMovement =
  | GtfsScheduledTripOriginatingMovement
  | GtfsScheduledTripRegularMovement
  | GtfsScheduledTripTerminatingMovement
  | GtfsScheduledTripPassingMovement;

export type GtfsScheduledTripServicingMovement =
  | GtfsScheduledTripOriginatingMovement
  | GtfsScheduledTripRegularMovement
  | GtfsScheduledTripTerminatingMovement;

export type PromotionToUpdatedTripFields = {
  readonly arrivalTime: Temporal.Instant | null;
  readonly departureTime: Temporal.Instant | null;
  readonly updatedPositionId: number | null;
  readonly updatedGtfsIdMetadata: StopGtfsIdMetadata;
  readonly serviceDay: Temporal.PlainDate;
  readonly timezone: string;
};

export type IGtfsScheduledTripMovement = {
  readonly stopId: number;

  get type(): string;
  get isServicing(): boolean;
  get isNonTerminal(): boolean;

  asHollowUpdatedTripMovement(
    serviceDay: Temporal.PlainDate,
    timezone: string,
  ): GtfsUpdatedTripMovement;

  asDelayedUpdatedTripMovement(
    serviceDay: Temporal.PlainDate,
    timezone: string,
    delayMins: number,
  ): GtfsUpdatedTripMovement;
};

export type IGtfsScheduledTripServicingMovement = IGtfsScheduledTripMovement & {
  readonly positionId: number | null;
  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;

  get isServicing(): true;
  get timeRelevantToDeparturesAlgorithm(): GtfsStopTime;

  asUpdatedTripMovement(
    values: PromotionToUpdatedTripFields,
  ): GtfsUpdatedTripMovement;
};
