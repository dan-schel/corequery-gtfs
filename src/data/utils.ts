import type { GtfsScheduledTripServicingMovement } from "./trip/scheduled/types.js";
import type { GtfsUpdatedTripServicingMovement } from "./trip/updated/types.js";

export type GtfsTripServicingMovement =
  GtfsScheduledTripServicingMovement | GtfsUpdatedTripServicingMovement;
