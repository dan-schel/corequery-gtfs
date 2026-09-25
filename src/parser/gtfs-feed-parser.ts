import { GtfsFeed } from "../data/gtfs-feed.js";
import type { LineGtfsIdMapping } from "../data/ids/line-gtfs-id-mapping.js";
import type { StopGtfsIdMapping } from "../data/ids/stop-gtfs-id-mapping.js";
import type { BonusLinesMapping } from "../data/route/bonus-lines-mapping.js";
import type { LineRoutesMapping } from "../data/route/line-routes-mapping.js";
import type { RealtimeDataJson } from "../data/raw/realtime-data-json.js";
import {
  GtfsRealtimeDataParser,
  type GtfsRealtimeDataParsingError,
} from "./realtime/gtfs-realtime-data-parser.js";
import {
  GtfsScheduleDataParser,
  type GtfsScheduleParsingError,
} from "./schedule/gtfs-schedule-data-parser.js";
import type { GtfsFeedCsv } from "../data/raw/schedule-csvs.js";
import type { TimezoneData } from "../config/timezone-data.js";

export type GtfsFeedParserFields = {
  readonly lineRoutesMapping: LineRoutesMapping;
  readonly bonusLinesMapping: BonusLinesMapping;
  readonly lineGtfsIdMapping: LineGtfsIdMapping;
  readonly stopGtfsIdMapping: StopGtfsIdMapping;
  readonly timezoneData: TimezoneData;
  readonly onScheduleParsingError: (error: GtfsScheduleParsingError) => void;
  readonly onRealtimeParsingError: (
    error: GtfsRealtimeDataParsingError,
  ) => void;
};

export class GtfsFeedParser {
  private readonly _timezoneData: TimezoneData;

  private readonly _scheduleParser: GtfsScheduleDataParser;
  private readonly _realtimeParser: GtfsRealtimeDataParser;

  constructor(fields: GtfsFeedParserFields) {
    this._timezoneData = fields.timezoneData;

    this._scheduleParser = new GtfsScheduleDataParser({
      lineRoutesMapping: fields.lineRoutesMapping,
      bonusLinesMapping: fields.bonusLinesMapping,
      lineGtfsIdMapping: fields.lineGtfsIdMapping,
      stopGtfsIdMapping: fields.stopGtfsIdMapping,
      onError: fields.onScheduleParsingError,
    });
    this._realtimeParser = new GtfsRealtimeDataParser({
      timezone: fields.timezoneData.timezone,
      stopGtfsIdMapping: fields.stopGtfsIdMapping,
      lineGtfsIdMapping: fields.lineGtfsIdMapping,
      lineRoutesMapping: fields.lineRoutesMapping,
      bonusLinesMapping: fields.bonusLinesMapping,
      onError: fields.onRealtimeParsingError,
    });
  }

  parse(scheduleCsvs: GtfsFeedCsv, realtimeJson: RealtimeDataJson): GtfsFeed {
    const scheduleData = this._scheduleParser.parse(scheduleCsvs);
    const realtimeData = this._realtimeParser.parse(realtimeJson, scheduleData);

    return GtfsFeed.fromNewScheduleData(
      scheduleData,
      realtimeData,
      this._timezoneData,
    );
  }

  updateWithNewRealtimeData(
    gtfsFeed: GtfsFeed,
    realtimeData: RealtimeDataJson,
  ): GtfsFeed {
    const updatedRealtime = this._realtimeParser.parse(
      realtimeData,
      gtfsFeed.scheduleData,
    );

    return gtfsFeed.withUpdatedRealtimeData(updatedRealtime);
  }
}
