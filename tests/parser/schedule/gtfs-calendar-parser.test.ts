import { describe, expect, it } from "vitest";
import {
  DuplicateCalendarIdError,
  GtfsCalendarParser,
  InvalidCalendarDateRangeError,
  MultipleExceptionsForSameDateError,
  UnexpectedCalendarDateExceptionTypeError,
  type GtfsCalendarParsingError,
} from "../../../../../src/gtfs/corequery-gtfs/parser/schedule/gtfs-calendar-parser.js";
import type { CalendarCsvRow } from "../../../../../src/gtfs/corequery-gtfs/data/raw/schedule-csvs.js";

describe("GtfsCalendarParser", () => {
  const PLAIN_DATE_2026_06_17 = Temporal.PlainDate.from("2026-06-17");
  const PLAIN_DATE_2026_06_18 = Temporal.PlainDate.from("2026-06-18");
  const PLAIN_DATE_2026_06_21 = Temporal.PlainDate.from("2026-06-21");

  const STANDARD_CALENDAR: CalendarCsvRow = {
    service_id: "cal-1",
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
    start_date: PLAIN_DATE_2026_06_17,
    end_date: PLAIN_DATE_2026_06_21,
  };

  it("parses base calendars and calendar date exceptions", () => {
    const errors: GtfsCalendarParsingError[] = [];
    const parser = new GtfsCalendarParser((e) => errors.push(e));

    const calendarCsv = [{ ...STANDARD_CALENDAR, monday: true }];
    const calendarDatesCsv = [
      {
        service_id: STANDARD_CALENDAR.service_id,
        date: PLAIN_DATE_2026_06_17,
        exception_type: 1,
      },
      {
        service_id: STANDARD_CALENDAR.service_id,
        date: PLAIN_DATE_2026_06_18,
        exception_type: 2,
      },
    ];

    const calendars = parser.parse(calendarCsv, calendarDatesCsv);

    expect(errors).toEqual([]);
    expect(calendars).toHaveLength(1);

    const calendar = calendars[0];
    if (calendar == null) throw new Error("Expected one calendar.");

    expect(calendar.gtfsCalendarId).toBe(STANDARD_CALENDAR.service_id);
    expect(calendar.addedDates).toEqual([PLAIN_DATE_2026_06_17]);
    expect(calendar.removedDates).toEqual([PLAIN_DATE_2026_06_18]);
    expect(calendar.monday).toBe(true);
  });

  it("creates calendars from calendar_dates only", () => {
    const errors: GtfsCalendarParsingError[] = [];
    const parser = new GtfsCalendarParser((e) => errors.push(e));

    const calendarDatesCsv = [
      { service_id: "new", date: PLAIN_DATE_2026_06_17, exception_type: 1 },
    ];
    const calendars = parser.parse([], calendarDatesCsv);

    expect(errors).toEqual([]);
    expect(calendars).toHaveLength(1);

    const calendar = calendars[0];
    if (calendar == null) throw new Error("Expected one calendar.");

    expect(calendar.gtfsCalendarId).toBe("new");
    expect(calendar.addedDates).toEqual([PLAIN_DATE_2026_06_17]);
    expect(calendar.isRecurring).toBe(false);
  });

  it("reports, but ultimately ignores subsequent rows with the same ID", () => {
    const errors: GtfsCalendarParsingError[] = [];
    const parser = new GtfsCalendarParser((e) => errors.push(e));

    const calendarCsv = [
      { ...STANDARD_CALENDAR, service_id: "dup", monday: true },
      { ...STANDARD_CALENDAR, service_id: "dup", tuesday: true },
    ];
    const calendars = parser.parse(calendarCsv, []);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(DuplicateCalendarIdError);
    expect(calendars).toHaveLength(1);

    const calendar = calendars[0];
    if (calendar == null) throw new Error("Expected one calendar.");

    expect(calendar.monday).toBe(true);
    expect(calendar.tuesday).toBe(false);
  });

  it("does not create calendars which are invalid, even if rows in calendar_dates for that calendar exist", () => {
    const errors: GtfsCalendarParsingError[] = [];
    const parser = new GtfsCalendarParser((e) => errors.push(e));

    // Because the calendar is invalid, it will be reported and then ignored.
    // The parser needs to be smart enough to know that the calendar_dates row
    // is also associated with that broken calendar, not just think "ah, a
    // calendar_dates row for a calendar that doesn't exist, I'll create a
    // calendar for it!".
    const calendarCsv = [
      {
        ...STANDARD_CALENDAR,
        start_date: PLAIN_DATE_2026_06_18,
        end_date: PLAIN_DATE_2026_06_17,
      },
    ];
    const calendarDatesCsv = [
      {
        service_id: STANDARD_CALENDAR.service_id,
        date: PLAIN_DATE_2026_06_21,
        exception_type: 1,
      },
    ];

    const calendars = parser.parse(calendarCsv, calendarDatesCsv);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(InvalidCalendarDateRangeError);
    expect(calendars).toEqual([]);
  });

  it("reports unexpected exception types in calendar_dates rows", () => {
    const errors: GtfsCalendarParsingError[] = [];
    const parser = new GtfsCalendarParser((e) => errors.push(e));

    const calendarDatesCsv = [
      {
        service_id: "type-three",
        date: PLAIN_DATE_2026_06_21,
        exception_type: 3,
      },
    ];
    const calendars = parser.parse([], calendarDatesCsv);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(UnexpectedCalendarDateExceptionTypeError);
    expect(calendars).toEqual([]);
  });

  it("reports duplicate calendar_dates exceptions for the same date", () => {
    const errors: GtfsCalendarParsingError[] = [];
    const parser = new GtfsCalendarParser((e) => errors.push(e));

    const calendarDatesCsv = [
      { service_id: "dup", date: PLAIN_DATE_2026_06_21, exception_type: 1 },
      { service_id: "dup", date: PLAIN_DATE_2026_06_21, exception_type: 2 },
    ];
    const calendars = parser.parse([], calendarDatesCsv);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(MultipleExceptionsForSameDateError);
    expect(calendars).toHaveLength(1);
  });
});
