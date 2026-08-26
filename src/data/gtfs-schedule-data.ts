import type { GtfsCalendar } from "./gtfs-calendar.js";
import type { GtfsScheduledTrip } from "./gtfs-scheduled-trip.js";

export class GtfsScheduleData {
  private readonly _tripsById: Map<string, GtfsScheduledTrip>;
  private readonly _calendarsById: Map<string, GtfsCalendar>;

  static readonly empty = GtfsScheduleData.fromTrips([]);

  constructor(
    private readonly _trips: readonly GtfsScheduledTrip[],
    calendars: readonly GtfsCalendar[],
  ) {
    // Arguably we should be taking the map as the constructor argument because
    // the GtfsTransferConnector operates on a map, that it converts back to an
    // array, only to have it immediately passed on to this constructor where
    // we convert it back again :)

    this._tripsById = new Map<string, GtfsScheduledTrip>(
      _trips.map((trip) => [trip.gtfsTripId, trip]),
    );
    this._calendarsById = new Map<string, GtfsCalendar>(
      calendars.map((calendar) => [calendar.gtfsCalendarId, calendar]),
    );
  }

  allTrips(): readonly GtfsScheduledTrip[] {
    return this._trips;
  }

  getTrip(gtfsTripId: string): GtfsScheduledTrip | null {
    return this._tripsById.get(gtfsTripId) ?? null;
  }

  getCalendar(gtfsCalendarId: string): GtfsCalendar | null {
    return this._calendarsById.get(gtfsCalendarId) ?? null;
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
    return new GtfsScheduleData(trips, [...calendars.values()]);
  }
}
