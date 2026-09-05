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

export class MutableGtfsTransferMapping<T extends IGtfsTransfer> {
  private readonly _map: Map<string, T[]>;
  private readonly _array: T[];

  constructor() {
    this._map = new Map<string, T[]>();
    this._array = [];
  }

  push(transfer: T): void {
    this._array.push(transfer);
    for (const tripId of transfer.getInvolvedTripIds()) {
      const transfersInvolvingTrip = this._map.get(tripId) ?? [];
      transfersInvolvingTrip.push(transfer);
      this._map.set(tripId, transfersInvolvingTrip);
    }
  }

  forTripId(tripId: string): readonly T[] {
    return this._map.get(tripId) ?? [];
  }

  toArray(): readonly T[] {
    return this._array;
  }
}
