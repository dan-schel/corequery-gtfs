export class GtfsTransferMapping<T> {
  private constructor(private readonly _byTripId: Map<string, T[]>) {}

  static build<T>(
    transfers: readonly T[],
    extractInvolvedTripIds: (transfer: T) => readonly string[],
  ): GtfsTransferMapping<T> {
    const byTripId = new Map<string, T[]>();
    for (const transfer of transfers) {
      for (const tripId of extractInvolvedTripIds(transfer)) {
        const transfersInvolvingTrip = byTripId.get(tripId) ?? [];
        transfersInvolvingTrip.push(transfer);
        byTripId.set(tripId, transfersInvolvingTrip);
      }
    }
    return new GtfsTransferMapping(byTripId);
  }

  forTripId(tripId: string): readonly T[] {
    return this._byTripId.get(tripId) ?? [];
  }
}

export class MutableGtfsTransferMapping<T> {
  private readonly _map: Map<string, T[]>;
  private readonly _array: T[];

  constructor(
    private readonly _extractInvolvedTripIds: (
      transfer: T,
    ) => readonly string[],
  ) {
    this._map = new Map<string, T[]>();
    this._array = [];
  }

  push(transfer: T): void {
    this._array.push(transfer);
    for (const tripId of this._extractInvolvedTripIds(transfer)) {
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
