import type { StopGtfsIdMetadata } from "../../ids/stop-gtfs-id-metadata.js";
import type { GtfsReplacedTripOriginatingMovement } from "./gtfs-replaced-trip-originating-movement.js";
import type { GtfsReplacedTripPassingMovement } from "./gtfs-replaced-trip-passing-movement.js";
import type { GtfsReplacedTripRegularMovement } from "./gtfs-replaced-trip-regular-movement.js";
import type { GtfsReplacedTripTerminatingMovement } from "./gtfs-replaced-trip-terminating-movement.js";

export type GtfsReplacedTripMovement =
  | GtfsReplacedTripOriginatingMovement
  | GtfsReplacedTripRegularMovement
  | GtfsReplacedTripTerminatingMovement
  | GtfsReplacedTripPassingMovement;

export type GtfsReplacedTripServicingMovement =
  | GtfsReplacedTripOriginatingMovement
  | GtfsReplacedTripRegularMovement
  | GtfsReplacedTripTerminatingMovement;

export type IGtfsReplacedTripMovement = {
  readonly stopId: number;

  get type(): string;
  get isServicing(): boolean;
  get isNonTerminal(): boolean;
};

export type IGtfsReplacedTripServicingMovement = IGtfsReplacedTripMovement & {
  readonly positionId: number | null;
  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;

  get isServicing(): true;
  get timeRelevantToDeparturesAlgorithm(): Temporal.Instant;
};
