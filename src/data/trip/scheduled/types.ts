import type { GtfsStopTime } from "../../gtfs-stop-time.js";
import type { StopGtfsIdMetadata } from "../../ids/stop-gtfs-id-metadata.js";
import type { GtfsScheduledTripOriginatingMovement } from "./originating.js";
import type { GtfsScheduledTripPassingMovement } from "./passing.js";
import type { GtfsScheduledTripRegularMovement } from "./regular.js";
import type { GtfsScheduledTripTerminatingMovement } from "./terminating.js";
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
