import type { ServicePassingMovementFields } from "../../../corequery-types.js";
import type { IGtfsReplacedTripMovement } from "./types.js";

export type GtfsReplacedTripPassingMovementFields = {
  readonly stopId: number;
};

export class GtfsReplacedTripPassingMovement implements IGtfsReplacedTripMovement {
  readonly stopId: number;

  constructor(fields: GtfsReplacedTripPassingMovementFields) {
    this.stopId = fields.stopId;
  }

  with(
    newValues: Partial<GtfsReplacedTripPassingMovementFields>,
  ): GtfsReplacedTripPassingMovement {
    return new GtfsReplacedTripPassingMovement({ ...this, ...newValues });
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
