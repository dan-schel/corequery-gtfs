import type { StopGtfsIdMetadata } from "../../ids/stop-gtfs-id-metadata.js";
import type { GtfsUpdatedTripOriginatingMovement } from "./gtfs-updated-trip-originating-movement.js";
import type { GtfsUpdatedTripPassingMovement } from "./gtfs-updated-trip-passing-movement.js";
import type { GtfsUpdatedTripRegularMovement } from "./gtfs-updated-trip-regular-movement.js";
import type { GtfsUpdatedTripTerminatingMovement } from "./gtfs-updated-trip-terminating-movement.js";

export type GtfsUpdatedTripMovement =
  | GtfsUpdatedTripOriginatingMovement
  | GtfsUpdatedTripRegularMovement
  | GtfsUpdatedTripTerminatingMovement
  | GtfsUpdatedTripPassingMovement;

export type GtfsUpdatedTripServicingMovement =
  | GtfsUpdatedTripOriginatingMovement
  | GtfsUpdatedTripRegularMovement
  | GtfsUpdatedTripTerminatingMovement;

export type IGtfsUpdatedTripMovement = {
  readonly stopId: number;

  get type(): string;
  get isServicing(): boolean;
  get isNonTerminal(): boolean;
};

export type IGtfsUpdatedTripServicingMovement = IGtfsUpdatedTripMovement & {
  readonly originalPositionId: number | null;
  readonly updatedPositionId: number | null;
  readonly originalGtfsIdMetadata: StopGtfsIdMetadata;
  readonly updatedGtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;

  get isServicing(): true;
  get timeRelevantToDeparturesAlgorithm(): Temporal.Instant;
  get realtimeTimeRelevantToDeparturesAlgorithm(): Temporal.Instant | null;
  get scheduledTimeRelevantToDeparturesAlgorithm(): Temporal.Instant;
};
