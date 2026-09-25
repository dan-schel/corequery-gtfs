import type { GtfsAddedTrip } from "./added/gtfs-added-trip.js";
import type {
  GtfsAddedTripMovement,
  GtfsAddedTripServicingMovement,
} from "./added/types.js";
import type { GtfsReplacedTrip } from "./replaced/gtfs-replaced-trip.js";
import type {
  GtfsReplacedTripMovement,
  GtfsReplacedTripServicingMovement,
} from "./replaced/types.js";
import type { GtfsScheduledTrip } from "./scheduled/gtfs-scheduled-trip.js";
import type { GtfsScheduledTripServicingMovement } from "./scheduled/types.js";
import type { GtfsUpdatedTrip } from "./updated/gtfs-updated-trip.js";
import type {
  GtfsUpdatedTripMovement,
  GtfsUpdatedTripServicingMovement,
} from "./updated/types.js";

export type GtfsTrip = GtfsScheduledTrip | GtfsRealtimeTrip;

// There's three realtime trip types, what's the difference?
//
// - Updated trip: A trip which overrides a scheduled trip (for one service
//   day), and has the same movements as the scheduled trip it overrides. It can
//   supply updated arrival/departure times, supply updated position IDs (within
//   the same stop), and/or cancel the trip.
//
// - Replaced trip: A trip which overrides a scheduled trip (for one service
//   day), but where the movements are completely independent of the scheduled
//   trip. This means replaced trips do not even necessarily need to be on the
//   same line(s) as the scheduled trip it overrides, nor does it need to have
//   the same service tags, etc.
//
// - Added trip: An entirely new trip which isn't part of the schedule. It must
//   have a unique trip ID to any scheduled trips.
export type GtfsRealtimeTrip =
  GtfsUpdatedTrip | GtfsAddedTrip | GtfsReplacedTrip;

export type GtfsTripServicingMovement =
  | GtfsScheduledTripServicingMovement
  | GtfsUpdatedTripServicingMovement
  | GtfsAddedTripServicingMovement
  | GtfsReplacedTripServicingMovement;

export type GtfsRealtimeTripServicingMovement =
  | GtfsUpdatedTripServicingMovement
  | GtfsAddedTripServicingMovement
  | GtfsReplacedTripServicingMovement;

export type GtfsRealtimeTripMovement =
  GtfsUpdatedTripMovement | GtfsAddedTripMovement | GtfsReplacedTripMovement;
