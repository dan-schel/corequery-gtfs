import { assertNever, nonNull } from "@dan-schel/js-utils";
import {
  DeparturesIterator,
  DeparturesIteratorResult,
} from "./departures-iterator.js";
import { ScheduledDeparturesIterator } from "./scheduled-departures-iterator.js";
import { RealtimeDeparturesBlockIterator } from "./realtime-departures-block-iterator.js";
import type { GtfsScheduledMovementsIndex } from "./gtfs-scheduled-movements-index.js";
import type { GtfsRealtimeData } from "../data/gtfs-realtime-data.js";
import type { TimezoneData } from "../config/timezone-data.js";
import type { DeparturesIterationDirection } from "../corequery-types.js";

export class ZipperDeparturesIterator extends DeparturesIterator {
  private _direction: DeparturesIterationDirection;
  private _nextIterator: DeparturesIterator | null;

  constructor(private readonly _iterators: DeparturesIterator[]) {
    super();

    this._direction = "forwards";
    this._nextIterator = null;
  }

  override set(
    instant: Temporal.Instant,
    direction: DeparturesIterationDirection,
  ): void {
    this._direction = direction;

    for (const iterator of this._iterators) {
      iterator.set(instant, direction);
    }

    this._nextIterator = this._determineBestIterator();
  }

  override peek(): DeparturesIteratorResult | null {
    return this._nextIterator?.peek() ?? null;
  }

  peekAtIterator(): DeparturesIterator | null {
    return this._nextIterator;
  }

  override take(): DeparturesIteratorResult {
    const iterator = this._nextIterator;
    if (iterator == null) throw new Error("Nothing to take.");

    const value = iterator.take();

    this._nextIterator = this._determineBestIterator();

    return value;
  }

  private _determineBestIterator() {
    let best: DeparturesIteratorResult | null = null;
    let bestIterator: DeparturesIterator | null = null;

    for (const iterator of this._iterators) {
      const nextValue = iterator.peek();
      if (nextValue == null) continue;

      if (best == null || this._isBetter(best.instant, nextValue.instant)) {
        best = nextValue;
        bestIterator = iterator;
      }
    }

    return bestIterator;
  }

  private _isBetter(
    currentBest: Temporal.Instant,
    candidate: Temporal.Instant,
  ): boolean {
    if (this._direction === "forwards") {
      return Temporal.Instant.compare(candidate, currentBest) < 0;
    } else if (this._direction === "backwards") {
      return Temporal.Instant.compare(candidate, currentBest) > 0;
    } else {
      assertNever(this._direction);
    }
  }

  static forFeed(
    stopId: number,
    scheduledMovementsIndex: GtfsScheduledMovementsIndex,
    realtimeData: GtfsRealtimeData,
    timezoneData: TimezoneData,
  ) {
    const scheduled = ScheduledDeparturesIterator.tryBuild(
      stopId,
      scheduledMovementsIndex,
      realtimeData,
      timezoneData,
    );

    const realtime = RealtimeDeparturesBlockIterator.tryBuild(
      stopId,
      realtimeData,
    );

    const iterators = [scheduled, realtime].filter(nonNull);
    return new ZipperDeparturesIterator(iterators);
  }
}
