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

export type ServiceConverterFields<
  CorequeryDepartureClass,
  CorequeryServiceClass,
  CorequeryTagsClass,
  CorequeryServiceOriginatingMovementClass,
  CorequeryServicePassingMovementClass,
  CorequeryServiceRegularMovementClass,
  CorequeryServiceTerminatingMovementClass,
  CorequeryServiceConnectionClass,
> = {
  buildDeparture: (
    fields: DepartureFields<CorequeryServiceClass>,
  ) => CorequeryDepartureClass;

  buildService: (
    fields: ServiceFields<
      CorequeryTagsClass,
      CorequeryServiceOriginatingMovementClass,
      CorequeryServicePassingMovementClass,
      CorequeryServiceRegularMovementClass,
      CorequeryServiceTerminatingMovementClass,
      CorequeryServiceConnectionClass
    >,
  ) => CorequeryServiceClass;

  buildTags: (tags: Set<number>) => CorequeryTagsClass;

  buildServiceOriginatingMovement: (
    fields: ServiceOriginatingMovementFields,
  ) => CorequeryServiceOriginatingMovementClass;

  buildServicePassingMovement: (
    fields: ServicePassingMovementFields,
  ) => CorequeryServicePassingMovementClass;

  buildServiceRegularMovement: (
    fields: ServiceRegularMovementFields,
  ) => CorequeryServiceRegularMovementClass;

  buildServiceTerminatingMovement: (
    fields: ServiceTerminatingMovementFields,
  ) => CorequeryServiceTerminatingMovementClass;

  buildServiceConnection: (
    fields: ServiceConnectionFields,
  ) => CorequeryServiceConnectionClass;
};

export class ServiceConverter<
  CorequeryDepartureClass,
  CorequeryServiceClass,
  CorequeryTagsClass,
  CorequeryServiceOriginatingMovementClass,
  CorequeryServicePassingMovementClass,
  CorequeryServiceRegularMovementClass,
  CorequeryServiceTerminatingMovementClass,
  CorequeryServiceConnectionClass,
> {
  readonly buildDeparture: (
    fields: DepartureFields<CorequeryServiceClass>,
  ) => CorequeryDepartureClass;

  readonly buildService: (
    fields: ServiceFields<
      CorequeryTagsClass,
      CorequeryServiceOriginatingMovementClass,
      CorequeryServicePassingMovementClass,
      CorequeryServiceRegularMovementClass,
      CorequeryServiceTerminatingMovementClass,
      CorequeryServiceConnectionClass
    >,
  ) => CorequeryServiceClass;

  readonly buildTags: (tags: Set<number>) => CorequeryTagsClass;

  readonly buildServiceOriginatingMovement: (
    fields: ServiceOriginatingMovementFields,
  ) => CorequeryServiceOriginatingMovementClass;

  readonly buildServicePassingMovement: (
    fields: ServicePassingMovementFields,
  ) => CorequeryServicePassingMovementClass;

  readonly buildServiceRegularMovement: (
    fields: ServiceRegularMovementFields,
  ) => CorequeryServiceRegularMovementClass;

  readonly buildServiceTerminatingMovement: (
    fields: ServiceTerminatingMovementFields,
  ) => CorequeryServiceTerminatingMovementClass;

  readonly buildServiceConnection: (
    fields: ServiceConnectionFields,
  ) => CorequeryServiceConnectionClass;

  constructor(
    fields: ServiceConverterFields<
      CorequeryDepartureClass,
      CorequeryServiceClass,
      CorequeryTagsClass,
      CorequeryServiceOriginatingMovementClass,
      CorequeryServicePassingMovementClass,
      CorequeryServiceRegularMovementClass,
      CorequeryServiceTerminatingMovementClass,
      CorequeryServiceConnectionClass
    >,
  ) {
    this.buildDeparture = fields.buildDeparture;
    this.buildService = fields.buildService;
    this.buildTags = fields.buildTags;
    this.buildServiceOriginatingMovement =
      fields.buildServiceOriginatingMovement;
    this.buildServicePassingMovement = fields.buildServicePassingMovement;
    this.buildServiceRegularMovement = fields.buildServiceRegularMovement;
    this.buildServiceTerminatingMovement =
      fields.buildServiceTerminatingMovement;
    this.buildServiceConnection = fields.buildServiceConnection;
  }

  convertScheduledTrip(
    trip: GtfsScheduledTrip,
    serviceDay: Temporal.PlainDate,
  ): CorequeryServiceClass {}

  convertUpdatedTrip(trip: GtfsUpdatedTrip): CorequeryServiceClass {}

  convertDeparture(result: DeparturesIteratorResult): CorequeryDepartureClass {
    if (result.trip instanceof GtfsScheduledTrip) {
      const service = this.convertScheduledTrip(result.trip, result.serviceDay);
      return this.buildDeparture({
        service,
        movementIndex: result.movementIndex,
      });
    } else if (result.trip instanceof GtfsUpdatedTrip) {
      const service = this.convertUpdatedTrip(result.trip);
      return this.buildDeparture({
        service,
        movementIndex: result.movementIndex,
      });
    } else {
      assertNever(result.trip);
    }
  }
}
