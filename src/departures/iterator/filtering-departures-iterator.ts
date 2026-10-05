import type { DeparturesIterationDirection } from "../../corequery-types.js";
import {
  GtfsDeparturesIterator,
  GtfsDeparturesIteratorResult,
} from "./gtfs-departures-iterator.js";

export class FilteringDeparturesIterator extends GtfsDeparturesIterator {
  constructor(
    private readonly _iterator: GtfsDeparturesIterator,
    private readonly _predicate: (
      result: GtfsDeparturesIteratorResult,
    ) => boolean,
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

  override peek(): GtfsDeparturesIteratorResult | null {
    return this._iterator.peek();
  }

  override take(): GtfsDeparturesIteratorResult {
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
