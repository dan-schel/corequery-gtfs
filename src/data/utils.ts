import type { GtfsScheduledTripServicingMovement } from "./trip/scheduled/gtfs-scheduled-trip-movements.js";
import type { GtfsUpdatedTripServicingMovement } from "./trip/updated/gtfs-updated-trip-movements.js";

export type GtfsTripServicingMovement =
  GtfsScheduledTripServicingMovement | GtfsUpdatedTripServicingMovement;
