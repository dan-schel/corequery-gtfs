import type { TimezoneData } from "../config/timezone-data.js";
import type { DeparturesIteratorResult } from "../departures/iterator/departures-iterator.js";
import { FilteringDeparturesIterator } from "../departures/iterator/filtering-departures-iterator.js";
import { GtfsScheduledMovementsIndex } from "../departures/gtfs-scheduled-movements-index.js";
import { ZipperDeparturesIterator } from "../departures/iterator/zipper-departures-iterator.js";
import { GtfsRealtimeData } from "./gtfs-realtime-data.js";
import { GtfsScheduleData } from "./gtfs-schedule-data.js";
import type { GtfsScheduledTrip } from "./trip/scheduled/gtfs-scheduled-trip.js";
import type { GtfsTransfer } from "./gtfs-transfer.js";
import type { GtfsUpdatedTrip } from "./trip/updated/gtfs-updated-trip.js";

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

  requireTrip(gtfsTripId: string, serviceDay: Temporal.PlainDate) {
    const trip = this.getTrip(gtfsTripId, serviceDay);
    if (trip == null) {
      throw new Error(`No trip "${gtfsTripId}" on ${serviceDay.toString()}.`);
    }
    return trip;
  }

  getUpheldTransfersForTrip(
    gtfsTripId: string,
    serviceDay: Temporal.PlainDate,
  ): GtfsTransfer[] {
    const rtData = this.realtimeData;
    const added = rtData.getAddedTransfersForTrip(gtfsTripId, serviceDay);
    const broken = rtData.getBrokenTransfersForTrip(gtfsTripId, serviceDay);

    // We allow transfers between trips on different calendars to exist, but
    // that means a transfer can be broken simply if the other trip is not
    // running on this service day according to its calendar. In that situation,
    // it isn't realtime data which broke the transfer, so we need to filter
    // the scheduled transfers both on this case AND realtime broken transfers.
    const scheduled = this.scheduleData
      .getTransfersForTrip(gtfsTripId)
      .filter(
        (x) =>
          !broken.some((b) => b.transfer.equals(x)) &&
          this._doesScheduledTransferOccurOnDay(gtfsTripId, x, serviceDay),
      );

    return [...scheduled, ...added.map((x) => x.transfer)];
  }

  createDepartureIterator(stopId: number, iterationLimitHours: number | null) {
    return new FilteringDeparturesIterator(
      ZipperDeparturesIterator.forFeed(
        stopId,
        this.scheduledMovementsIndex,
        this.realtimeData,
        this.timezoneData,
        iterationLimitHours,
      ),
      (result) => !this._isArrivalWhichContinues(result),
    );
  }

  private _isArrivalWhichContinues(result: DeparturesIteratorResult): boolean {
    if (result.movement.type !== "terminating") return false;

    const transfers = this.getUpheldTransfersForTrip(
      result.trip.gtfsTripId,
      result.serviceDay,
    );

    return transfers.some(
      (x) =>
        x.type === "entire-vehicle-forms-service" &&
        x.fromTripId === result.trip.gtfsTripId,
    );
  }

  private _doesScheduledTransferOccurOnDay(
    gtfsTripId: string,
    transfer: GtfsTransfer,
    serviceDay: Temporal.PlainDate,
  ): boolean {
    return transfer.getInvolvedTripIds().every((x) => {
      // Just to avoid looking up a trip we already know exists!
      if (x === gtfsTripId) return true;

      // We only need to check the scheduled data. If the connecting trip was
      // cancelled in realtime data, getUpheldTransfersForTrip already accounts
      // for that, because there will be a broken transfer recorded in the
      // realtime data.
      const otherTrip = this.scheduleData.getTrip(x);
      return otherTrip != null && otherTrip.calendar.occursOn(serviceDay);
    });
  }
}
