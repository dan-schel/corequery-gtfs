import type { IGtfsTransfer } from "./gtfs-transfer.js";

export class GtfsTransferMapping<T extends IGtfsTransfer> {
  private constructor(private readonly _byTripId: Map<string, T[]>) {}

  static build<T extends IGtfsTransfer>(
    transfers: readonly T[],
  ): GtfsTransferMapping<T> {
    const byTripId = new Map<string, T[]>();
    for (const transfer of transfers) {
      for (const tripId of transfer.getInvolvedTripIds()) {
        const transfersInvolvingTrip = byTripId.get(tripId) ?? [];
        transfersInvolvingTrip.push(transfer);
        byTripId.set(tripId, transfersInvolvingTrip);
      }
    }
    return new GtfsTransferMapping(byTripId);
  }
}
