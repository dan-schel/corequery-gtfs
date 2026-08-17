import type { GtfsStopTime } from "./gtfs-stop-time.js";
import {
  GtfsUpdatedTripOriginatingMovement,
  GtfsUpdatedTripPassingMovement,
  GtfsUpdatedTripRegularMovement,
  GtfsUpdatedTripTerminatingMovement,
  type GtfsUpdatedTripMovement,
} from "./gtfs-updated-trip-movements.js";
import type { StopGtfsIdMetadata } from "./ids/stop-gtfs-id-metadata.js";

export type GtfsScheduledTripMovement =
  | GtfsScheduledTripOriginatingMovement
  | GtfsScheduledTripRegularMovement
  | GtfsScheduledTripTerminatingMovement
  | GtfsScheduledTripPassingMovement;

export type GtfsScheduledTripServicingMovement =
  | GtfsScheduledTripOriginatingMovement
  | GtfsScheduledTripRegularMovement
  | GtfsScheduledTripTerminatingMovement;

type PromotionToUpdatedTripFields = {
  readonly arrivalTime: Temporal.Instant | null;
  readonly departureTime: Temporal.Instant | null;
  readonly updatedPositionId: number | null;
  readonly updatedGtfsIdMetadata: StopGtfsIdMetadata;
  readonly serviceDay: Temporal.PlainDate;
  readonly timezone: string;
};

// I don't normally use interfaces, but here they're just acting as a way to
// force the classes to conform to a particular consistent set of properties,
// while stilll allowing them to further narrow the type, e.g. the `type`
// property isn't generically typed as `string` as it would be if I used an
// abstract class.
interface IGtfsScheduledTripMovement {
  readonly stopId: number;

  get type(): string;
  get isServicing(): boolean;
  get isNonTerminal(): boolean;
  asHollowUpdatedTripMovement(
    serviceDay: Temporal.PlainDate,
    timezone: string,
  ): GtfsUpdatedTripMovement;
  asDelayedUpdatedTripMovement(
    serviceDay: Temporal.PlainDate,
    timezone: string,
    delayMins: number,
  ): GtfsUpdatedTripMovement;
}
interface IGtfsScheduledTripServicingMovement extends IGtfsScheduledTripMovement {
  readonly positionId: number | null;
  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;

  get isServicing(): true;
  get timeRelevantToDeparturesAlgorithm(): GtfsStopTime;

  asUpdatedTripMovement(
    values: PromotionToUpdatedTripFields,
  ): GtfsUpdatedTripMovement;
}

type GtfsScheduledTripOriginatingMovementFields = {
  readonly stopId: number;
  readonly positionId: number | null;
  readonly departureTime: GtfsStopTime;
  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;
};

type GtfsScheduledTripRegularMovementFields = {
  readonly stopId: number;
  readonly positionId: number | null;
  readonly arrivalTime: GtfsStopTime;
  readonly departureTime: GtfsStopTime;
  readonly picksUp: boolean;
  readonly dropsOff: boolean;
  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;
};

type GtfsScheduledTripTerminatingMovementFields = {
  readonly stopId: number;
  readonly positionId: number | null;
  readonly arrivalTime: GtfsStopTime;
  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;
};

type GtfsScheduledTripPassingMovementFields = {
  readonly stopId: number;
};

export class GtfsScheduledTripOriginatingMovement implements IGtfsScheduledTripServicingMovement {
  readonly stopId: number;
  readonly positionId: number | null;
  readonly departureTime: GtfsStopTime;
  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;

  constructor(fields: GtfsScheduledTripOriginatingMovementFields) {
    this.stopId = fields.stopId;
    this.positionId = fields.positionId;
    this.departureTime = fields.departureTime;
    this.gtfsIdMetadata = fields.gtfsIdMetadata;
    this.gtfsStopSequence = fields.gtfsStopSequence;
  }

  get type() {
    return "originating" as const;
  }
  get isServicing() {
    return true as const;
  }
  get isNonTerminal() {
    return false as const;
  }
  get timeRelevantToDeparturesAlgorithm() {
    return this.departureTime;
  }

  with(
    newValues: Partial<GtfsScheduledTripOriginatingMovementFields>,
  ): GtfsScheduledTripOriginatingMovement {
    return new GtfsScheduledTripOriginatingMovement({ ...this, ...newValues });
  }

  asHollowUpdatedTripMovement(
    serviceDay: Temporal.PlainDate,
    timezone: string,
  ): GtfsUpdatedTripOriginatingMovement {
    return new GtfsUpdatedTripOriginatingMovement({
      stopId: this.stopId,
      originalPositionId: this.positionId,
      scheduledDepartureTime: this.departureTime.toInstant(
        serviceDay,
        timezone,
      ),
      originalGtfsIdMetadata: this.gtfsIdMetadata,
      gtfsStopSequence: this.gtfsStopSequence,

      // But no realtime data.
      realtimeDepartureTime: null,
      updatedPositionId: this.positionId,
      updatedGtfsIdMetadata: this.gtfsIdMetadata,
    });
  }

  asUpdatedTripMovement(
    values: PromotionToUpdatedTripFields,
  ): GtfsUpdatedTripOriginatingMovement {
    return new GtfsUpdatedTripOriginatingMovement({
      stopId: this.stopId,
      originalPositionId: this.positionId,
      scheduledDepartureTime: this.departureTime.toInstant(
        values.serviceDay,
        values.timezone,
      ),
      originalGtfsIdMetadata: this.gtfsIdMetadata,
      gtfsStopSequence: this.gtfsStopSequence,

      // Realtime data.
      realtimeDepartureTime: values.departureTime,
      updatedPositionId: values.updatedPositionId,
      updatedGtfsIdMetadata: values.updatedGtfsIdMetadata,
    });
  }

  asDelayedUpdatedTripMovement(
    serviceDay: Temporal.PlainDate,
    timezone: string,
    delayMins: number,
  ): GtfsUpdatedTripOriginatingMovement {
    return this.asHollowUpdatedTripMovement(serviceDay, timezone).with({
      realtimeDepartureTime: this.departureTime
        .toInstant(serviceDay, timezone)
        .add({ minutes: delayMins }),
    });
  }
}

export class GtfsScheduledTripRegularMovement implements IGtfsScheduledTripServicingMovement {
  readonly stopId: number;
  readonly positionId: number | null;
  readonly arrivalTime: GtfsStopTime;
  readonly departureTime: GtfsStopTime;
  readonly picksUp: boolean;
  readonly dropsOff: boolean;
  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;

  constructor(fields: GtfsScheduledTripRegularMovementFields) {
    this.stopId = fields.stopId;
    this.positionId = fields.positionId;
    this.arrivalTime = fields.arrivalTime;
    this.departureTime = fields.departureTime;
    this.picksUp = fields.picksUp;
    this.dropsOff = fields.dropsOff;
    this.gtfsIdMetadata = fields.gtfsIdMetadata;
    this.gtfsStopSequence = fields.gtfsStopSequence;
  }

  get type() {
    return "regular" as const;
  }
  get isServicing() {
    return true as const;
  }
  get isNonTerminal() {
    return true as const;
  }
  get timeRelevantToDeparturesAlgorithm() {
    return this.departureTime;
  }

  with(
    newValues: Partial<GtfsScheduledTripRegularMovementFields>,
  ): GtfsScheduledTripRegularMovement {
    return new GtfsScheduledTripRegularMovement({ ...this, ...newValues });
  }

  asHollowUpdatedTripMovement(
    serviceDay: Temporal.PlainDate,
    timezone: string,
  ): GtfsUpdatedTripRegularMovement {
    return new GtfsUpdatedTripRegularMovement({
      stopId: this.stopId,
      originalPositionId: this.positionId,
      scheduledArrivalTime: this.arrivalTime.toInstant(serviceDay, timezone),
      scheduledDepartureTime: this.departureTime.toInstant(
        serviceDay,
        timezone,
      ),
      picksUp: this.picksUp,
      dropsOff: this.dropsOff,
      originalGtfsIdMetadata: this.gtfsIdMetadata,
      gtfsStopSequence: this.gtfsStopSequence,

      // But no realtime data.
      realtimeArrivalTime: null,
      realtimeDepartureTime: null,
      updatedPositionId: this.positionId,
      updatedGtfsIdMetadata: this.gtfsIdMetadata,
    });
  }

  asUpdatedTripMovement(
    values: PromotionToUpdatedTripFields,
  ): GtfsUpdatedTripRegularMovement {
    return new GtfsUpdatedTripRegularMovement({
      stopId: this.stopId,
      originalPositionId: this.positionId,
      scheduledArrivalTime: this.arrivalTime.toInstant(
        values.serviceDay,
        values.timezone,
      ),
      scheduledDepartureTime: this.departureTime.toInstant(
        values.serviceDay,
        values.timezone,
      ),
      picksUp: this.picksUp,
      dropsOff: this.dropsOff,
      originalGtfsIdMetadata: this.gtfsIdMetadata,
      gtfsStopSequence: this.gtfsStopSequence,

      // Realtime data.
      realtimeArrivalTime: values.arrivalTime,
      realtimeDepartureTime: values.departureTime,
      updatedPositionId: values.updatedPositionId,
      updatedGtfsIdMetadata: values.updatedGtfsIdMetadata,
    });
  }

  asDelayedUpdatedTripMovement(
    serviceDay: Temporal.PlainDate,
    timezone: string,
    delayMins: number,
  ): GtfsUpdatedTripRegularMovement {
    return this.asHollowUpdatedTripMovement(serviceDay, timezone).with({
      realtimeArrivalTime: this.arrivalTime
        .toInstant(serviceDay, timezone)
        .add({ minutes: delayMins }),
      realtimeDepartureTime: this.departureTime
        .toInstant(serviceDay, timezone)
        .add({ minutes: delayMins }),
    });
  }
}

export class GtfsScheduledTripTerminatingMovement implements IGtfsScheduledTripServicingMovement {
  readonly stopId: number;
  readonly positionId: number | null;
  readonly arrivalTime: GtfsStopTime;
  readonly gtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;

  constructor(fields: GtfsScheduledTripTerminatingMovementFields) {
    this.stopId = fields.stopId;
    this.positionId = fields.positionId;
    this.arrivalTime = fields.arrivalTime;
    this.gtfsIdMetadata = fields.gtfsIdMetadata;
    this.gtfsStopSequence = fields.gtfsStopSequence;
  }

  get type() {
    return "terminating" as const;
  }
  get isServicing() {
    return true as const;
  }
  get isNonTerminal() {
    return false as const;
  }
  get timeRelevantToDeparturesAlgorithm() {
    return this.arrivalTime;
  }

  with(
    newValues: Partial<GtfsScheduledTripTerminatingMovementFields>,
  ): GtfsScheduledTripTerminatingMovement {
    return new GtfsScheduledTripTerminatingMovement({ ...this, ...newValues });
  }

  asHollowUpdatedTripMovement(
    serviceDay: Temporal.PlainDate,
    timezone: string,
  ): GtfsUpdatedTripTerminatingMovement {
    return new GtfsUpdatedTripTerminatingMovement({
      stopId: this.stopId,
      originalPositionId: this.positionId,
      scheduledArrivalTime: this.arrivalTime.toInstant(serviceDay, timezone),
      originalGtfsIdMetadata: this.gtfsIdMetadata,
      gtfsStopSequence: this.gtfsStopSequence,

      // But no realtime data.
      realtimeArrivalTime: null,
      updatedPositionId: this.positionId,
      updatedGtfsIdMetadata: this.gtfsIdMetadata,
    });
  }

  asUpdatedTripMovement(
    values: PromotionToUpdatedTripFields,
  ): GtfsUpdatedTripTerminatingMovement {
    return new GtfsUpdatedTripTerminatingMovement({
      stopId: this.stopId,
      originalPositionId: this.positionId,
      scheduledArrivalTime: this.arrivalTime.toInstant(
        values.serviceDay,
        values.timezone,
      ),
      originalGtfsIdMetadata: this.gtfsIdMetadata,
      gtfsStopSequence: this.gtfsStopSequence,

      // Realtime data.
      realtimeArrivalTime: values.arrivalTime,
      updatedPositionId: values.updatedPositionId,
      updatedGtfsIdMetadata: values.updatedGtfsIdMetadata,
    });
  }

  asDelayedUpdatedTripMovement(
    serviceDay: Temporal.PlainDate,
    timezone: string,
    delayMins: number,
  ): GtfsUpdatedTripTerminatingMovement {
    return this.asHollowUpdatedTripMovement(serviceDay, timezone).with({
      realtimeArrivalTime: this.arrivalTime
        .toInstant(serviceDay, timezone)
        .add({ minutes: delayMins }),
    });
  }
}

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
}
