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
  GtfsScheduleParser,
  type GtfsScheduleParsingError,
} from "./schedule/gtfs-schedule-parser.js";
import type { GtfsFeedCsv } from "../data/raw/schedule-csvs.js";
import type { TimezoneData } from "../config/timezone-data.js";

export class GtfsFeedParser {
  private readonly _scheduleParser: GtfsScheduleParser;
  private readonly _realtimeParser: GtfsRealtimeDataParser;

  constructor(
    lineRoutesMapping: LineRoutesMapping,
    bonusLinesMapping: BonusLinesMapping,
    private readonly _timezoneData: TimezoneData,
    _onScheduleParsingError: (error: GtfsScheduleParsingError) => void,
    _onRealtimeParsingError: (error: GtfsRealtimeDataParsingError) => void,
  ) {
    this._scheduleParser = new GtfsScheduleParser(
      lineRoutesMapping,
      bonusLinesMapping,
      _onScheduleParsingError,
    );
    this._realtimeParser = new GtfsRealtimeDataParser(
      _timezoneData.timezone,
      _onRealtimeParsingError,
    );
  }

  parse(
    scheduleCsvs: GtfsFeedCsv,
    realtimeJson: RealtimeDataJson,
    lineGtfsIdMapping: LineGtfsIdMapping,
    stopGtfsIdMapping: StopGtfsIdMapping,
  ): GtfsFeed {
    const scheduleData = this._scheduleParser.parse(
      scheduleCsvs,
      lineGtfsIdMapping,
      stopGtfsIdMapping,
    );
    const realtimeData = this._realtimeParser.parse(
      realtimeJson,
      scheduleData,
      stopGtfsIdMapping,
    );

    return GtfsFeed.fromNewScheduleData(
      scheduleData,
      realtimeData,
      this._timezoneData,
    );
  }

  updateWithNewRealtimeData(
    gtfsFeed: GtfsFeed,
    realtimeData: RealtimeDataJson,
    stopGtfsIdMapping: StopGtfsIdMapping,
  ): GtfsFeed {
    const updatedRealtime = this._realtimeParser.parse(
      realtimeData,
      gtfsFeed.scheduleData,
      stopGtfsIdMapping,
    );

    return gtfsFeed.withUpdatedRealtimeData(updatedRealtime);
  }
}
