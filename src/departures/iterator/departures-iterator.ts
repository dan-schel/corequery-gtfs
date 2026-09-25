import type { DeparturesIterationDirection } from "../../corequery-types.js";
import type {
  GtfsTrip,
  GtfsTripServicingMovement,
} from "../../data/trip/types.js";

export class DeparturesIteratorResult {
  constructor(
    readonly trip: GtfsTrip,
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
