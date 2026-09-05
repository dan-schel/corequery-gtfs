import type { GtfsTransfer } from "./gtfs-transfer.js";

export class GtfsBrokenTransfer {
  constructor(
    readonly transfer: GtfsTransfer,
    readonly serviceDay: Temporal.PlainDate,
  ) {}
}

export class GtfsAddedTransfer {
  constructor(
    readonly transfer: GtfsTransfer,
    readonly serviceDay: Temporal.PlainDate,
  ) {}
}
