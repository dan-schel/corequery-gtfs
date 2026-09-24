import type { GtfsScheduledTripServicingMovement } from "./scheduled/types.js";
import type { GtfsUpdatedTripServicingMovement } from "./updated/types.js";

export type GtfsTripServicingMovement =
  GtfsScheduledTripServicingMovement | GtfsUpdatedTripServicingMovement;
