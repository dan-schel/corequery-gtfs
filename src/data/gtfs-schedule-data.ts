import type { GtfsCalendar } from "./gtfs-calendar.js";
import type { GtfsScheduledTrip } from "./trip/scheduled/gtfs-scheduled-trip.js";
import { GtfsTransferMapping } from "./gtfs-transfer-mapping.js";
import type { GtfsTransfer } from "./gtfs-transfer.js";

export type GtfsScheduleDataFields = {
  readonly trips: readonly GtfsScheduledTrip[];
  readonly calendars: readonly GtfsCalendar[];
  readonly transfers: readonly GtfsTransfer[];
  readonly ignoredTripIds: readonly string[];
};

export class GtfsScheduleData {
  readonly trips: readonly GtfsScheduledTrip[];
  readonly calendars: readonly GtfsCalendar[];
  readonly transfers: readonly GtfsTransfer[];

  /**
   * Trip IDs intentionally ignored during parsing (e.g. replacement buses), so
   * realtime updates for them aren't classified as trips we failed to match.
   */
  readonly ignoredTripIds: readonly string[];

  private readonly _tripsById: Map<string, GtfsScheduledTrip>;
  private readonly _calendarsById: Map<string, GtfsCalendar>;
  private readonly _transfersMapping: GtfsTransferMapping<GtfsTransfer>;
  private readonly _ignoredTripIds: Set<string>;

  static readonly empty = GtfsScheduleData.fromTrips([]);

  constructor(fields: GtfsScheduleDataFields) {
    this.trips = fields.trips;
    this.calendars = fields.calendars;
    this.transfers = fields.transfers;
    this.ignoredTripIds = fields.ignoredTripIds;

    // Arguably we should be taking the map as the constructor argument because
    // the GtfsTransferConnector operates on a map, that it converts back to an
    // array, only to have it immediately passed on to this constructor where
    // we convert it back again :)

    this._tripsById = new Map<string, GtfsScheduledTrip>(
      this.trips.map((trip) => [trip.gtfsTripId, trip]),
    );
    this._calendarsById = new Map<string, GtfsCalendar>(
      this.calendars.map((calendar) => [calendar.gtfsCalendarId, calendar]),
    );
    this._transfersMapping = GtfsTransferMapping.build(this.transfers, (x) =>
      x.getInvolvedTripIds(),
    );
    this._ignoredTripIds = new Set<string>(this.ignoredTripIds);
  }

  with(newValues: Partial<GtfsScheduleDataFields>): GtfsScheduleData {
    return new GtfsScheduleData({ ...this, ...newValues });
  }

  allTrips(): readonly GtfsScheduledTrip[] {
    return this.trips;
  }

  getTrip(gtfsTripId: string): GtfsScheduledTrip | null {
    return this._tripsById.get(gtfsTripId) ?? null;
  }

  getCalendar(gtfsCalendarId: string): GtfsCalendar | null {
    return this._calendarsById.get(gtfsCalendarId) ?? null;
  }

  getTransfersForTrip(gtfsTripId: string): readonly GtfsTransfer[] {
    return this._transfersMapping.forTripId(gtfsTripId);
  }

  isTripIgnored(gtfsTripId: string): boolean {
    return this._ignoredTripIds.has(gtfsTripId);
  }

  requireCalendar(gtfsCalendarId: string): GtfsCalendar {
    const calendar = this.getCalendar(gtfsCalendarId);
    if (calendar == null) {
      throw new Error(
        `No calendar with ID ${gtfsCalendarId} exists in this schedule data`,
      );
    }
    return calendar;
  }

  static fromTrips(trips: readonly GtfsScheduledTrip[]): GtfsScheduleData {
    const calendars = new Map<string, GtfsCalendar>();
    for (const trip of trips) {
      if (!calendars.has(trip.calendar.gtfsCalendarId)) {
        calendars.set(trip.calendar.gtfsCalendarId, trip.calendar);
      }
    }
    return new GtfsScheduleData({
      trips,
      calendars: [...calendars.values()],
      transfers: [],
      ignoredTripIds: [],
    });
  }
}
