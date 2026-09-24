import type { ServicePassingMovementFields } from "../../../corequery-types.js";
import type { IGtfsAddedTripMovement } from "./types.js";

export type GtfsAddedTripPassingMovementFields = {
  readonly stopId: number;
};

export class GtfsAddedTripPassingMovement implements IGtfsAddedTripMovement {
  readonly stopId: number;

  constructor(fields: GtfsAddedTripPassingMovementFields) {
    this.stopId = fields.stopId;
  }

  with(
    newValues: Partial<GtfsAddedTripPassingMovementFields>,
  ): GtfsAddedTripPassingMovement {
    return new GtfsAddedTripPassingMovement({ ...this, ...newValues });
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

  asCorequeryFields(): ServicePassingMovementFields {
    return {
      stopId: this.stopId,
    };
  }
}
