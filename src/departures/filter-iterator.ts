import type { DeparturesIterationDirection } from "../corequery-types.js";
import type { GtfsFeed } from "../data/gtfs-feed.js";
import {
  DeparturesIterator,
  DeparturesIteratorResult,
} from "./departures-iterator.js";

export class FilterIterator extends DeparturesIterator {
  constructor(
    private readonly _iterator: DeparturesIterator,
    private readonly _predicate: (result: DeparturesIteratorResult) => boolean,
  ) {
    super();
  }

  override set(
    instant: Temporal.Instant,
    direction: DeparturesIterationDirection,
  ): void {
    this._iterator.set(instant, direction);
    this._takeUntilMatchesPredicate();
  }

  override peek(): DeparturesIteratorResult | null {
    return this._iterator.peek();
  }

  override take(): DeparturesIteratorResult {
    const result = this._iterator.take();
    this._takeUntilMatchesPredicate();
    return result;
  }

  private _takeUntilMatchesPredicate() {
    let current = this._iterator.peek();
    while (current != null && !this._predicate(current)) {
      this._iterator.take();
      current = this._iterator.peek();
    }
  }
}
