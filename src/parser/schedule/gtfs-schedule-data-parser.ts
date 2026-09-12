import { GtfsScheduleData } from "../../data/gtfs-schedule-data.js";
import {
  GtfsCalendarParser,
  type GtfsCalendarParsingError,
} from "./gtfs-calendar-parser.js";
import {
  GtfsTripParser,
  type GtfsTripParsingError,
} from "./gtfs-trip-parser.js";
import type { LineGtfsIdMapping } from "../../data/ids/line-gtfs-id-mapping.js";
import type { StopGtfsIdMapping } from "../../data/ids/stop-gtfs-id-mapping.js";
import type { LineRoutesMapping } from "../../data/route/line-routes-mapping.js";
import type { BonusLinesMapping } from "../../data/route/bonus-lines-mapping.js";
import type { GtfsFeedCsv } from "../../data/raw/schedule-csvs.js";

export type GtfsScheduleDataParserFields = {
  readonly lineRoutesMapping: LineRoutesMapping;
  readonly bonusLinesMapping: BonusLinesMapping;
  readonly lineGtfsIdMapping: LineGtfsIdMapping;
  readonly stopGtfsIdMapping: StopGtfsIdMapping;
  readonly onError: (error: GtfsScheduleParsingError) => void;
};

export class GtfsScheduleDataParser {
  private readonly _calendarParser: GtfsCalendarParser;
  private readonly _tripParser: GtfsTripParser;

  constructor(fields: GtfsScheduleDataParserFields) {
    this._calendarParser = new GtfsCalendarParser({
      onError: fields.onError,
    });
    this._tripParser = new GtfsTripParser({
      lineRoutesMapping: fields.lineRoutesMapping,
      bonusLinesMapping: fields.bonusLinesMapping,
      lineGtfsIdMapping: fields.lineGtfsIdMapping,
      stopGtfsIdMapping: fields.stopGtfsIdMapping,
      onError: fields.onError,
    });
  }

  parse(csvs: GtfsFeedCsv): GtfsScheduleData {
    const { calendar, calendarDates, trips, stopTimes, transfers } = csvs;

    const parsedCalendars = this._calendarParser.parse(calendar, calendarDates);

    const { parsedTrips, parsedTransfers, ignoredTripIds } =
      this._tripParser.parse(trips, stopTimes, transfers, parsedCalendars);

    return new GtfsScheduleData(
      parsedTrips,
      parsedCalendars,
      parsedTransfers,
      ignoredTripIds,
    );
  }
}

export type GtfsScheduleParsingError =
  | GtfsCalendarParsingError
  | GtfsTripParsingError;
