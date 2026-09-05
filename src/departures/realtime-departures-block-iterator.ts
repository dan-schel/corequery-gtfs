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
    _entry: RealtimeDeparturesBlockEntry,
  ): boolean {
    return false;
  }
}
