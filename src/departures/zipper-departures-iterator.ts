import { assertNever, nonNull } from "@dan-schel/js-utils";
import {
  DeparturesIterator,
  DeparturesIteratorResult,
} from "./departures-iterator.js";
import { ScheduledDeparturesIterator } from "./scheduled-departures-iterator.js";
import type { GtfsScheduledMovementsIndex } from "./gtfs-scheduled-movements-index.js";
import type { GtfsRealtimeData } from "../data/gtfs-realtime-data.js";
import type { TimezoneData } from "../config/timezone-data.js";
import type { DeparturesIterationDirection } from "../corequery-types.js";
import { RealtimeDeparturesBlockIterator } from "./realtime-departures-block-iterator.js";

export class ZipperDeparturesIterator extends DeparturesIterator {
  private _direction: DeparturesIterationDirection;
  private _nextIterator: DeparturesIterator | null;
  private _cutoff: Temporal.Instant | null;

  constructor(
    private readonly _iterators: DeparturesIterator[],
    private readonly _iterationLimitDays: number | null,
  ) {
    super();

    this._direction = "forwards";
    this._nextIterator = null;
    this._cutoff = null;
  }

  override set(
    instant: Temporal.Instant,
    direction: DeparturesIterationDirection,
  ): void {
    this._direction = direction;
    this._cutoff = this._determineCutoff(instant);

    for (const iterator of this._iterators) {
      iterator.set(instant, direction);
    }

    this._nextIterator = this._determineNextIterator();
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

    this._nextIterator = this._determineNextIterator();

    return value;
  }

  private _determineNextIterator() {
    const cutoff = this._cutoff;

    let best: DeparturesIteratorResult | null = null;
    let bestIterator: DeparturesIterator | null = null;

    for (const iterator of this._iterators) {
      const nextValue = iterator.peek();
      if (nextValue == null) continue;

      const nextInstant = nextValue.instant;
      const better = best == null || this._isCloser(best.instant, nextInstant);
      const afterCutoff = cutoff != null && this._isCloser(cutoff, nextInstant);

      // TODO: Test the afterCutoff logic.
      if (better && !afterCutoff) {
        best = nextValue;
        bestIterator = iterator;
      }
    }

    return bestIterator;
  }

  private _isCloser(
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

  private _determineCutoff(instant: Temporal.Instant): Temporal.Instant | null {
    if (this._iterationLimitDays == null) return null;

    if (this._direction === "forwards") {
      return instant.add({ days: this._iterationLimitDays });
    } else if (this._direction === "backwards") {
      return instant.subtract({ days: this._iterationLimitDays });
    } else {
      assertNever(this._direction);
    }
  }

  static forFeed(
    stopId: number,
    scheduledMovementsIndex: GtfsScheduledMovementsIndex,
    realtimeData: GtfsRealtimeData,
    timezoneData: TimezoneData,
    iterationLimitDays: number | null,
  ) {
    const scheduled = ScheduledDeparturesIterator.tryBuild(
      stopId,
      scheduledMovementsIndex,
      realtimeData,
      timezoneData,
      iterationLimitDays,
    );

    const realtime = RealtimeDeparturesBlockIterator.tryBuild(
      stopId,
      realtimeData,
    );

    const iterators = [scheduled, realtime].filter(nonNull);
    return new ZipperDeparturesIterator(iterators, iterationLimitDays);
  }
}
