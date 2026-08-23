import { itsOk } from "@dan-schel/js-utils";
import type { GtfsScheduledTrip } from "./gtfs-scheduled-trip.js";
import type {
  GtfsUpdatedTripMovement,
  GtfsUpdatedTripOriginatingMovement,
  GtfsUpdatedTripTerminatingMovement,
} from "./gtfs-updated-trip-movements.js";
import type { Color } from "../corequery-types.js";

type GtfsUpdatedTripFields = {
  readonly scheduledTrip: GtfsScheduledTrip;

  readonly serviceDay: Temporal.PlainDate;

  readonly movements: readonly GtfsUpdatedTripMovement[];
  readonly isCancelled: boolean;
};

export class GtfsUpdatedTrip {
  readonly scheduledTrip: GtfsScheduledTrip;

  // An updated trip is not recurring. It only ever applies to a single
  // instance of a trip.
  readonly serviceDay: Temporal.PlainDate;

  readonly movements: readonly GtfsUpdatedTripMovement[];
  readonly isCancelled: boolean;

  constructor(fields: GtfsUpdatedTripFields) {
    this.scheduledTrip = fields.scheduledTrip;
    this.serviceDay = fields.serviceDay;
    this.movements = fields.movements;
    this.isCancelled = fields.isCancelled;

    if (this.movements.length < 2) throw new Error("Must have 2+ movements.");

    const originOk = itsOk(this.movements[0]).type === "originating";
    const terminusOk = itsOk(this.movements.at(-1)).type === "terminating";
    const othersOk = this.movements.slice(1, -1).every((m) => m.isNonTerminal);
    if (!originOk) throw new Error("First movement of wrong type.");
    if (!terminusOk) throw new Error("Last movement of wrong type");
    if (!othersOk) throw new Error("Some terminal movements in wrong places.");
  }

  with(newValues: Partial<GtfsUpdatedTripFields>): GtfsUpdatedTrip {
    return new GtfsUpdatedTrip({ ...this, ...newValues });
  }

  get gtfsTripId(): string {
    return this.scheduledTrip.gtfsTripId;
  }

  get origination(): GtfsUpdatedTripOriginatingMovement {
    const firstMovement = this.movements[0];
    if (firstMovement?.type === "originating") return firstMovement;

    // Can't happen. Checked in constructor.
    throw new Error();
  }

  get termination(): GtfsUpdatedTripTerminatingMovement {
    const lastMovement = this.movements.at(-1);
    if (lastMovement?.type === "terminating") return lastMovement;

    // Can't happen. Checked in constructor.
    throw new Error();
  }

  requireMovementIndex(movement: GtfsUpdatedTripMovement): number {
    const index = this.movements.indexOf(movement);
    if (index === -1) throw new Error("Movement not found in trip.");
    return index;
  }

  get lineIds(): readonly number[] {
    // TODO: I don't think we're gonna represent trips where the realtime data
    // changes the stop list entirely as GtfsUpdatedTrip (they're probably gonna
    // be GtfsReplacedTrip, GtfsAddedTrip, or something), but IF WE DID, this
    // mightn't be correct all the time.
    //
    // e.g. if an East Pakenham service terminates early at Dandenong, the
    // scheduled trip data will say "Pakenham line", but now the updated trip
    // has effectively also become a Cranbourne line service. To support that,
    // an updated trip might need to have its own `lineIds` property (and
    // `serviceTags` property).
    //
    // The same goes for `color`, but only if it can represent cases where we
    // ADD stops and therefore an updated trip could be on an entirely different
    // line than the scheduled one, e.g. for a service diverted from the
    // Pakenham line to the Cranbourne line or whatever. It's not a perfect
    // example because they're the same color in that case, but while highly
    // unlikely, it's not IMPOSSIBLE that this could happen across lines with
    // different colors.
    return this.scheduledTrip.lineIds;
  }

  get serviceTags(): readonly number[] {
    return this.scheduledTrip.serviceTags;
  }

  get color(): Color | null {
    return this.scheduledTrip.color;
  }

  static unmodified(
    trip: GtfsScheduledTrip,
    serviceDay: Temporal.PlainDate,
    timezone: string,
  ): GtfsUpdatedTrip {
    return new GtfsUpdatedTrip({
      scheduledTrip: trip,
      serviceDay,
      movements: trip.movements.map((m) =>
        m.asHollowUpdatedTripMovement(serviceDay, timezone),
      ),
      isCancelled: false,
    });
  }
}
