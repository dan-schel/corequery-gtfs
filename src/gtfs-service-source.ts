import { assertNever } from "@dan-schel/js-utils";
import type {
  DeparturesIterationDirection,
  DeparturesIterator,
  ServiceSource,
} from "./corequery-types.js";
import { CorequeryIntrasourceId } from "./corequeryify/corequery-intrasource-id.js";
import {
  ServiceConverter,
  type ServiceConverterFields,
} from "./corequeryify/service-converter.js";
import { GtfsScheduledTrip } from "./data/gtfs-scheduled-trip.js";
import type { GtfsSystem } from "./gtfs-system.js";
import { GtfsUpdatedTrip } from "./data/gtfs-updated-trip.js";
import { ServiceConversionIterator } from "./corequeryify/service-conversion-iterator.js";

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
  readonly sourceId: string;
  readonly gtfsSystem: GtfsSystem;
} & ServiceConverterFields<
  CorequeryDepartureClass,
  CorequeryServiceClass,
  CorequeryTagsClass,
  CorequeryServiceOriginatingMovementClass,
  CorequeryServicePassingMovementClass,
  CorequeryServiceRegularMovementClass,
  CorequeryServiceTerminatingMovementClass,
  CorequeryServiceConnectionClass
>;

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
  readonly sourceId: string;
  readonly gtfsSystem: GtfsSystem;

  private readonly _converter: ServiceConverter<
    CorequeryDepartureClass,
    CorequeryServiceClass,
    CorequeryTagsClass,
    CorequeryServiceOriginatingMovementClass,
    CorequeryServicePassingMovementClass,
    CorequeryServiceRegularMovementClass,
    CorequeryServiceTerminatingMovementClass,
    CorequeryServiceConnectionClass
  >;

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
    this.sourceId = fields.sourceId;

    this.gtfsSystem = fields.gtfsSystem;
    this._converter = new ServiceConverter<
      CorequeryDepartureClass,
      CorequeryServiceClass,
      CorequeryTagsClass,
      CorequeryServiceOriginatingMovementClass,
      CorequeryServicePassingMovementClass,
      CorequeryServiceRegularMovementClass,
      CorequeryServiceTerminatingMovementClass,
      CorequeryServiceConnectionClass
    >({
      buildDeparture: fields.buildDeparture,
      buildService: fields.buildService,
      buildTags: fields.buildTags,
      buildServiceOriginatingMovement: fields.buildServiceOriginatingMovement,
      buildServicePassingMovement: fields.buildServicePassingMovement,
      buildServiceRegularMovement: fields.buildServiceRegularMovement,
      buildServiceTerminatingMovement: fields.buildServiceTerminatingMovement,
      buildServiceConnection: fields.buildServiceConnection,
    });
  }

  asCorequeryServiceSource(): ServiceSource<
    CorequeryDepartureClass,
    CorequeryServiceClass
  > {
    return this;
  }

  getService(intrasourceId: string): Promise<CorequeryServiceClass | null> {
    const id = CorequeryIntrasourceId.parse(intrasourceId);
    if (id == null) return Promise.resolve(null);

    const feed = this.gtfsSystem.requireFeed();
    const trip = feed.getTrip(id.gtfsTripId, id.serviceDay);
    if (trip == null) return Promise.resolve(null);

    if (trip instanceof GtfsScheduledTrip) {
      const result = this._converter.convertScheduledTrip(trip, id.serviceDay);
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
    const iterator = this.gtfsSystem
      .requireFeed()
      .createDepartureIterator(stopId);
    iterator.set(instant, direction);

    return new ServiceConversionIterator<
      CorequeryDepartureClass,
      CorequeryServiceClass,
      CorequeryTagsClass,
      CorequeryServiceOriginatingMovementClass,
      CorequeryServicePassingMovementClass,
      CorequeryServiceRegularMovementClass,
      CorequeryServiceTerminatingMovementClass,
      CorequeryServiceConnectionClass
    >(iterator, this._converter);
  }
}
