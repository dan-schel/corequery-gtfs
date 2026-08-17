import { itsOk } from "@dan-schel/js-utils";
import type { GtfsScheduledTrip } from "./gtfs-scheduled-trip.js";
import type {
  GtfsUpdatedTripMovement,
  GtfsUpdatedTripOriginatingMovement,
  GtfsUpdatedTripTerminatingMovement,
} from "./gtfs-updated-trip-movements.js";

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
