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
import { GtfsScheduledTrip } from "../data/trip/scheduled/gtfs-scheduled-trip.js";
import type { DeparturesIteratorResult } from "../departures/iterator/departures-iterator.js";
import { GtfsUpdatedTrip } from "../data/trip/updated/gtfs-updated-trip.js";
import { CorequeryIntrasourceId } from "./corequery-intrasource-id.js";
import type { GtfsScheduledTripMovement } from "../data/trip/scheduled/types.js";
import { GtfsEntireVehicleFormsServiceTransfer } from "../data/gtfs-transfer.js";
import type { GtfsSystem } from "../gtfs-system.js";
import type { GtfsRealtimeTripMovement, GtfsTrip } from "../data/trip/types.js";
import { GtfsAddedTrip } from "../data/trip/added/gtfs-added-trip.js";
import { GtfsReplacedTrip } from "../data/trip/replaced/gtfs-replaced-trip.js";

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

  readonly buildDeparture: (
    fields: DepartureFields<CorequeryServiceClass>,
  ) => CorequeryDepartureClass;

  readonly buildService: (
    fields: ServiceFields<
      CorequeryTagsClass,
      CorequeryServiceOriginatingMovementClass,
      CorequeryServiceRegularMovementClass,
      CorequeryServiceTerminatingMovementClass,
      CorequeryServicePassingMovementClass,
      CorequeryServiceConnectionClass
    >,
  ) => CorequeryServiceClass;

  readonly buildTags: (tags: Set<number>) => CorequeryTagsClass;

  readonly buildServiceOriginatingMovement: (
    fields: ServiceOriginatingMovementFields,
  ) => CorequeryServiceOriginatingMovementClass;

  readonly buildServiceRegularMovement: (
    fields: ServiceRegularMovementFields,
  ) => CorequeryServiceRegularMovementClass;

  readonly buildServiceTerminatingMovement: (
    fields: ServiceTerminatingMovementFields,
  ) => CorequeryServiceTerminatingMovementClass;

  readonly buildServicePassingMovement: (
    fields: ServicePassingMovementFields,
  ) => CorequeryServicePassingMovementClass;

  readonly buildServiceConnection: (
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
    } else if (result.trip instanceof GtfsAddedTrip) {
      const service = this.convertAddedTrip(result.trip);
      return this._buildDeparture({
        service,
        movementIndex: result.movementIndex,
      });
    } else if (result.trip instanceof GtfsReplacedTrip) {
      const service = this.convertReplacedTrip(result.trip);
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

    // TODO: Consider pushing this onto the scheduled trip class, and likewise
    // for the realtime trip methods below. (Pass the converter as a parameter,
    // or create some sort of ConversionContext class to pass, so that
    // GtfsScheduledTrip has access to the _buildTags, etc. methods?)
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
      movements: trip.movements.map((m) =>
        this._convertRealtimeTripMovement(m),
      ),
      isCancelled: trip.isCancelled,

      connections: this._convertConnections(trip, trip.serviceDay),
    });
  }

  convertAddedTrip(trip: GtfsAddedTrip): CorequeryServiceClass {
    const id = new CorequeryIntrasourceId(trip.gtfsTripId, trip.serviceDay);

    return this._buildService({
      sourceId: this._sourceId,
      intrasourceId: id.toString(),

      lineIds: trip.lineIds,
      tags: this._buildTags(new Set(trip.serviceTags)),
      color: trip.color,

      liveDataType: "added",
      movements: trip.movements.map((m) =>
        this._convertRealtimeTripMovement(m),
      ),
      isCancelled: false,

      connections: this._convertConnections(trip, trip.serviceDay),
    });
  }

  convertReplacedTrip(trip: GtfsReplacedTrip): CorequeryServiceClass {
    const id = new CorequeryIntrasourceId(trip.gtfsTripId, trip.serviceDay);

    return this._buildService({
      sourceId: this._sourceId,
      intrasourceId: id.toString(),

      lineIds: trip.lineIds,
      tags: this._buildTags(new Set(trip.serviceTags)),
      color: trip.color,

      liveDataType: "updated",
      movements: trip.movements.map((m) =>
        this._convertRealtimeTripMovement(m),
      ),
      isCancelled: false,

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
      return this._buildServiceOriginatingMovement(
        movement.asCorequeryFields(serviceDay, timezone),
      );
    } else if (movement.type === "regular") {
      return this._buildServiceRegularMovement(
        movement.asCorequeryFields(serviceDay, timezone),
      );
    } else if (movement.type === "terminating") {
      return this._buildServiceTerminatingMovement(
        movement.asCorequeryFields(serviceDay, timezone),
      );
    } else if (movement.type === "passing") {
      return this._buildServicePassingMovement(movement.asCorequeryFields());
    } else {
      assertNever(movement);
    }
  }

  private _convertRealtimeTripMovement(
    movement: GtfsRealtimeTripMovement,
  ):
    | CorequeryServiceOriginatingMovementClass
    | CorequeryServiceRegularMovementClass
    | CorequeryServiceTerminatingMovementClass
    | CorequeryServicePassingMovementClass {
    if (movement.type === "originating") {
      return this._buildServiceOriginatingMovement(
        movement.asCorequeryFields(),
      );
    } else if (movement.type === "regular") {
      return this._buildServiceRegularMovement(movement.asCorequeryFields());
    } else if (movement.type === "terminating") {
      return this._buildServiceTerminatingMovement(
        movement.asCorequeryFields(),
      );
    } else if (movement.type === "passing") {
      return this._buildServicePassingMovement(movement.asCorequeryFields());
    } else {
      assertNever(movement);
    }
  }

  private _convertConnections(trip: GtfsTrip, serviceDay: Temporal.PlainDate) {
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
