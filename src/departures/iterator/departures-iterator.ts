import type { DeparturesIterationDirection } from "../../corequery-types.js";
import type { GtfsScheduledTrip } from "../../data/trip/scheduled/gtfs-scheduled-trip.js";
import type { GtfsUpdatedTrip } from "../../data/trip/updated/gtfs-updated-trip.js";
import type { GtfsTripServicingMovement } from "../../data/trip/utils.js";

export class DeparturesIteratorResult {
  constructor(
    readonly trip: GtfsScheduledTrip | GtfsUpdatedTrip,
    readonly serviceDay: Temporal.PlainDate,
    readonly instant: Temporal.Instant,
    readonly movement: GtfsTripServicingMovement,
    readonly movementIndex: number,
  ) {}
}

export abstract class DeparturesIterator {
  abstract set(
    instant: Temporal.Instant,
    direction: DeparturesIterationDirection,
  ): void;

  abstract peek(): DeparturesIteratorResult | null;

  abstract take(): DeparturesIteratorResult;
}
