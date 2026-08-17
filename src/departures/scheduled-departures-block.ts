import { itsOk } from "@dan-schel/js-utils";
import { DeparturesBlock } from "./departures-block.js";
import { GtfsStopTime } from "../data/gtfs-stop-time.js";
import type { GtfsScheduledMovementsIndexEntry } from "./gtfs-scheduled-movements-index.js";

export class ScheduledDeparturesBlock extends DeparturesBlock {
  constructor(
    // Note that we pass ALL movements for this stop into the block, not just
    // ones which occur on this service day. That filtering is done at the
    // `ScheduledDeparturesBlockIterator` level instead (by skipping over
    // values when we reach them in the iteration), and that way we avoid
    // doing a bunch of computation upfront for each movement at the stop here
    // (for the whole day), which might be useless if we're at a big stop like
    // Southern Cross with thousands of movements and we end up only iterating
    // through of them.
    readonly allMovementsAtStop: readonly GtfsScheduledMovementsIndexEntry[],

    readonly serviceDay: Temporal.PlainDate,
    earliestDepartureInstant: Temporal.Instant,
    latestDepartureInstant: Temporal.Instant,
    readonly timezone: string,
  ) {
    super(earliestDepartureInstant, latestDepartureInstant);
  }

  static build(
    movements: readonly GtfsScheduledMovementsIndexEntry[],
    serviceDay: Temporal.PlainDate,
    timezone: string,
  ) {
    if (movements.length === 0) throw new Error("Movements cannot be empty");

    const firstEntry = itsOk(movements[0]);
    const lastEntry = itsOk(movements[movements.length - 1]);

    return new ScheduledDeparturesBlock(
      movements,
      serviceDay,
      firstEntry.time.toInstant(serviceDay, timezone),
      lastEntry.time.toInstant(serviceDay, timezone),
      timezone,
    );
  }

  /**
   * Returns the GtfsStopTime for the given instant, relative to the service day
   * (and for the timezone) of this block.
   */
  toGtfsStopTime(time: Temporal.Instant): GtfsStopTime {
    const midnight = GtfsStopTime.fromSecondsSinceMidnight(0);
    const midnightInstant = midnight.toInstant(this.serviceDay, this.timezone);
    const secondsSinceMidnight = time.since(midnightInstant).total("seconds");
    return GtfsStopTime.fromSecondsSinceMidnight(secondsSinceMidnight);
  }

  override getIterationIndexOfNextFrom(instant: Temporal.Instant): number {
    const time = this.toGtfsStopTime(instant);

    const result = this.allMovementsAtStop.findIndex((m) =>
      m.time.isAfterOrEqual(time),
    );

    return result !== -1 ? result : this.allMovementsAtStop.length;
  }

  override getIterationIndexOfPreviousFrom(instant: Temporal.Instant): number {
    const time = this.toGtfsStopTime(instant);

    // No need to handle -1, because we'd want to return -1 in that case anyway!
    return this.allMovementsAtStop.findLastIndex((m) =>
      m.time.isBeforeOrEqual(time),
    );
  }

  isSameServiceDay(other: ScheduledDeparturesBlock): boolean {
    return Temporal.PlainDate.compare(this.serviceDay, other.serviceDay) === 0;
  }
}
