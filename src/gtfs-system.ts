import type {
  GtfsConfig,
  GtfsInterpolationMode,
  TimezoneConfig,
} from "./config/index.js";
import type { GtfsFeed } from "./data/gtfs-feed.js";
import { LineGtfsIdMapping } from "./data/ids/line-gtfs-id-mapping.js";
import { StopGtfsIdMapping } from "./data/ids/stop-gtfs-id-mapping.js";
import { BonusLinesMapping } from "./data/route/bonus-lines-mapping.js";
import { LineRoutesMapping } from "./data/route/line-routes-mapping.js";
import { GtfsFeedParser } from "./parser/gtfs-feed-parser.js";
import type {
  GtfsRealtimeDataParsingError,
  GtfsScheduleParsingError,
} from "./parser/error-types.js";
import type { RealtimeDataJson } from "./data/raw/realtime-data-json.js";
import type { GtfsFeedCsv } from "./data/raw/schedule-csvs.js";

export class GtfsSystem {
  private readonly _parser: GtfsFeedParser;

  private _feed: GtfsFeed | null;
  private _scheduleParsingErrors: GtfsScheduleParsingError[];
  private _realtimeParsingErrors: GtfsRealtimeDataParsingError[];

  constructor(
    lineGtfsIdMapping: LineGtfsIdMapping,
    stopGtfsIdMapping: StopGtfsIdMapping,
    lineRoutesMapping: LineRoutesMapping,
    bonusLinesMapping: BonusLinesMapping,
    timezoneConfig: TimezoneConfig,
    interpolationMode: GtfsInterpolationMode,
  ) {
    this._parser = new GtfsFeedParser({
      lineRoutesMapping,
      bonusLinesMapping,
      lineGtfsIdMapping,
      stopGtfsIdMapping,
      timezoneConfig,
      onScheduleParsingError: (error) => this._onScheduledParsingError(error),
      onRealtimeParsingError: (error) => this._onRealtimeParsingError(error),
      interpolationMode,
    });

    this._feed = null;
    this._scheduleParsingErrors = [];
    this._realtimeParsingErrors = [];
  }

  static build(config: GtfsConfig) {
    return new GtfsSystem(
      LineGtfsIdMapping.build(config.lineGtfsIds),
      StopGtfsIdMapping.build(config.stopGtfsIds),
      LineRoutesMapping.build(config.lineRoutesMapping),
      BonusLinesMapping.build(config.bonusLinesMapping ?? {}),
      config.timezoneConfig,
      config.interpolationMode ?? "follow-spec",
    );
  }

  getFeed(): GtfsFeed | null {
    return this._feed;
  }

  requireFeed(): GtfsFeed {
    if (this._feed == null) throw new Error("No feed parsed yet.");
    return this._feed;
  }

  get realtimeParsingErrors() {
    return this._realtimeParsingErrors;
  }

  get scheduleParsingErrors() {
    return this._scheduleParsingErrors;
  }

  onNewScheduleData(scheduleCsvs: GtfsFeedCsv, realtimeJson: RealtimeDataJson) {
    this._scheduleParsingErrors = [];
    this._realtimeParsingErrors = [];

    const result = this._parser.parse(scheduleCsvs, realtimeJson);

    this._feed = result;
  }

  onNewRealtimeData(realtimeJson: RealtimeDataJson) {
    if (this._feed == null) throw new Error("No schedule data parsed yet.");

    this._realtimeParsingErrors = [];

    const result = this._parser.updateWithNewRealtimeData(
      this._feed,
      realtimeJson,
    );

    this._feed = result;
  }

  setFeed(feed: GtfsFeed) {
    this._feed = feed;
  }

  private _onScheduledParsingError(error: GtfsScheduleParsingError) {
    this._scheduleParsingErrors.push(error);
  }

  private _onRealtimeParsingError(error: GtfsRealtimeDataParsingError) {
    this._realtimeParsingErrors.push(error);
  }
}
