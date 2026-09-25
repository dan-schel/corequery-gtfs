import { itsOk } from "@dan-schel/js-utils";
import type { GtfsAddedTripMovement } from "./types.js";
import type { GtfsAddedTripOriginatingMovement } from "./gtfs-added-trip-originating-movement.js";
import type { GtfsAddedTripTerminatingMovement } from "./gtfs-added-trip-terminating-movement.js";
import type { Color } from "../../../corequery-types.js";

type GtfsAddedTripFields = {
  readonly gtfsTripId: string;
  readonly serviceDay: Temporal.PlainDate;
  readonly movements: readonly GtfsAddedTripMovement[];
  readonly lineIds: readonly number[];
  readonly serviceTags: readonly number[];
  readonly color: Color | null;
};

export class GtfsAddedTrip {
  readonly gtfsTripId: string;
  readonly serviceDay: Temporal.PlainDate;
  readonly movements: readonly GtfsAddedTripMovement[];
  readonly lineIds: readonly number[];
  readonly serviceTags: readonly number[];
  readonly color: Color | null;

  constructor(fields: GtfsAddedTripFields) {
    this.gtfsTripId = fields.gtfsTripId;
    this.serviceDay = fields.serviceDay;
    this.movements = fields.movements;
    this.lineIds = fields.lineIds;
    this.serviceTags = fields.serviceTags;
    this.color = fields.color;

    if (this.movements.length < 2) throw new Error("Must have 2+ movements.");

    const originOk = itsOk(this.movements[0]).type === "originating";
    const terminusOk = itsOk(this.movements.at(-1)).type === "terminating";
    const othersOk = this.movements.slice(1, -1).every((m) => m.isNonTerminal);
    if (!originOk) throw new Error("First movement of wrong type.");
    if (!terminusOk) throw new Error("Last movement of wrong type");
    if (!othersOk) throw new Error("Some terminal movements in wrong places.");
  }

  with(newValues: Partial<GtfsAddedTripFields>): GtfsAddedTrip {
    return new GtfsAddedTrip({ ...this, ...newValues });
  }

  get origination(): GtfsAddedTripOriginatingMovement {
    const firstMovement = this.movements[0];
    if (firstMovement?.type === "originating") return firstMovement;

    // Can't happen. Checked in constructor.
    throw new Error();
  }

  get termination(): GtfsAddedTripTerminatingMovement {
    const lastMovement = this.movements.at(-1);
    if (lastMovement?.type === "terminating") return lastMovement;

    // Can't happen. Checked in constructor.
    throw new Error();
  }

  requireMovementIndex(movement: GtfsAddedTripMovement): number {
    const index = this.movements.indexOf(movement);
    if (index === -1) throw new Error("Movement not found in trip.");
    return index;
  }
}
