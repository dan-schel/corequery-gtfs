import type { IGtfsUpdatedTripMovement } from "./types.js";

export type GtfsUpdatedTripPassingMovementFields = {
  readonly stopId: number;
};

export class GtfsUpdatedTripPassingMovement implements IGtfsUpdatedTripMovement {
  readonly stopId: number;

  constructor(fields: GtfsUpdatedTripPassingMovementFields) {
    this.stopId = fields.stopId;
  }

  with(
    newValues: Partial<GtfsUpdatedTripPassingMovementFields>,
  ): GtfsUpdatedTripPassingMovement {
    return new GtfsUpdatedTripPassingMovement({ ...this, ...newValues });
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
}
