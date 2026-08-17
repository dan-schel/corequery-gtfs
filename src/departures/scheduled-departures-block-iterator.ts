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

    // Even users not filtering arrivals won't be interested to see the same
    // trip listed twice at stations like Flinders Street or Town Hall, once for
    // the arrival and then again for the departure of the continuing trip. We
    // just need to be sure the continuing trip is actually running!
    //
    // TODO: Realtime trips which connect to other trips must cause those
    // scheduled trips to become realtime trips too, and realtime trips need to
    // have their own `nextTrip` and `prevTrip` properties, otherwise fetching
    // `nextTrip` here can lead to outdated info (the next trip might have been
    // altered and no longer connects with this one). Alternatively, having
    // `nextTrip` and `prevTrip` was a mistake, and we just only have trip IDs
    // in their place, or maybe an entirely separate list of transfers which
    // lives outside the trip (and supports other future transfer types).
    //
    // TODO: Wherever this logic ends up living, make sure it's tested.
    const isArrivalWhichContinues =
      entry.movement.type === "terminating" &&
      entry.trip.nextTrip != null &&
      entry.trip.nextTrip.calendar.occursOn(this.block.serviceDay) &&
      !this._isTripCancelled(entry.trip.nextTrip.gtfsTripId);
    if (isArrivalWhichContinues) return true;

    return false;
  }

  private _isTripCancelled(tripId: string): boolean {
    const realtimeTrip = this._realtimeData.getForScheduledTrip(
      tripId,
      this.block.serviceDay,
    );
    return realtimeTrip?.isCancelled ?? false;
  }
}
