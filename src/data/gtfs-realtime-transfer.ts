import type { GtfsTransfer, IGtfsTransfer } from "./gtfs-transfer.js";

export class GtfsBrokenTransfer implements IGtfsTransfer {
  constructor(
    readonly transfer: GtfsTransfer,
    readonly serviceDay: Temporal.PlainDate,
  ) {}

  getInvolvedTripIds(): readonly string[] {
    return this.transfer.getInvolvedTripIds();
  }
}

export class GtfsAddedTransfer implements IGtfsTransfer {
  constructor(
    readonly transfer: GtfsTransfer,
    readonly serviceDay: Temporal.PlainDate,
  ) {}

  getInvolvedTripIds(): readonly string[] {
    return this.transfer.getInvolvedTripIds();
  }
}
