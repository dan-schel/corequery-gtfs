import type { TimezoneData } from "../config/timezone-data.js";
import { GtfsScheduledMovementsIndex } from "../departures/gtfs-scheduled-movements-index.js";
import { ZipperDeparturesIterator } from "../departures/zipper-departures-iterator.js";
import { GtfsRealtimeData } from "./gtfs-realtime-data.js";
import { GtfsScheduleData } from "./gtfs-schedule-data.js";
import type { GtfsScheduledTrip } from "./gtfs-scheduled-trip.js";
import type { GtfsUpdatedTrip } from "./gtfs-updated-trip.js";

export class GtfsFeed {
  static readonly empty = new GtfsFeed(
    GtfsScheduleData.empty,
    GtfsRealtimeData.empty,

    // Timezone data can be literally anything. Because there's no trips, we
    // never create a ScheduledDeparturesBlocksBuilder, so it's unused.
    {
      timezone: "UTC",
      minimumViableOffsetSeconds: 0,
      maximumViableOffsetSeconds: 0,
    },

    GtfsScheduledMovementsIndex.empty,
  );

  constructor(
    readonly scheduleData: GtfsScheduleData,
    readonly realtimeData: GtfsRealtimeData,
    readonly timezoneData: TimezoneData,
    readonly scheduledMovementsIndex: GtfsScheduledMovementsIndex,
  ) {}

  static fromNewScheduleData(
    scheduleData: GtfsScheduleData,
    realtimeData: GtfsRealtimeData,
    timezoneData: TimezoneData,
  ) {
    const scheduledMovementsIndex =
      GtfsScheduledMovementsIndex.build(scheduleData);

    return new GtfsFeed(
      scheduleData,
      realtimeData,
      timezoneData,
      scheduledMovementsIndex,
    );
  }

  withUpdatedRealtimeData(realtimeData: GtfsRealtimeData): GtfsFeed {
    return new GtfsFeed(
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

  createDepartureIterator(stopId: number, iterationLimitHours: number | null) {
    return ZipperDeparturesIterator.forFeed(
      stopId,
      this.scheduledMovementsIndex,
      this.realtimeData,
      this.timezoneData,
      iterationLimitHours,
    );
  }
}
