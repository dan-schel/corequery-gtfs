import type { GtfsConfig, TimezoneData } from "./config/index.js";
import type { GtfsFeed } from "./data/gtfs-feed.js";
import { LineGtfsIdMapping } from "./data/ids/line-gtfs-id-mapping.js";
import { StopGtfsIdMapping } from "./data/ids/stop-gtfs-id-mapping.js";
import { BonusLinesMapping } from "./data/route/bonus-lines-mapping.js";
import { LineRoutesMapping } from "./data/route/line-routes-mapping.js";
import { GtfsFeedParser } from "./parser/gtfs-feed-parser.js";
import type { GtfsRealtimeDataParsingError } from "./parser/realtime/gtfs-realtime-data-parser.js";
import type { GtfsScheduleParsingError } from "./parser/schedule/gtfs-schedule-parser.js";
import type { RealtimeDataJson } from "./data/raw/realtime-data-json.js";
import type { GtfsFeedCsv } from "./data/raw/schedule-csvs.js";

export class GtfsSystem {
  // TODO: The parsers are designed assuming that the same instance will be used
  // to parse multiple feeds. I'm now thinking that this GtfsSystem class should
  // house the feed, but only represent one GTFS feed so that it can be a
  // departure source for Corequery just like any other, e.g. Corequery would
  // have departure sources:
  //
  // - GTFS regional
  // - GTFS suburban
  // - PTV API
  // - Static timetables
  //
  // And it would all be zipped together at the Corequery level. The advantage
  // is that we don't have to track subfeed IDs within the GTFS systems, and we
  // can say within Corequery itself that every service is uniquely identified
  // by a source ID and service ID within that source.
  //
  // This is a long winded way of saying that I think GtfsFeedParser will
  // probably only be used for one feed, and I should check if there's any
  // reason I decided to make it reusable for multiple feeds (some expensive
  // setup that I wanted to avoid repeating?).
  private readonly _parser: GtfsFeedParser;

  private _feed: GtfsFeed | null;
  private _scheduleParsingErrors: GtfsScheduleParsingError[];
  private _realtimeParsingErrors: GtfsRealtimeDataParsingError[];

  constructor(
    // TODO: I don't think this is needed, since GtfsServiceSource currently
    // handles ensuring the source ID is attached to the returned services.
    private readonly _corequeryDataSourceId: string,

    private readonly _lineGtfsIdMapping: LineGtfsIdMapping,
    private readonly _stopGtfsIdMapping: StopGtfsIdMapping,
    private readonly _lineRoutesMapping: LineRoutesMapping,
    private readonly _bonusLinesMapping: BonusLinesMapping,
    private readonly _timezoneData: TimezoneData,
  ) {
    this._parser = new GtfsFeedParser(
      this._lineRoutesMapping,
      this._bonusLinesMapping,
      this._timezoneData,
      (error) => this._onScheduledParsingError(error),
      (error) => this._onRealtimeParsingError(error),
    );

    this._feed = null;
    this._scheduleParsingErrors = [];
    this._realtimeParsingErrors = [];
  }

  static build(corequeryDataSourceId: string, config: GtfsConfig) {
    return new GtfsSystem(
      corequeryDataSourceId,
      LineGtfsIdMapping.build(config.lineGtfsIds),
      StopGtfsIdMapping.build(config.stopGtfsIds),
      LineRoutesMapping.build(config.lineRoutesMapping),
      BonusLinesMapping.build(config.bonusLinesMapping ?? {}),
      config.timezoneData,
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

    const result = this._parser.parse(
      this._corequeryDataSourceId,
      scheduleCsvs,
      realtimeJson,
      this._lineGtfsIdMapping,
      this._stopGtfsIdMapping,
    );

    this._feed = result;
  }

  onNewRealtimeData(realtimeJson: RealtimeDataJson) {
    if (this._feed == null) throw new Error("No schedule data parsed yet.");

    this._realtimeParsingErrors = [];

    const result = this._parser.updateWithNewRealtimeData(
      this._feed,
      realtimeJson,
      this._stopGtfsIdMapping,
    );

    this._feed = result;
  }

  private _onScheduledParsingError(error: GtfsScheduleParsingError) {
    this._scheduleParsingErrors.push(error);
  }

  private _onRealtimeParsingError(error: GtfsRealtimeDataParsingError) {
    this._realtimeParsingErrors.push(error);
  }
}
