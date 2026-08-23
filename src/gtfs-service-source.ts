import type {
  DepartureFields,
  DeparturesIterationDirection,
  DeparturesIterator,
  ServiceConnectionFields,
  ServiceFields,
  ServiceOriginatingMovementFields,
  ServicePassingMovementFields,
  ServiceRegularMovementFields,
  ServiceSource,
  ServiceTerminatingMovementFields,
} from "./corequery-types.js";
import type { GtfsSystem } from "./gtfs-system.js";

type GtfsServiceSourceFields<
  CorequeryDepartureClass,
  CorequeryServiceClass,
  CorequeryTagsClass,
  CorequeryServiceOriginatingMovementClass,
  CorequeryServicePassingMovementClass,
  CorequeryServiceRegularMovementClass,
  CorequeryServiceTerminatingMovementClass,
  CorequeryServiceConnectionClass,
> = {
  readonly gtfsSystem: GtfsSystem;
  readonly sourceId: string;

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

export class GtfsServiceSource<
  CorequeryDepartureClass,
  CorequeryServiceClass,
  CorequeryTagsClass,
  CorequeryServiceOriginatingMovementClass,
  CorequeryServicePassingMovementClass,
  CorequeryServiceRegularMovementClass,
  CorequeryServiceTerminatingMovementClass,
  CorequeryServiceConnectionClass,
> {
  readonly gtfsSystem: GtfsSystem;
  readonly sourceId: string;

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
    fields: GtfsServiceSourceFields<
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
    this.gtfsSystem = fields.gtfsSystem;
    this.sourceId = fields.sourceId;

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

  asCorequeryServiceSource(): ServiceSource<
    CorequeryDepartureClass,
    CorequeryServiceClass
  > {
    return this;
  }

  async getService(
    intrasourceId: string,
  ): Promise<CorequeryServiceClass | null> {}

  getDeparturesIterator(
    stopId: number,
    instant: Temporal.Instant,
    direction: DeparturesIterationDirection,
  ): DeparturesIterator<CorequeryDepartureClass> {}
}
