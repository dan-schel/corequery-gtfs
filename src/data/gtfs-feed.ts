import { GtfsScheduledMovementsIndex } from "../departures/gtfs-scheduled-movements-index.js";
import type { TimezoneData } from "../departures/scheduled-departures-blocks-builder.js";
import { ZipperDeparturesIterator } from "../departures/zipper-departures-iterator.js";
import type { GtfsRealtimeData } from "./gtfs-realtime-data.js";
import type { GtfsScheduleData } from "./gtfs-schedule-data.js";

export class GtfsFeed {
  constructor(
    readonly corequeryDataSourceId: string,
    readonly scheduleData: GtfsScheduleData,
    readonly realtimeData: GtfsRealtimeData,
    readonly timezoneData: TimezoneData,
    readonly scheduledMovementsIndex: GtfsScheduledMovementsIndex,
  ) {}

  static fromNewScheduleData(
    corequeryDataSourceId: string,
    scheduleData: GtfsScheduleData,
    realtimeData: GtfsRealtimeData,
    timezoneData: TimezoneData,
  ) {
    const scheduledMovementsIndex =
      GtfsScheduledMovementsIndex.build(scheduleData);

    return new GtfsFeed(
      corequeryDataSourceId,
      scheduleData,
      realtimeData,
      timezoneData,
      scheduledMovementsIndex,
    );
  }

  withUpdatedRealtimeData(realtimeData: GtfsRealtimeData): GtfsFeed {
    return new GtfsFeed(
      this.corequeryDataSourceId,
      this.scheduleData,
      realtimeData,
      this.timezoneData,
      this.scheduledMovementsIndex,
    );
  }

  createCorequeryDepartureIterator(stopId: number) {
    // TODO: Should be the corequery departure iterator (once the design of that
    // is finalised).
    //
    // TODO: Maybe the MultifeedDeparturesIterator shouldn't operate on the GTFS
    // level, but instead on CoreQuery departures? Why attach a subfeed ID, when
    // we could just go straight to attaching the corequery data source ID?
    return ZipperDeparturesIterator.forFeed(
      stopId,
      this.scheduledMovementsIndex,
      this.realtimeData,
      this.timezoneData,
    );
  }
}
