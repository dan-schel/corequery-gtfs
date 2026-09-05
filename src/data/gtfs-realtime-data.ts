import type {
  GtfsAddedTransfer,
  GtfsBrokenTransfer,
} from "./gtfs-realtime-transfer.js";
import { GtfsTransferMapping } from "./gtfs-transfer-mapping.js";
import type { GtfsUpdatedTrip } from "./gtfs-updated-trip.js";

export class GtfsRealtimeData {
  private readonly _tripsByScheduledTripId: Map<string, GtfsUpdatedTrip>;
  private readonly _brokenTransfersMapping: GtfsTransferMapping<GtfsBrokenTransfer>;
  private readonly _addedTransfersMapping: GtfsTransferMapping<GtfsAddedTransfer>;

  static readonly empty = new GtfsRealtimeData([], [], []);

  constructor(
    private readonly _updatedTrips: readonly GtfsUpdatedTrip[],
    private readonly _brokenTransfers: readonly GtfsBrokenTransfer[],
    private readonly _addedTransfers: readonly GtfsAddedTransfer[],
  ) {
    this._tripsByScheduledTripId = new Map<string, GtfsUpdatedTrip>(
      _updatedTrips.map((trip) => [trip.scheduledTrip.gtfsTripId, trip]),
    );
    this._brokenTransfersMapping = GtfsTransferMapping.build(_brokenTransfers);
    this._addedTransfersMapping = GtfsTransferMapping.build(_addedTransfers);
  }

  // Or (GtfsUpdatedTrip | GtfsAddedTrip | GtfsCancelledTrip)[] one day.
  allTrips(): readonly GtfsUpdatedTrip[] {
    return this._updatedTrips;
  }

  getTrip(gtfsTripId: string, serviceDay: Temporal.PlainDate) {
    // Right now all realtime trips are updated trips. When we have added trips
    // in the future, then this needs to be modified to return those too.
    return this.getForScheduledTrip(gtfsTripId, serviceDay);
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
