import type { DeparturesIterationDirection } from "../corequery-types.js";
import type { GtfsScheduledTrip } from "../data/gtfs-scheduled-trip.js";
import type { GtfsUpdatedTrip } from "../data/gtfs-updated-trip.js";
import type { GtfsTripServicingMovement } from "../data/utils.js";

export class DeparturesIteratorResult {
  constructor(
    // TODO: Revisit which of these are actually being used. Consider that
    // additional `peek` methods, e.g. `peekPositionId`, might be added in
    // future for performance optimisation (just fetch the next service's
    // platform number without building a full corequery service object), so
    // removing things like `movement` is not necessarily a good idea.
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
