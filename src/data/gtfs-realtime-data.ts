import type { GtfsUpdatedTrip } from "./gtfs-updated-trip.js";

export class GtfsRealtimeData {
  private readonly _tripsByScheduledTripId: Map<string, GtfsUpdatedTrip>;

  static readonly empty = new GtfsRealtimeData([]);

  constructor(private readonly _updatedTrips: readonly GtfsUpdatedTrip[]) {
    this._tripsByScheduledTripId = new Map<string, GtfsUpdatedTrip>(
      _updatedTrips.map((trip) => [trip.scheduledTrip.gtfsTripId, trip]),
    );
  }

  // Or (GtfsUpdatedTrip | GtfsAddedTrip | GtfsCancelledTrip)[] one day.
  allTrips(): readonly GtfsUpdatedTrip[] {
    return this._updatedTrips;
  }

  getForScheduledTrip(
    gtfsTripId: string,
    serviceDay: Temporal.PlainDate,
  ): GtfsUpdatedTrip | null {
    const trip = this._tripsByScheduledTripId.get(gtfsTripId);
    if (trip == null || !trip.serviceDay.equals(serviceDay)) return null;
    return trip;
  }
}
