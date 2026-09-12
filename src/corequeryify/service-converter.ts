import { assertNever } from "@dan-schel/js-utils";
import type {
  DepartureFields,
  ServiceFields,
  ServiceOriginatingMovementFields,
  ServicePassingMovementFields,
  ServiceRegularMovementFields,
  ServiceTerminatingMovementFields,
  ServiceConnectionFields,
} from "../corequery-types.js";
import { GtfsScheduledTrip } from "../data/gtfs-scheduled-trip.js";
import type { DeparturesIteratorResult } from "../departures/departures-iterator.js";
import { GtfsUpdatedTrip } from "../data/gtfs-updated-trip.js";
import { CorequeryIntrasourceId } from "./corequery-intrasource-id.js";
import type { GtfsScheduledTripMovement } from "../data/gtfs-scheduled-trip-movements.js";
import type { GtfsUpdatedTripMovement } from "../data/gtfs-updated-trip-movements.js";
import { GtfsEntireVehicleFormsServiceTransfer } from "../data/gtfs-transfer.js";
import type { GtfsSystem } from "../gtfs-system.js";

export type ServiceConverterFields<
  CorequeryDepartureClass,
  CorequeryServiceClass,
  CorequeryTagsClass,
  CorequeryServiceOriginatingMovementClass,
  CorequeryServiceRegularMovementClass,
  CorequeryServiceTerminatingMovementClass,
  CorequeryServicePassingMovementClass,
  CorequeryServiceConnectionClass,
> = {
  readonly sourceId: string;
  readonly gtfsSystem: GtfsSystem;

  buildDeparture: (
    fields: DepartureFields<CorequeryServiceClass>,
  ) => CorequeryDepartureClass;

  buildService: (
    fields: ServiceFields<
      CorequeryTagsClass,
      CorequeryServiceOriginatingMovementClass,
      CorequeryServiceRegularMovementClass,
      CorequeryServiceTerminatingMovementClass,
      CorequeryServicePassingMovementClass,
      CorequeryServiceConnectionClass
    >,
  ) => CorequeryServiceClass;

  buildTags: (tags: Set<number>) => CorequeryTagsClass;

  buildServiceOriginatingMovement: (
    fields: ServiceOriginatingMovementFields,
  ) => CorequeryServiceOriginatingMovementClass;

  buildServiceRegularMovement: (
    fields: ServiceRegularMovementFields,
  ) => CorequeryServiceRegularMovementClass;

  buildServiceTerminatingMovement: (
    fields: ServiceTerminatingMovementFields,
  ) => CorequeryServiceTerminatingMovementClass;

  buildServicePassingMovement: (
    fields: ServicePassingMovementFields,
  ) => CorequeryServicePassingMovementClass;

  buildServiceConnection: (
    fields: ServiceConnectionFields,
  ) => CorequeryServiceConnectionClass;
};

export class ServiceConverter<
  CorequeryDepartureClass,
  CorequeryServiceClass,
  CorequeryTagsClass,
  CorequeryServiceOriginatingMovementClass,
  CorequeryServiceRegularMovementClass,
  CorequeryServiceTerminatingMovementClass,
  CorequeryServicePassingMovementClass,
  CorequeryServiceConnectionClass,
> {
  private readonly _sourceId: string;
  private readonly _gtfsSystem: GtfsSystem;

  private readonly _buildDeparture: (
    fields: DepartureFields<CorequeryServiceClass>,
  ) => CorequeryDepartureClass;

  private readonly _buildService: (
    fields: ServiceFields<
      CorequeryTagsClass,
      CorequeryServiceOriginatingMovementClass,
      CorequeryServiceRegularMovementClass,
      CorequeryServiceTerminatingMovementClass,
      CorequeryServicePassingMovementClass,
      CorequeryServiceConnectionClass
    >,
  ) => CorequeryServiceClass;

  private readonly _buildTags: (tags: Set<number>) => CorequeryTagsClass;

  private readonly _buildServiceOriginatingMovement: (
    fields: ServiceOriginatingMovementFields,
  ) => CorequeryServiceOriginatingMovementClass;

  private readonly _buildServiceRegularMovement: (
    fields: ServiceRegularMovementFields,
  ) => CorequeryServiceRegularMovementClass;

  private readonly _buildServiceTerminatingMovement: (
    fields: ServiceTerminatingMovementFields,
  ) => CorequeryServiceTerminatingMovementClass;

  private readonly _buildServicePassingMovement: (
    fields: ServicePassingMovementFields,
  ) => CorequeryServicePassingMovementClass;

  private readonly _buildServiceConnection: (
    fields: ServiceConnectionFields,
  ) => CorequeryServiceConnectionClass;

  constructor(
    fields: ServiceConverterFields<
      CorequeryDepartureClass,
      CorequeryServiceClass,
      CorequeryTagsClass,
      CorequeryServiceOriginatingMovementClass,
      CorequeryServiceRegularMovementClass,
      CorequeryServiceTerminatingMovementClass,
      CorequeryServicePassingMovementClass,
      CorequeryServiceConnectionClass
    >,
  ) {
    this._sourceId = fields.sourceId;
    this._gtfsSystem = fields.gtfsSystem;

    this._buildDeparture = fields.buildDeparture;
    this._buildService = fields.buildService;
    this._buildTags = fields.buildTags;
    this._buildServiceOriginatingMovement =
      fields.buildServiceOriginatingMovement;
    this._buildServiceRegularMovement = fields.buildServiceRegularMovement;
    this._buildServiceTerminatingMovement =
      fields.buildServiceTerminatingMovement;
    this._buildServicePassingMovement = fields.buildServicePassingMovement;
    this._buildServiceConnection = fields.buildServiceConnection;
  }

  convertDeparture(
    result: DeparturesIteratorResult,
    timezone: string,
  ): CorequeryDepartureClass {
    if (result.trip instanceof GtfsScheduledTrip) {
      const service = this.convertScheduledTrip(
        result.trip,
        result.serviceDay,
        timezone,
      );
      return this._buildDeparture({
        service,
        movementIndex: result.movementIndex,
      });
    } else if (result.trip instanceof GtfsUpdatedTrip) {
      const service = this.convertUpdatedTrip(result.trip);
      return this._buildDeparture({
        service,
        movementIndex: result.movementIndex,
      });
    } else {
      assertNever(result.trip);
    }
  }

  convertScheduledTrip(
    trip: GtfsScheduledTrip,
    serviceDay: Temporal.PlainDate,
    timezone: string,
  ): CorequeryServiceClass {
    const id = new CorequeryIntrasourceId(trip.gtfsTripId, serviceDay);

    return this._buildService({
      sourceId: this._sourceId,
      intrasourceId: id.toString(),

      lineIds: trip.lineIds,
      tags: this._buildTags(new Set(trip.serviceTags)),
      color: trip.color,

      liveDataType: "scheduled",
      movements: trip.movements.map((m) =>
        this._convertScheduledTripMovement(m, serviceDay, timezone),
      ),
      isCancelled: false,

      connections: this._convertConnections(trip, serviceDay),
    });
  }

  convertUpdatedTrip(trip: GtfsUpdatedTrip): CorequeryServiceClass {
    const id = new CorequeryIntrasourceId(trip.gtfsTripId, trip.serviceDay);

    return this._buildService({
      sourceId: this._sourceId,
      intrasourceId: id.toString(),

      lineIds: trip.lineIds,
      tags: this._buildTags(new Set(trip.serviceTags)),
      color: trip.color,

      liveDataType: "updated",
      movements: trip.movements.map((m) => this._convertUpdatedTripMovement(m)),
      isCancelled: trip.isCancelled,

      connections: this._convertConnections(trip, trip.serviceDay),
    });
  }

  private _convertScheduledTripMovement(
    movement: GtfsScheduledTripMovement,
    serviceDay: Temporal.PlainDate,
    timezone: string,
  ):
    | CorequeryServiceOriginatingMovementClass
    | CorequeryServiceRegularMovementClass
    | CorequeryServiceTerminatingMovementClass
    | CorequeryServicePassingMovementClass {
    if (movement.type === "originating") {
      return this._buildServiceOriginatingMovement({
        stopId: movement.stopId,
        originalPositionId: movement.positionId,
        updatedPositionId: null,

        departureTimeType: "scheduled-time",
        departureTime: movement.departureTime.toInstant(serviceDay, timezone),
        formerDepartureTime: null,
      });
    } else if (movement.type === "regular") {
      return this._buildServiceRegularMovement({
        stopId: movement.stopId,
        originalPositionId: movement.positionId,
        updatedPositionId: null,

        arrivalTimeType: "scheduled-time",
        arrivalTime: movement.arrivalTime.toInstant(serviceDay, timezone),
        formerArrivalTime: null,

        departureTimeType: "scheduled-time",
        departureTime: movement.departureTime.toInstant(serviceDay, timezone),
        formerDepartureTime: null,

        picksUp: movement.picksUp,
        dropsOff: movement.dropsOff,
      });
    } else if (movement.type === "terminating") {
      return this._buildServiceTerminatingMovement({
        stopId: movement.stopId,
        originalPositionId: movement.positionId,
        updatedPositionId: null,

        arrivalTimeType: "scheduled-time",
        arrivalTime: movement.arrivalTime.toInstant(serviceDay, timezone),
        formerArrivalTime: null,
      });
    } else if (movement.type === "passing") {
      return this._buildServicePassingMovement({
        stopId: movement.stopId,
      });
    } else {
      assertNever(movement);
    }
  }

  private _convertUpdatedTripMovement(
    movement: GtfsUpdatedTripMovement,
  ):
    | CorequeryServiceOriginatingMovementClass
    | CorequeryServiceRegularMovementClass
    | CorequeryServiceTerminatingMovementClass
    | CorequeryServicePassingMovementClass {
    if (movement.type === "originating") {
      return this._buildServiceOriginatingMovement({
        stopId: movement.stopId,
        originalPositionId: movement.originalPositionId,
        updatedPositionId: movement.updatedPositionId,

        // TODO: Probably move this logic into the GtfsUpdatedTripMovement
        // classes themselves. I was hesitant at first because I didn't want
        // them to be concerned with Corequery's data format, but given that
        // this whole is meant to serve as a plugin to Corequery, it's probably
        // ok. (And we already do it with `Color` anyway!)
        //
        // When we start doing interpolation, I'll forget to update here, and
        // then the `departureTimeType` will be wrong!
        //
        // Note: If pushing things like `departureTimeType` into the
        // GtfsUpdatedTripMovement classes, why draw the line there? Why not
        // have a method on the movement classes to convert themselves into
        // Corequery's data format? Genuinely, is there an argument to be made?
        // Maybe the whole corequeryify folder should be removed?
        departureTimeType:
          movement.realtimeDepartureTime !== null
            ? "provided-live-time"
            : "scheduled-time",
        departureTime:
          movement.realtimeDepartureTime ?? movement.scheduledDepartureTime,
        formerDepartureTime:
          movement.realtimeDepartureTime !== null
            ? movement.scheduledDepartureTime
            : null,
      });
    } else if (movement.type === "regular") {
      return this._buildServiceRegularMovement({
        stopId: movement.stopId,
        originalPositionId: movement.originalPositionId,
        updatedPositionId: movement.updatedPositionId,

        arrivalTimeType:
          movement.realtimeArrivalTime !== null
            ? "provided-live-time"
            : "scheduled-time",
        arrivalTime:
          movement.realtimeArrivalTime ?? movement.scheduledArrivalTime,
        formerArrivalTime:
          movement.realtimeArrivalTime !== null
            ? movement.scheduledArrivalTime
            : null,

        departureTimeType:
          movement.realtimeDepartureTime !== null
            ? "provided-live-time"
            : "scheduled-time",
        departureTime:
          movement.realtimeDepartureTime ?? movement.scheduledDepartureTime,
        formerDepartureTime:
          movement.realtimeDepartureTime !== null
            ? movement.scheduledDepartureTime
            : null,

        picksUp: movement.picksUp,
        dropsOff: movement.dropsOff,
      });
    } else if (movement.type === "terminating") {
      return this._buildServiceTerminatingMovement({
        stopId: movement.stopId,
        originalPositionId: movement.originalPositionId,
        updatedPositionId: movement.updatedPositionId,

        arrivalTimeType:
          movement.realtimeArrivalTime !== null
            ? "provided-live-time"
            : "scheduled-time",
        arrivalTime:
          movement.realtimeArrivalTime ?? movement.scheduledArrivalTime,
        formerArrivalTime:
          movement.realtimeArrivalTime !== null
            ? movement.scheduledArrivalTime
            : null,
      });
    } else if (movement.type === "passing") {
      return this._buildServicePassingMovement({
        stopId: movement.stopId,
      });
    } else {
      assertNever(movement);
    }
  }

  private _convertConnections(
    trip: GtfsScheduledTrip | GtfsUpdatedTrip,
    serviceDay: Temporal.PlainDate,
  ) {
    const feed = this._gtfsSystem.requireFeed();

    return feed
      .getUpheldTransfersForTrip(trip.gtfsTripId, serviceDay)
      .map((transfer) => {
        if (transfer instanceof GtfsEntireVehicleFormsServiceTransfer) {
          const fromMe = transfer.fromTripId === trip.gtfsTripId;
          const otherTripId = fromMe ? transfer.toTripId : transfer.fromTripId;
          const otherTrip = feed.requireTrip(otherTripId, serviceDay);

          // Note: We don't need to check if the other trip is cancelled now,
          // since the transfer would be broken already in that case.

          const isid = new CorequeryIntrasourceId(otherTripId, serviceDay);
          const myFinalMovementIndex = trip.movements.length - 1;
          const otherFinalMovementIndex = otherTrip.movements.length;

          return this._buildServiceConnection({
            type: "entire-vehicle-forms-service",
            direction: fromMe ? "to-other" : "from-other",
            otherServiceSourceId: this._sourceId,
            otherServiceIntrasourceId: isid.toString(),
            movementIndex: fromMe ? myFinalMovementIndex : 0,
            otherServiceMovementIndex: fromMe ? 0 : otherFinalMovementIndex,
          });
        } else {
          assertNever(transfer);
        }
      });
  }
}
