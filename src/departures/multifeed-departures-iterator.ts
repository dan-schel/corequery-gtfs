import {
  DeparturesIterator,
  DeparturesIteratorResult,
} from "./departures-iterator.js";
import type { GtfsScheduledTrip } from "../data/gtfs-scheduled-trip.js";
import type { GtfsUpdatedTrip } from "../data/gtfs-updated-trip.js";
import type { GtfsTripServicingMovement } from "../data/utils.js";
import { ZipperDeparturesIterator } from "./zipper-departures-iterator.js";
import type { DeparturesIterationDirection } from "../corequery-types.js";

// TODO: [DS] Delete this. We're gonna combine feeds at the corequery departure
// iterator level, not within the GTFS ecosystem.

export class MultifeedDeparturesIteratorResult extends DeparturesIteratorResult {
  constructor(
    readonly feed: string,
    trip: GtfsScheduledTrip | GtfsUpdatedTrip,
    serviceDay: Temporal.PlainDate,
    instant: Temporal.Instant,
    movement: GtfsTripServicingMovement,
  ) {
    super(trip, serviceDay, instant, movement);
  }

  static from(
    feed: string,
    result: DeparturesIteratorResult,
  ): MultifeedDeparturesIteratorResult {
    return new MultifeedDeparturesIteratorResult(
      feed,
      result.trip,
      result.serviceDay,
      result.instant,
      result.movement,
    );
  }
}

export class MultifeedDeparturesIterator {
  private _zipper: ZipperDeparturesIterator;

  constructor(private readonly _iterators: Map<DeparturesIterator, string>) {
    this._zipper = new ZipperDeparturesIterator(Array.from(_iterators.keys()));
  }

  static build(
    config: Record<string, DeparturesIterator>,
  ): MultifeedDeparturesIterator {
    const iterators = new Map<DeparturesIterator, string>();
    for (const [feed, iterator] of Object.entries(config)) {
      iterators.set(iterator, feed);
    }

    return new MultifeedDeparturesIterator(iterators);
  }

  set(
    instant: Temporal.Instant,
    direction: DeparturesIterationDirection,
  ): void {
    this._zipper.set(instant, direction);
  }

  peek(): MultifeedDeparturesIteratorResult | null {
    const result = this._zipper.peek();
    const iterator = this._zipper.peekAtIterator();
    if (result == null || iterator == null) return null;

    return this._wrap(result, iterator);
  }

  take(): MultifeedDeparturesIteratorResult {
    const iterator = this._zipper.peekAtIterator();
    if (iterator == null) throw new Error("Nothing to take.");
    return this._wrap(this._zipper.take(), iterator);
  }

  private _wrap(
    result: DeparturesIteratorResult,
    iterator: DeparturesIterator,
  ): MultifeedDeparturesIteratorResult {
    const feed = this._iterators.get(iterator);
    if (feed == null) throw new Error("Unrecognized iterator.");

    return MultifeedDeparturesIteratorResult.from(feed, result);
  }
}
