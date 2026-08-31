import { assertNever, removeIf } from "@dan-schel/js-utils";
import {
  DeparturesIterator,
  type DeparturesIteratorResult,
} from "./departures-iterator.js";
import { BoundedInstantRange } from "../data/bounded-instant-range.js";
import { ScheduledDeparturesBlockIterator } from "./scheduled-departures-block-iterator.js";
import type { GtfsScheduledMovementsIndex } from "./gtfs-scheduled-movements-index.js";
import type { GtfsRealtimeData } from "../data/gtfs-realtime-data.js";
import { ScheduledDeparturesBlocksBuilder } from "./scheduled-departures-blocks-builder.js";
import type { TimezoneData } from "../config/timezone-data.js";
import type { DeparturesIterationDirection } from "../corequery-types.js";

const DEFAULT_BLOCK_SCAN_HOURS = 48;

type ScheduledDeparturesIteratorOptions = {
  readonly blockScanHours: number;
  readonly maximumNumberOfScans: number | null;
};

export class ScheduledDeparturesIterator extends DeparturesIterator {
  private _direction: DeparturesIterationDirection;
  private _searchRange: SearchRange | null;
  private _iterators: ScheduledDeparturesBlockIterator[];
  private _nextIterator: ScheduledDeparturesBlockIterator | null;

  private _blockSearchesRan: number;
  private _subiteratorsCreated: number;

  constructor(
    private readonly _blockBuilder: ScheduledDeparturesBlocksBuilder,
    private readonly _realtimeData: GtfsRealtimeData,
    private readonly _options: ScheduledDeparturesIteratorOptions,
  ) {
    super();

    this._direction = "forwards";
    this._searchRange = null;
    this._iterators = [];
    this._nextIterator = null;

    this._blockSearchesRan = 0;
    this._subiteratorsCreated = 0;
  }

  static tryBuild(
    stopId: number,
    scheduledMovementsIndex: GtfsScheduledMovementsIndex,
    realtimeData: GtfsRealtimeData,
    timezoneData: TimezoneData,
    iterationLimitDays: number | null,
  ) {
    const blockBuilder = ScheduledDeparturesBlocksBuilder.tryBuild(
      stopId,
      scheduledMovementsIndex,
      timezoneData,
    );
    if (blockBuilder == null) return null;

    const maximumNumberOfScans =
      iterationLimitDays == null
        ? null
        : Math.ceil((iterationLimitDays * 24) / DEFAULT_BLOCK_SCAN_HOURS);

    return new ScheduledDeparturesIterator(blockBuilder, realtimeData, {
      blockScanHours: DEFAULT_BLOCK_SCAN_HOURS,
      maximumNumberOfScans: maximumNumberOfScans,
    });
  }

  getStats() {
    return {
      blockSearchesRan: this._blockSearchesRan,
      subiteratorsCreated: this._subiteratorsCreated,
    };
  }

  set(
    instant: Temporal.Instant,
    direction: DeparturesIterationDirection,
  ): void {
    this._blockSearchesRan = 0;
    this._subiteratorsCreated = 0;

    this._direction = direction;

    this._searchRange = SearchRange.create(
      instant,
      direction,
      this._options.blockScanHours,
    ).optimize(this._blockBuilder);

    this._iterators = [];
    this._nextIterator = null;

    this._updateIteratorsForSearchRange();
    this._determineIteratorWithNextValue();
  }

  peek(): DeparturesIteratorResult | null {
    return this._nextIterator?.peek() ?? null;
  }

  take(): DeparturesIteratorResult {
    const iterator = this._nextIterator;
    if (iterator == null) throw new Error("Nothing to take.");

    const value = iterator.take();

    this._determineIteratorWithNextValue();

    return value;
  }

  private _determineIteratorWithNextValue() {
    if (this._searchRange == null) throw new Error("Search range not set.");

    let bestIterator = this._getBestOfCurrentIterators();
    let bestValue = bestIterator?.peek() ?? null;

    // Limit the maximum number of searches, otherwise if there are more blocks
    // available, but they're super far off in the future, and next time peek()
    // is called once we've made it to that huge gap is gonna be really slow.
    //
    // While it's great that in theory this algorithm works to infinity, and is
    // fairly efficient in most cases, in reality, trainquery-melbourne (or any
    // other consumer) won't want to tradeoff the possibility of a single tricky
    // request taking down the server for exact correctness.
    //
    // There's probably further optimisations I could make in this algorithm to
    // allow this limit to be raised (to the point where it'll never matter in
    // practice), but I doubt we'll ever want to remove it entirely.
    const maxScans = this._options.maximumNumberOfScans;

    while (
      (bestValue == null || !this._searchRange.includes(bestValue.instant)) &&
      this._areMoreBlocksAvailable() &&
      (maxScans == null || this._blockSearchesRan < maxScans)
    ) {
      this._searchRange = this._searchRange.getNextWithDuration(
        this._options.blockScanHours,
      );
      this._updateIteratorsForSearchRange();

      bestIterator = this._getBestOfCurrentIterators();
      bestValue = bestIterator?.peek() ?? null;
    }

    this._nextIterator = bestIterator;
  }

  private _updateIteratorsForSearchRange() {
    if (this._searchRange == null) throw new Error("Search range not set.");

    this._blockSearchesRan++;

    const blocks = this._blockBuilder.allWithinTimeRange(
      this._searchRange.range,
    );

    for (const block of blocks) {
      const alreadyIteratingThisBlock = this._iterators.some((i) =>
        i.block.isSameServiceDay(block),
      );

      if (!alreadyIteratingThisBlock) {
        this._subiteratorsCreated++;

        const rtData = this._realtimeData;
        const iterator = new ScheduledDeparturesBlockIterator(block, rtData);
        iterator.set(this._searchRange.front, this._direction);
        this._iterators.push(iterator);
      }
    }

    removeIf(this._iterators, (iterator) => iterator.peek() == null);
  }

  private _getBestOfCurrentIterators() {
    let best: DeparturesIteratorResult | null = null;
    let bestIterator: ScheduledDeparturesBlockIterator | null = null;

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

  private _areMoreBlocksAvailable(): boolean {
    if (this._searchRange == null) throw new Error("Search range not set.");

    if (this._direction === "forwards") {
      return this._blockBuilder.hasMoreAfter(this._searchRange.back);
    } else if (this._direction === "backwards") {
      return this._blockBuilder.hasMoreBefore(this._searchRange.back);
    } else {
      assertNever(this._direction);
    }
  }
}

class SearchRange {
  constructor(
    readonly range: BoundedInstantRange,
    readonly direction: DeparturesIterationDirection,
  ) {}

  get front(): Temporal.Instant {
    return {
      forwards: this.range.start,
      backwards: this.range.end,
    }[this.direction];
  }

  get back(): Temporal.Instant {
    return {
      forwards: this.range.end,
      backwards: this.range.start,
    }[this.direction];
  }

  get durationHours(): number {
    const startMillis = this.range.start.epochMilliseconds;
    const endMillis = this.range.end.epochMilliseconds;
    const durationMillis = endMillis - startMillis;
    return durationMillis / (1000 * 60 * 60);
  }

  getNextWithDuration(durationHours: number): SearchRange {
    return SearchRange.create(this.back, this.direction, durationHours);
  }

  static create(
    instant: Temporal.Instant,
    direction: DeparturesIterationDirection,
    durationHours: number,
  ) {
    const start = {
      forwards: instant,
      backwards: instant.subtract({ hours: durationHours }),
    }[direction];
    const end = {
      forwards: instant.add({ hours: durationHours }),
      backwards: instant,
    }[direction];

    return new SearchRange(new BoundedInstantRange(start, end), direction);
  }

  includes(instant: Temporal.Instant): boolean {
    return this.range.includes(instant);
  }

  /**
   * If the search range is beginning before the earliest movement (or after the
   * latest if the direction is backwards) then we can optimise our search by
   * pushing the range forward/backward so the first search occurs within the
   * range of movements we have.
   *
   * This means someone searching for all departures from the year 1900 doesn't
   * crash the server as it patiently searches through 120+ years of blocks,
   * finding that none of them have any departures for those service days!
   */
  optimize(blocks: ScheduledDeparturesBlocksBuilder): SearchRange {
    const earliest = blocks.earliestPossibleMovementInstant;
    const latest = blocks.latestPossibleMovementInstant;

    if (
      this.direction === "forwards" &&
      earliest != null &&
      Temporal.Instant.compare(earliest, this.range.start) > 0
    ) {
      return SearchRange.create(earliest, this.direction, this.durationHours);
    }

    if (
      this.direction === "backwards" &&
      latest != null &&
      Temporal.Instant.compare(latest, this.range.end) < 0
    ) {
      return SearchRange.create(latest, this.direction, this.durationHours);
    }

    return this;
  }
}
