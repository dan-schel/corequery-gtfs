import { BoundedInstantRange } from "../data/bounded-instant-range.js";

export abstract class DeparturesBlock {
  constructor(
    readonly earliestDepartureInstant: Temporal.Instant,
    readonly latestDepartureInstant: Temporal.Instant,
  ) {}

  get instantRange(): BoundedInstantRange {
    return new BoundedInstantRange(
      this.earliestDepartureInstant,
      this.latestDepartureInstant,
    );
  }

  /**
   * Returns the index of the first movement that is at or after the given
   * instant. If all movements come before the given instant, returns the length
   * of the movements array, i.e. the index _after_ all movements.
   */
  abstract getIterationIndexOfNextFrom(instant: Temporal.Instant): number;

  /**
   * Returns the index of the last movement that is at or before the given
   * instant. If all movements come after the given instant, returns -1, i.e.
   * the index _before_ all movements.
   */
  abstract getIterationIndexOfPreviousFrom(instant: Temporal.Instant): number;
}
