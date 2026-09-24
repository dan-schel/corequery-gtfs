import type {
  GtfsAddedTransfer,
  GtfsBrokenTransfer,
} from "./gtfs-realtime-transfer.js";
import { GtfsTransferMapping } from "./gtfs-transfer-mapping.js";
import type { GtfsRealtimeTrip } from "./trip/types.js";

export class GtfsRealtimeData {
  // TODO: The same scheduled trip can have one realtime update per service day,
  // not one total. ADD A TEST FOR THIS!
  private readonly _tripsByScheduledTripId: Map<string, GtfsRealtimeTrip>;

  private readonly _brokenTransfersMapping: GtfsTransferMapping<GtfsBrokenTransfer>;
  private readonly _addedTransfersMapping: GtfsTransferMapping<GtfsAddedTransfer>;

  static readonly empty = new GtfsRealtimeData([], [], []);

  constructor(
    private readonly _trips: readonly GtfsRealtimeTrip[],
    private readonly _brokenTransfers: readonly GtfsBrokenTransfer[],
    private readonly _addedTransfers: readonly GtfsAddedTransfer[],
  ) {
    this._tripsByScheduledTripId = new Map<string, GtfsRealtimeTrip>(
      _trips.map((trip) => [trip.gtfsTripId, trip]),
    );
    this._brokenTransfersMapping = GtfsTransferMapping.build(
      _brokenTransfers,
      (x) => x.transfer.getInvolvedTripIds(),
    );
    this._addedTransfersMapping = GtfsTransferMapping.build(
      _addedTransfers,
      (x) => x.transfer.getInvolvedTripIds(),
    );
  }

  allTrips(): readonly GtfsRealtimeTrip[] {
    return this._trips;
  }

  getTrip(gtfsTripId: string, serviceDay: Temporal.PlainDate) {
    const trip = this._tripsByScheduledTripId.get(gtfsTripId);
    if (trip == null || !trip.serviceDay.equals(serviceDay)) return null;
    return trip;
  }

  getBrokenTransfersForTrip(
    gtfsTripId: string,
    serviceDay: Temporal.PlainDate,
  ): readonly GtfsBrokenTransfer[] {
    return this._brokenTransfersMapping
      .forTripId(gtfsTripId)
      .filter((x) => x.serviceDay.equals(serviceDay));
  }

  getAddedTransfersForTrip(
    gtfsTripId: string,
    serviceDay: Temporal.PlainDate,
  ): readonly GtfsAddedTransfer[] {
    return this._addedTransfersMapping
      .forTripId(gtfsTripId)
      .filter((x) => x.serviceDay.equals(serviceDay));
  }

  static fromTrips(trips: readonly GtfsRealtimeTrip[]): GtfsRealtimeData {
    return new GtfsRealtimeData(trips, [], []);
  }
}
