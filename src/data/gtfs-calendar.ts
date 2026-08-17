import { PlainDateRange } from "./plain-date-range.js";

export class GtfsCalendar {
  constructor(
    readonly gtfsCalendarId: string,
    readonly monday: boolean,
    readonly tuesday: boolean,
    readonly wednesday: boolean,
    readonly thursday: boolean,
    readonly friday: boolean,
    readonly saturday: boolean,
    readonly sunday: boolean,
    readonly dateRange: PlainDateRange,
    readonly addedDates: readonly Temporal.PlainDate[],
    readonly removedDates: readonly Temporal.PlainDate[],
  ) {}

  occursOn(date: Temporal.PlainDate): boolean {
    if (this._isDateAdded(date)) {
      return true;
    }

    return (
      this.dateRange.includes(date) &&
      this._isDayOfWeekIncluded(date.dayOfWeek) &&
      !this._isDateRemoved(date)
    );
  }

  /**
   * Returns a PlainDateRange which is guaranteed to encompass every date this
   * calendar includes, including added ones. It is _not_ guaranteed to tightly
   * fit the range.
   *
   * (Designed to be used when determining if departures from a certain stop are
   * exhausted, to prevent infinite loops, so exactness at the boundaries is not
   * necessary as long as we don't miss any departures.)
   */
  getFullDateRange(): PlainDateRange {
    if (this.addedDates.length === 0) return this.dateRange;

    const addedDatesRange = this._getAddedDatesRange();
    if (!this.isRecurring) return addedDatesRange;

    return PlainDateRange.encompassing(this.dateRange, addedDatesRange);
  }

  /**
   * Returns true if one of `monday`, `tuesday`, `wednesday`, etc. is true, i.e.
   * we don't purely rely on `addedDates` to provide days to this calendar.
   */
  get isRecurring() {
    return (
      this.monday ||
      this.tuesday ||
      this.wednesday ||
      this.thursday ||
      this.friday ||
      this.saturday ||
      this.sunday
    );
  }

  private _isDayOfWeekIncluded(dayOfWeek: number): boolean {
    switch (dayOfWeek) {
      case 1:
        return this.monday;
      case 2:
        return this.tuesday;
      case 3:
        return this.wednesday;
      case 4:
        return this.thursday;
      case 5:
        return this.friday;
      case 6:
        return this.saturday;
      case 7:
        return this.sunday;
      default:
        throw new Error(`Invalid day of week number: ${dayOfWeek}`);
    }
  }

  private _isDateAdded(date: Temporal.PlainDate): boolean {
    return this.addedDates.some((addedDate) => addedDate.equals(date));
  }

  private _isDateRemoved(date: Temporal.PlainDate): boolean {
    return this.removedDates.some((removedDate) => removedDate.equals(date));
  }

  private _getAddedDatesRange() {
    let earliest: Temporal.PlainDate | null = null;
    let latest: Temporal.PlainDate | null = null;

    for (const date of this.addedDates) {
      if (earliest == null || Temporal.PlainDate.compare(date, earliest) < 0) {
        earliest = date;
      }
      if (latest == null || Temporal.PlainDate.compare(date, latest) > 0) {
        latest = date;
      }
    }

    if (earliest == null || latest == null) throw new Error("No added dates.");
    return new PlainDateRange(earliest, latest);
  }

  static everyday(gtfsCalendarId: string): GtfsCalendar {
    return new GtfsCalendar(
      gtfsCalendarId,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      PlainDateRange.infinite,
      [],
      [],
    );
  }

  static everydayWithinRange(
    gtfsCalendarId: string,
    dateRange: PlainDateRange,
  ): GtfsCalendar {
    return new GtfsCalendar(
      gtfsCalendarId,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      dateRange,
      [],
      [],
    );
  }

  static singleDay(
    gtfsCalendarId: string,
    date: Temporal.PlainDate,
  ): GtfsCalendar {
    return new GtfsCalendar(
      gtfsCalendarId,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      new PlainDateRange(null, null),
      [date],
      [],
    );
  }
}
