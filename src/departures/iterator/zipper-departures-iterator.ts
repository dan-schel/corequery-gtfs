import { assertNever, nonNull } from "@dan-schel/js-utils";
import {
  GtfsDeparturesIterator,
  GtfsDeparturesIteratorResult,
} from "./gtfs-departures-iterator.js";
import { ScheduledDeparturesIterator } from "./scheduled-departures-iterator.js";
import type { GtfsScheduledMovementsIndex } from "../gtfs-scheduled-movements-index.js";
import type { GtfsRealtimeData } from "../../data/gtfs-realtime-data.js";
import type { TimezoneConfig } from "../../config/timezone-config.js";
import type { DeparturesIterationDirection } from "../../corequery-types.js";
import { RealtimeDeparturesBlockIterator } from "./realtime-departures-block-iterator.js";

export class ZipperDeparturesIterator extends GtfsDeparturesIterator {
  private _direction: DeparturesIterationDirection;
  private _nextIterator: GtfsDeparturesIterator | null;
  private _cutoff: Temporal.Instant | null;

  constructor(
    private readonly _iterators: GtfsDeparturesIterator[],
    private readonly _iterationLimitHours: number | null,
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

  override peek(): GtfsDeparturesIteratorResult | null {
    return this._nextIterator?.peek() ?? null;
  }

  peekAtIterator(): GtfsDeparturesIterator | null {
    return this._nextIterator;
  }

  override take(): GtfsDeparturesIteratorResult {
    const iterator = this._nextIterator;
    if (iterator == null) throw new Error("Nothing to take.");

    const value = iterator.take();

    this._nextIterator = this._determineNextIterator();

    return value;
  }

  private _determineNextIterator() {
    const cutoff = this._cutoff;

    let best: GtfsDeparturesIteratorResult | null = null;
    let bestIterator: GtfsDeparturesIterator | null = null;

    for (const iterator of this._iterators) {
      const nextValue = iterator.peek();
      if (nextValue == null) continue;

      const nextInstant = nextValue.instant;
      const better = best == null || this._isCloser(nextInstant, best.instant);
      const afterCutoff = cutoff != null && this._isCloser(cutoff, nextInstant);

      if (better && !afterCutoff) {
        best = nextValue;
        bestIterator = iterator;
      }
    }

    return bestIterator;
  }

  private _isCloser(a: Temporal.Instant, b: Temporal.Instant): boolean {
    if (this._direction === "forwards") {
      return Temporal.Instant.compare(a, b) < 0;
    } else if (this._direction === "backwards") {
      return Temporal.Instant.compare(a, b) > 0;
    } else {
      assertNever(this._direction);
    }
  }

  private _determineCutoff(instant: Temporal.Instant): Temporal.Instant | null {
    if (this._iterationLimitHours == null) return null;

    if (this._direction === "forwards") {
      return instant.add({ hours: this._iterationLimitHours });
    } else if (this._direction === "backwards") {
      return instant.subtract({ hours: this._iterationLimitHours });
    } else {
      assertNever(this._direction);
    }
  }

  static forFeed(
    stopId: number,
    scheduledMovementsIndex: GtfsScheduledMovementsIndex,
    realtimeData: GtfsRealtimeData,
    timezoneConfig: TimezoneConfig,
    iterationLimitHours: number | null,
  ) {
    const scheduled = ScheduledDeparturesIterator.tryBuild(
      stopId,
      scheduledMovementsIndex,
      realtimeData,
      timezoneConfig,
      iterationLimitHours,
    );

    const realtime = RealtimeDeparturesBlockIterator.tryBuild(
      stopId,
      realtimeData,
    );

    const iterators = [scheduled, realtime].filter(nonNull);
    return new ZipperDeparturesIterator(iterators, iterationLimitHours);
  }
}
