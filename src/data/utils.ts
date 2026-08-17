import type { GtfsScheduledTripServicingMovement } from "./gtfs-scheduled-trip-movements.js";
import type { GtfsUpdatedTripServicingMovement } from "./gtfs-updated-trip-movements.js";

export type GtfsTripServicingMovement =
  | GtfsScheduledTripServicingMovement
  | GtfsUpdatedTripServicingMovement;
