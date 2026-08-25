import type { Color } from "../corequery-types.js";
import { GtfsCalendar } from "./gtfs-calendar.js";
import { itsOk } from "@dan-schel/js-utils";
import {
  GtfsScheduledTripOriginatingMovement,
  GtfsScheduledTripTerminatingMovement,
  type GtfsScheduledTripMovement,
} from "./gtfs-scheduled-trip-movements.js";
import type { GtfsStopTime } from "./gtfs-stop-time.js";

export type GtfsScheduledTripFields = {
  readonly gtfsTripId: string;
  readonly gtfsRouteId: string;
  readonly calendar: GtfsCalendar;
  readonly movements: readonly GtfsScheduledTripMovement[];
  readonly lineIds: readonly number[];
  readonly color: Color | null;
  readonly serviceTags: readonly number[];

  // TODO: This only supports 1-1 connections. You could theoretically have a
  // trip that runs to Ballarat, the train splits, and half goes to Ararat and
  // half goes to Maryborough. In that case, the Ballarat trip would have 2 next
  // trips. V/Line might also represent it as a train from Melbourne to Ararat
  // and a train from Ballarat to Maryborough, where the transfer happens at
  // Ballarat. Right now we expect the transfer to always be terminus to origin,
  // but that could change in the future.
  readonly previousTrip: GtfsScheduledTrip | null;
  readonly nextTrip: GtfsScheduledTrip | null;
};

export class GtfsScheduledTrip {
  readonly gtfsTripId: string;
  readonly gtfsRouteId: string;
  readonly calendar: GtfsCalendar;
  readonly movements: readonly GtfsScheduledTripMovement[];
  readonly lineIds: readonly number[];
  readonly color: Color | null;
  readonly serviceTags: readonly number[];
  readonly previousTrip: GtfsScheduledTrip | null;
  readonly nextTrip: GtfsScheduledTrip | null;

  constructor(fields: GtfsScheduledTripFields) {
    this.gtfsTripId = fields.gtfsTripId;
    this.gtfsRouteId = fields.gtfsRouteId;
    this.calendar = fields.calendar;
    this.movements = fields.movements;
    this.lineIds = fields.lineIds;
    this.color = fields.color;
    this.serviceTags = fields.serviceTags;
    this.previousTrip = fields.previousTrip;
    this.nextTrip = fields.nextTrip;

    if (this.lineIds.length < 1) throw new Error("Must have 1+ line IDs.");
    if (this.movements.length < 2) throw new Error("Must have 2+ movements.");

    const originOk = itsOk(this.movements[0]).type === "originating";
    const terminusOk = itsOk(this.movements.at(-1)).type === "terminating";
    const othersOk = this.movements.slice(1, -1).every((m) => m.isNonTerminal);
    if (!originOk) throw new Error("First movement of wrong type.");
    if (!terminusOk) throw new Error("Last movement of wrong type");
    if (!othersOk) throw new Error("Some terminal movements in wrong places.");
  }

  with(newValues: Partial<GtfsScheduledTripFields>): GtfsScheduledTrip {
    return new GtfsScheduledTrip({ ...this, ...newValues });
  }

  static connectAsTransfer(
    from: GtfsScheduledTrip,
    to: GtfsScheduledTrip,
  ): readonly [GtfsScheduledTrip, GtfsScheduledTrip] {
    return [from.with({ nextTrip: to }), to.with({ previousTrip: from })];
  }

  get origination(): GtfsScheduledTripOriginatingMovement {
    const firstMovement = this.movements[0];
    if (firstMovement?.type === "originating") return firstMovement;

    // Can't happen. Checked in constructor.
    throw new Error();
  }

  get termination(): GtfsScheduledTripTerminatingMovement {
    const lastMovement = this.movements.at(-1);
    if (lastMovement?.type === "terminating") return lastMovement;

    // Can't happen. Checked in constructor.
    throw new Error();
  }

  get finalTermination(): GtfsScheduledTripTerminatingMovement {
    if (this.nextTrip == null) return this.termination;

    return this.nextTrip.finalTermination;
  }

  requireMovementIndex(movement: GtfsScheduledTripMovement): number {
    const index = this.movements.indexOf(movement);
    if (index === -1) throw new Error("Movement not found in trip.");
    return index;
  }

  static simple({
    gtfsTripId,
    originStopId,
    originGtfsStopId = `stop-${originStopId}`,
    originationTime,
    terminusStopId,
    terminationTime,
    terminusGtfsStopId = `stop-${terminusStopId}`,
  }: {
    gtfsTripId: string;
    originStopId: number;
    originGtfsStopId?: string;
    originationTime: GtfsStopTime;
    terminusStopId: number;
    terminusGtfsStopId?: string;
    terminationTime: GtfsStopTime;
  }) {
    return new GtfsScheduledTrip({
      gtfsTripId,
      gtfsRouteId: "route-1",
      calendar: GtfsCalendar.everyday("cal-1"),
      movements: [
        new GtfsScheduledTripOriginatingMovement({
          stopId: originStopId,
          positionId: null,
          departureTime: originationTime,
          gtfsIdMetadata: {
            type: "parent",
            id: originGtfsStopId,
            stopId: originStopId,
          },
          gtfsStopSequence: 1,
        }),
        new GtfsScheduledTripTerminatingMovement({
          stopId: terminusStopId,
          positionId: null,
          arrivalTime: terminationTime,
          gtfsIdMetadata: {
            type: "parent",
            id: terminusGtfsStopId,
            stopId: terminusStopId,
          },
          gtfsStopSequence: 2,
        }),
      ],
      lineIds: [1],
      color: null,
      serviceTags: [],
      previousTrip: null,
      nextTrip: null,
    });
  }
}
