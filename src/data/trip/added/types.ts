import type { StopGtfsIdMetadata } from "../../ids/stop-gtfs-id-metadata.js";
import type { GtfsAddedTripOriginatingMovement } from "./gtfs-added-trip-originating-movement.js";
import type { GtfsAddedTripPassingMovement } from "./gtfs-added-trip-passing-movement.js";
import type { GtfsAddedTripRegularMovement } from "./gtfs-added-trip-regular-movement.js";
import type { GtfsAddedTripTerminatingMovement } from "./gtfs-added-trip-terminating-movement.js";

export type GtfsAddedTripMovement =
  | GtfsAddedTripOriginatingMovement
  | GtfsAddedTripRegularMovement
  | GtfsAddedTripTerminatingMovement
  | GtfsAddedTripPassingMovement;

export type GtfsAddedTripServicingMovement =
  | GtfsAddedTripOriginatingMovement
  | GtfsAddedTripRegularMovement
  | GtfsAddedTripTerminatingMovement;

export type IGtfsAddedTripMovement = {
  readonly stopId: number;

  get type(): string;
  get isServicing(): boolean;
  get isNonTerminal(): boolean;
};

export type IGtfsAddedTripServicingMovement = IGtfsAddedTripMovement & {
  readonly positionId: number | null;
  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;

  get isServicing(): true;
  get timeRelevantToDeparturesAlgorithm(): Temporal.Instant;
};
