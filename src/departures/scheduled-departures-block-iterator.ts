import type { ScheduledDeparturesBlock } from "./scheduled-departures-block.js";
import { DeparturesIteratorResult } from "./departures-iterator.js";
import type { GtfsRealtimeData } from "../data/gtfs-realtime-data.js";
import { DeparturesBlockIterator } from "./departures-block-iterator.js";
import type { GtfsScheduledMovementsIndexEntry } from "./gtfs-scheduled-movements-index.js";

export class ScheduledDeparturesBlockIterator extends DeparturesBlockIterator<
  ScheduledDeparturesBlock,
  GtfsScheduledMovementsIndexEntry
> {
  constructor(
    block: ScheduledDeparturesBlock,
    private readonly _realtimeData: GtfsRealtimeData,
  ) {
    super(block, block.allMovementsAtStop);
  }

  protected override _convertEntryToResult(
    entry: GtfsScheduledMovementsIndexEntry,
  ): DeparturesIteratorResult {
    return new DeparturesIteratorResult(
      entry.trip,
      this.block.serviceDay,
      entry.time.toInstant(this.block.serviceDay, this.block.timezone),
      entry.movement,
      entry.movementIndex,
    );
  }

  protected override _shouldSkipEntry(
    entry: GtfsScheduledMovementsIndexEntry,
  ): boolean {
    // A scheduled departures block has all movements for a given stop, not just
    // the ones that occur today!
    const doesntRunToday = !entry.trip.calendar.occursOn(this.block.serviceDay);
    if (doesntRunToday) return true;

    // Trips with realtime data will be supplied by the realtime departures
    // block, so we don't want to show duplicate entries by also showing them
    // from the scheduled departures block (at the outdated departure time/order
    // too!).
    const tripId = entry.trip.gtfsTripId;
    const realtimeTrip = this._realtimeData.getForScheduledTrip(
      tripId,
      this.block.serviceDay,
    );
    const isOverriddenByRealtimeTrip = realtimeTrip != null;
    if (isOverriddenByRealtimeTrip) return true;

    return false;
  }
}
