import { assertNever, itsOk } from "@dan-schel/js-utils";
import {
  DeparturesIterator,
  type DeparturesIteratorResult,
} from "./departures-iterator.js";
import type { DeparturesBlock } from "./departures-block.js";
import type { DeparturesSearchDirection } from "../corequery-types.js";

export abstract class DeparturesBlockIterator<
  BlockType extends DeparturesBlock,
  EntryType,
> extends DeparturesIterator {
  private _index: number;
  private _direction: DeparturesSearchDirection;
  private _nextValue: DeparturesIteratorResult | null;

  constructor(
    readonly block: BlockType,
    private readonly _entries: readonly EntryType[],
  ) {
    super();

    this._index = -1;
    this._direction = "forwards";
    this._nextValue = null;
  }

  override set(
    instant: Temporal.Instant,
    direction: DeparturesSearchDirection,
  ): void {
    this._direction = direction;

    if (direction === "forwards") {
      const index = this.block.getIterationIndexOfNextFrom(instant);
      this._setIndexAndSkipUntilValidEntry(index, direction);
    } else if (direction === "backwards") {
      const index = this.block.getIterationIndexOfPreviousFrom(instant);
      this._setIndexAndSkipUntilValidEntry(index, direction);
    } else {
      assertNever(direction);
    }
  }

  override peek(): DeparturesIteratorResult | null {
    return this._nextValue;
  }

  override take(): DeparturesIteratorResult {
    const value = this.peek();
    if (value == null) throw new Error("Nothing to take.");

    const index = this._index;
    const direction = this._direction;
    const next = DeparturesBlockIterator._nextIndexValueFor(index, direction);
    this._setIndexAndSkipUntilValidEntry(next, direction);

    return value;
  }

  protected abstract _convertEntryToResult(
    entry: EntryType,
  ): DeparturesIteratorResult;

  protected abstract _shouldSkipEntry(entry: EntryType): boolean;

  private _setIndexAndSkipUntilValidEntry(
    newIndex: number,
    direction: DeparturesSearchDirection,
  ) {
    let index = newIndex;
    while (index >= 0 && index < this._entries.length) {
      // Ok due to while loop condition. Once we've exceed the bounds of the
      // array (in either direction), we'll have stopped.
      const entry = itsOk(this._entries[index]);
      if (!this._shouldSkipEntry(entry)) break;

      index = DeparturesBlockIterator._nextIndexValueFor(index, direction);
    }

    this._index = index;

    const value = this._entries[index] ?? null;
    this._nextValue = value == null ? null : this._convertEntryToResult(value);
  }

  private static _nextIndexValueFor(
    index: number,
    direction: DeparturesSearchDirection,
  ): number {
    if (direction === "forwards") {
      return index + 1;
    } else if (direction === "backwards") {
      return index - 1;
    } else {
      assertNever(direction);
    }
  }
}
