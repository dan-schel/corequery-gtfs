export class PlainDateRange {
  static readonly infinite = new PlainDateRange(null, null);

  constructor(
    readonly start: Temporal.PlainDate | null,
    readonly end: Temporal.PlainDate | null,
  ) {
    if (
      start !== null &&
      end !== null &&
      Temporal.PlainDate.compare(start, end) > 0
    ) {
      throw new Error(`Start date cannot be after end date.`);
    }
  }

  includes(date: Temporal.PlainDate): boolean {
    return !this.startsAfter(date) && !this.endsBefore(date);
  }

  startsAfter(date: Temporal.PlainDate): boolean {
    return (
      this.start != null && Temporal.PlainDate.compare(this.start, date) > 0
    );
  }

  endsBefore(date: Temporal.PlainDate): boolean {
    return this.end != null && Temporal.PlainDate.compare(this.end, date) < 0;
  }

  endsAfter(date: Temporal.PlainDate): boolean {
    return this.end == null || Temporal.PlainDate.compare(this.end, date) > 0;
  }

  static encompassing(a: PlainDateRange, b: PlainDateRange): PlainDateRange {
    function earliestOf(a: Temporal.PlainDate, b: Temporal.PlainDate) {
      return Temporal.PlainDate.compare(a, b) < 0 ? a : b;
    }
    function latestOf(a: Temporal.PlainDate, b: Temporal.PlainDate) {
      return Temporal.PlainDate.compare(a, b) > 0 ? a : b;
    }

    return new PlainDateRange(
      a.start == null || b.start == null ? null : earliestOf(a.start, b.start),
      a.end == null || b.end == null ? null : latestOf(a.end, b.end),
    );
  }
}
