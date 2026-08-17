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

// TODO: Rename GtfsScheduleDataParser.
export class GtfsScheduleParser {
  private readonly _calendarParser: GtfsCalendarParser;
  private readonly _tripParser: GtfsTripParser;

  constructor(
    lineRoutesMapping: LineRoutesMapping,
    bonusLinesMapping: BonusLinesMapping,
    onError: (error: GtfsScheduleParsingError) => void,
  ) {
    this._calendarParser = new GtfsCalendarParser(onError);
    this._tripParser = new GtfsTripParser(
      lineRoutesMapping,
      bonusLinesMapping,
      onError,
    );
  }

  parse(
    csvs: GtfsFeedCsv,
    lineGtfsIdMapping: LineGtfsIdMapping,
    stopGtfsIdMapping: StopGtfsIdMapping,
  ): GtfsScheduleData {
    const { calendar, calendarDates, trips, stopTimes, transfers } = csvs;

    const parsedCalendars = this._calendarParser.parse(calendar, calendarDates);

    const parsedTrips = this._tripParser.parse(
      trips,
      stopTimes,
      transfers,
      parsedCalendars,
      lineGtfsIdMapping,
      stopGtfsIdMapping,
    );

    return new GtfsScheduleData(parsedTrips, parsedCalendars);
  }
}

export type GtfsScheduleParsingError =
  | GtfsCalendarParsingError
  | GtfsTripParsingError;
