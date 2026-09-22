import type { IGtfsScheduledTripMovement } from "./types.js";
import { GtfsUpdatedTripPassingMovement } from "../updated/gtfs-updated-trip-passing-movement.js";
import type { ServicePassingMovementFields } from "../../../corequery-types.js";

export type GtfsScheduledTripPassingMovementFields = {
  readonly stopId: number;
};

export class GtfsScheduledTripPassingMovement implements IGtfsScheduledTripMovement {
  readonly stopId: number;

  constructor(fields: GtfsScheduledTripPassingMovementFields) {
    this.stopId = fields.stopId;
  }

  get type() {
    return "passing" as const;
  }

  get isServicing() {
    return false as const;
  }

  get isNonTerminal() {
    return true as const;
  }

  with(
    newValues: Partial<GtfsScheduledTripPassingMovementFields>,
  ): GtfsScheduledTripPassingMovement {
    return new GtfsScheduledTripPassingMovement({ ...this, ...newValues });
  }

  asHollowUpdatedTripMovement(
    _serviceDay: Temporal.PlainDate,
    _timezone: string,
  ): GtfsUpdatedTripPassingMovement {
    return new GtfsUpdatedTripPassingMovement({
      stopId: this.stopId,
    });
  }

  asDelayedUpdatedTripMovement(
    _serviceDay: Temporal.PlainDate,
    _timezone: string,
    _delayMins: number,
  ): GtfsUpdatedTripPassingMovement {
    return new GtfsUpdatedTripPassingMovement({
      stopId: this.stopId,
    });
  }

  asCorequeryFields(): ServicePassingMovementFields {
    return {
      stopId: this.stopId,
    };
  }
}
