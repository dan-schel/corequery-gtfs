import { assertNever } from "@dan-schel/js-utils";
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
import { CorequeryIntrasourceId } from "./corequeryify/corequery-intrasource-id.js";
import { ServiceConverter } from "./corequeryify/service-converter.js";
import { GtfsScheduledTrip } from "./data/gtfs-scheduled-trip.js";
import type { GtfsSystem } from "./gtfs-system.js";
import { GtfsUpdatedTrip } from "./data/gtfs-updated-trip.js";
import { ServiceConversionIterator } from "./corequeryify/service-conversion-iterator.js";

type GtfsServiceSourceFields<
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

  readonly departureIterationLimitHours: number | null;

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

export class GtfsServiceSource<
  CorequeryDepartureClass,
  CorequeryServiceClass,
  CorequeryTagsClass,
  CorequeryServiceOriginatingMovementClass,
  CorequeryServiceRegularMovementClass,
  CorequeryServiceTerminatingMovementClass,
  CorequeryServicePassingMovementClass,
  CorequeryServiceConnectionClass,
> implements ServiceSource<CorequeryDepartureClass, CorequeryServiceClass> {
  readonly sourceId: string;
  readonly gtfsSystem: GtfsSystem;

  readonly departureIterationLimitHours: number | null;

  private readonly _converter: ServiceConverter<
    CorequeryDepartureClass,
    CorequeryServiceClass,
    CorequeryTagsClass,
    CorequeryServiceOriginatingMovementClass,
    CorequeryServiceRegularMovementClass,
    CorequeryServiceTerminatingMovementClass,
    CorequeryServicePassingMovementClass,
    CorequeryServiceConnectionClass
  >;

  constructor(
    fields: GtfsServiceSourceFields<
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
    this.sourceId = fields.sourceId;
    this.gtfsSystem = fields.gtfsSystem;

    this.departureIterationLimitHours = fields.departureIterationLimitHours;

    this._converter = new ServiceConverter<
      CorequeryDepartureClass,
      CorequeryServiceClass,
      CorequeryTagsClass,
      CorequeryServiceOriginatingMovementClass,
      CorequeryServiceRegularMovementClass,
      CorequeryServiceTerminatingMovementClass,
      CorequeryServicePassingMovementClass,
      CorequeryServiceConnectionClass
    >({
      sourceId: fields.sourceId,
      buildDeparture: fields.buildDeparture,
      buildService: fields.buildService,
      buildTags: fields.buildTags,
      buildServiceOriginatingMovement: fields.buildServiceOriginatingMovement,
      buildServiceRegularMovement: fields.buildServiceRegularMovement,
      buildServiceTerminatingMovement: fields.buildServiceTerminatingMovement,
      buildServicePassingMovement: fields.buildServicePassingMovement,
      buildServiceConnection: fields.buildServiceConnection,
    });
  }

  getService(intrasourceId: string): Promise<CorequeryServiceClass | null> {
    const id = CorequeryIntrasourceId.parse(intrasourceId);
    if (id == null) return Promise.resolve(null);

    const feed = this.gtfsSystem.requireFeed();
    const trip = feed.getTrip(id.gtfsTripId, id.serviceDay);
    if (trip == null) return Promise.resolve(null);

    if (trip instanceof GtfsScheduledTrip) {
      const result = this._converter.convertScheduledTrip(
        trip,
        id.serviceDay,
        feed.timezoneData.timezone,
      );
      return Promise.resolve(result);
    } else if (trip instanceof GtfsUpdatedTrip) {
      const result = this._converter.convertUpdatedTrip(trip);
      return Promise.resolve(result);
    } else {
      assertNever(trip);
    }
  }

  getDeparturesIterator(
    stopId: number,
    instant: Temporal.Instant,
    direction: DeparturesIterationDirection,
  ): DeparturesIterator<CorequeryDepartureClass> {
    const feed = this.gtfsSystem.requireFeed();
    const iterator = feed.createDepartureIterator(
      stopId,
      this.departureIterationLimitHours,
    );
    iterator.set(instant, direction);

    return new ServiceConversionIterator<
      CorequeryDepartureClass,
      CorequeryServiceClass,
      CorequeryTagsClass,
      CorequeryServiceOriginatingMovementClass,
      CorequeryServiceRegularMovementClass,
      CorequeryServiceTerminatingMovementClass,
      CorequeryServicePassingMovementClass,
      CorequeryServiceConnectionClass
    >(iterator, this._converter, feed.timezoneData.timezone);
  }
}
