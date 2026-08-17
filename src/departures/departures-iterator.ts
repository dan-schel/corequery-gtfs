import type { GtfsScheduledTrip } from "../data/gtfs-scheduled-trip.js";
import type { GtfsUpdatedTrip } from "../data/gtfs-updated-trip.js";
import type { GtfsTripServicingMovement } from "../data/utils.js";

export type DeparturesSearchDirection = "forwards" | "backwards";

export class DeparturesIteratorResult {
  constructor(
    readonly trip: GtfsScheduledTrip | GtfsUpdatedTrip,
    readonly serviceDay: Temporal.PlainDate,
    readonly instant: Temporal.Instant,
    readonly movement: GtfsTripServicingMovement,
  ) {}
}

export abstract class DeparturesIterator {
  abstract set(
    instant: Temporal.Instant,
    direction: DeparturesSearchDirection,
  ): void;

  abstract peek(): DeparturesIteratorResult | null;

  abstract take(): DeparturesIteratorResult;
}
