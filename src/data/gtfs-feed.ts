import type { TimezoneData } from "../config/timezone-data.js";
import { GtfsScheduledMovementsIndex } from "../departures/gtfs-scheduled-movements-index.js";
import { ZipperDeparturesIterator } from "../departures/zipper-departures-iterator.js";
import type { GtfsRealtimeData } from "./gtfs-realtime-data.js";
import type { GtfsScheduleData } from "./gtfs-schedule-data.js";
import type { GtfsScheduledTrip } from "./gtfs-scheduled-trip.js";
import type { GtfsUpdatedTrip } from "./gtfs-updated-trip.js";

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

  getTrip(
    gtfsTripId: string,
    serviceDay: Temporal.PlainDate,
  ): GtfsScheduledTrip | GtfsUpdatedTrip | null {
    const realtimeTrip = this.realtimeData.getTrip(gtfsTripId, serviceDay);
    if (realtimeTrip != null) return realtimeTrip;

    const scheduledTrip = this.scheduleData.getTrip(gtfsTripId);
    if (scheduledTrip != null && scheduledTrip.calendar.occursOn(serviceDay)) {
      return scheduledTrip;
    }

    return null;
  }

  createDepartureIterator(stopId: number) {
    return ZipperDeparturesIterator.forFeed(
      stopId,
      this.scheduledMovementsIndex,
      this.realtimeData,
      this.timezoneData,
    );
  }
}
