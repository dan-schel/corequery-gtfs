import type { GtfsTransfer } from "./gtfs-transfer.js";

export class GtfsBrokenTransfer {
  constructor(
    readonly transfer: GtfsTransfer,
    readonly serviceDay: Temporal.PlainDate,
  ) {}

  equals(other: GtfsBrokenTransfer): boolean {
    return (
      this.transfer.equals(other.transfer) &&
      this.serviceDay.equals(other.serviceDay)
    );
  }
}

export class GtfsAddedTransfer {
  constructor(
    readonly transfer: GtfsTransfer,
    readonly serviceDay: Temporal.PlainDate,
  ) {}
}
