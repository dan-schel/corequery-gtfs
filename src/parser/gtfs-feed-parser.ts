import { GtfsFeed } from "../data/gtfs-feed.js";
import type { LineGtfsIdMapping } from "../data/ids/line-gtfs-id-mapping.js";
import type { StopGtfsIdMapping } from "../data/ids/stop-gtfs-id-mapping.js";
import type { BonusLinesMapping } from "../data/route/bonus-lines-mapping.js";
import type { LineRoutesMapping } from "../data/route/line-routes-mapping.js";
import type { RealtimeDataJson } from "../data/raw/realtime-data-json.js";
import { GtfsRealtimeDataParser } from "./realtime/gtfs-realtime-data-parser.js";
import { GtfsScheduleDataParser } from "./schedule/gtfs-schedule-data-parser.js";
import type {
  GtfsRealtimeDataParsingError,
  GtfsScheduleParsingError,
} from "./error-types.js";
import type { GtfsFeedCsv } from "../data/raw/schedule-csvs.js";
import type { TimezoneConfig } from "../config/timezone-config.js";
import type { GtfsInterpolationMode } from "../config/gtfs-config.js";

export type GtfsFeedParserFields = {
  readonly lineRoutesMapping: LineRoutesMapping;
  readonly bonusLinesMapping: BonusLinesMapping;
  readonly lineGtfsIdMapping: LineGtfsIdMapping;
  readonly stopGtfsIdMapping: StopGtfsIdMapping;
  readonly timezoneConfig: TimezoneConfig;
  readonly interpolationMode: GtfsInterpolationMode;

  readonly onScheduleParsingError: (error: GtfsScheduleParsingError) => void;
  readonly onRealtimeParsingError: (
    error: GtfsRealtimeDataParsingError,
  ) => void;
};

export class GtfsFeedParser {
  private readonly _timezoneConfig: TimezoneConfig;

  private readonly _scheduleParser: GtfsScheduleDataParser;
  private readonly _realtimeParser: GtfsRealtimeDataParser;

  constructor(fields: GtfsFeedParserFields) {
    this._timezoneConfig = fields.timezoneConfig;

    this._scheduleParser = new GtfsScheduleDataParser({
      lineRoutesMapping: fields.lineRoutesMapping,
      bonusLinesMapping: fields.bonusLinesMapping,
      lineGtfsIdMapping: fields.lineGtfsIdMapping,
      stopGtfsIdMapping: fields.stopGtfsIdMapping,
      onError: fields.onScheduleParsingError,
    });
    this._realtimeParser = new GtfsRealtimeDataParser({
      timezone: fields.timezoneConfig.timezone,
      stopGtfsIdMapping: fields.stopGtfsIdMapping,
      lineGtfsIdMapping: fields.lineGtfsIdMapping,
      lineRoutesMapping: fields.lineRoutesMapping,
      bonusLinesMapping: fields.bonusLinesMapping,
      interpolationMode: fields.interpolationMode,
      onError: fields.onRealtimeParsingError,
    });
  }

  parse(scheduleCsvs: GtfsFeedCsv, realtimeJson: RealtimeDataJson): GtfsFeed {
    const scheduleData = this._scheduleParser.parse(scheduleCsvs);
    const realtimeData = this._realtimeParser.parse(realtimeJson, scheduleData);

    return GtfsFeed.fromNewScheduleData(
      scheduleData,
      realtimeData,
      this._timezoneConfig,
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
