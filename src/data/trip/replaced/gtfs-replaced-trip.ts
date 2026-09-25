import { itsOk } from "@dan-schel/js-utils";
import type { GtfsScheduledTrip } from "../scheduled/gtfs-scheduled-trip.js";
import type { GtfsReplacedTripMovement } from "./types.js";
import type { GtfsReplacedTripOriginatingMovement } from "./gtfs-replaced-trip-originating-movement.js";
import type { GtfsReplacedTripTerminatingMovement } from "./gtfs-replaced-trip-terminating-movement.js";
import type { Color } from "../../../corequery-types.js";

type GtfsReplacedTripFields = {
  readonly scheduledTrip: GtfsScheduledTrip;

  readonly serviceDay: Temporal.PlainDate;
  readonly movements: readonly GtfsReplacedTripMovement[];

  readonly lineIds: readonly number[];
  readonly serviceTags: readonly number[];
  readonly color: Color | null;
};

export class GtfsReplacedTrip {
  readonly scheduledTrip: GtfsScheduledTrip;

  // An replaced trip is not recurring. It only ever applies to a single
  // instance of a trip.
  readonly serviceDay: Temporal.PlainDate;

  readonly movements: readonly GtfsReplacedTripMovement[];

  // These fields cannot be pulled from the scheduled trip, as the change in
  // movements may mean the service now falls under a different line, has
  // different service tags, etc.
  //
  // Consider a train on the Pakenham line which is updated to terminate early
  // at Dandenong. Now the Cranbourne line's routes match this trip, so it will
  // be added to the `lineIds` array due to "bonus lines".
  //
  // A more extreme case would be a service getting completely transposed
  // between lines, which could impact even the color. I doubt PTV would do this
  // sort of thing in the GTFS feed. They'd probably just cancel a service and
  // add a new one, but I don't know that for sure, and if they _do_, we want to
  // account for it!
  readonly lineIds: readonly number[];
  readonly serviceTags: readonly number[];
  readonly color: Color | null;

  constructor(fields: GtfsReplacedTripFields) {
    this.scheduledTrip = fields.scheduledTrip;
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

  with(newValues: Partial<GtfsReplacedTripFields>): GtfsReplacedTrip {
    return new GtfsReplacedTrip({ ...this, ...newValues });
  }

  get gtfsTripId(): string {
    return this.scheduledTrip.gtfsTripId;
  }

  get origination(): GtfsReplacedTripOriginatingMovement {
    const firstMovement = this.movements[0];
    if (firstMovement?.type === "originating") return firstMovement;

    // Can't happen. Checked in constructor.
    throw new Error();
  }

  get termination(): GtfsReplacedTripTerminatingMovement {
    const lastMovement = this.movements.at(-1);
    if (lastMovement?.type === "terminating") return lastMovement;

    // Can't happen. Checked in constructor.
    throw new Error();
  }

  requireMovementIndex(movement: GtfsReplacedTripMovement): number {
    const index = this.movements.indexOf(movement);
    if (index === -1) throw new Error("Movement not found in trip.");
    return index;
  }
}
