import { DeparturesIteratorResult } from "./departures-iterator.js";
import {
  RealtimeDeparturesBlock,
  type RealtimeDeparturesBlockEntry,
} from "./realtime-departures-block.js";
import type { GtfsRealtimeData } from "../data/gtfs-realtime-data.js";
import { DeparturesBlockIterator } from "./departures-block-iterator.js";

export class RealtimeDeparturesBlockIterator extends DeparturesBlockIterator<
  RealtimeDeparturesBlock,
  RealtimeDeparturesBlockEntry
> {
  constructor(
    block: RealtimeDeparturesBlock,
    private readonly _realtimeData: GtfsRealtimeData,
  ) {
    super(block, block.entries);
  }

  static tryBuild(stopId: number, realtimeData: GtfsRealtimeData) {
    const block = RealtimeDeparturesBlock.tryBuild(stopId, realtimeData);
    if (block == null) return null;

    return new RealtimeDeparturesBlockIterator(block, realtimeData);
  }

  protected override _convertEntryToResult(
    entry: RealtimeDeparturesBlockEntry,
  ): DeparturesIteratorResult {
    return new DeparturesIteratorResult(
      entry.trip,
      entry.trip.serviceDay,
      entry.instant,
      entry.movement,
      entry.movementIndex,
    );
  }

  protected override _shouldSkipEntry(
    entry: RealtimeDeparturesBlockEntry,
  ): boolean {
    const { movement, trip } = entry;

    // Even users not filtering arrivals won't be interested to see the same
    // trip listed twice at stations like Flinders Street or Town Hall, once for
    // the arrival and then again for the departure of the continuing trip. We
    // just need to be sure the continuing trip is actually running!
    //
    // TODO: This needs to change too.
    const isArrivalWhichContinues =
      movement.type === "terminating" &&
      trip.scheduledTrip.nextTrip != null &&
      trip.scheduledTrip.nextTrip.calendar.occursOn(trip.serviceDay) &&
      !this._isTripCancelled(
        trip.scheduledTrip.nextTrip.gtfsTripId,
        entry.trip.serviceDay,
      );
    if (isArrivalWhichContinues) return true;

    return false;
  }

  private _isTripCancelled(
    tripId: string,
    serviceDay: Temporal.PlainDate,
  ): boolean {
    const realtimeTrip = this._realtimeData.getForScheduledTrip(
      tripId,
      serviceDay,
    );
    return realtimeTrip?.isCancelled ?? false;
  }
}
