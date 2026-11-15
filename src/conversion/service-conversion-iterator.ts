import type { GtfsDeparturesIterator } from "../departures/iterator/gtfs-departures-iterator.js";
import type { ServiceConverter } from "./service-converter.js";
import type { LightweightDeparture } from "../corequery-types.js";

export class ServiceConversionIterator<
  CorequeryDepartureClass,
  CorequeryServiceClass,
  CorequeryTagsClass,
  CorequeryServiceOriginatingMovementClass,
  CorequeryServiceRegularMovementClass,
  CorequeryServiceTerminatingMovementClass,
  CorequeryServicePassingMovementClass,
  CorequeryEntireVehicleFormsServiceConnectionClass,
  CorequeryGenericServiceConnectionClass,
> {
  private _nextLightweightDeparture: LightweightDeparture<
    CorequeryTagsClass,
    CorequeryServiceOriginatingMovementClass,
    CorequeryServiceRegularMovementClass,
    CorequeryServiceTerminatingMovementClass
  > | null;

  constructor(
    private readonly _iterator: GtfsDeparturesIterator,

    private readonly _converter: ServiceConverter<
      CorequeryDepartureClass,
      CorequeryServiceClass,
      CorequeryTagsClass,
      CorequeryServiceOriginatingMovementClass,
      CorequeryServiceRegularMovementClass,
      CorequeryServiceTerminatingMovementClass,
      CorequeryServicePassingMovementClass,
      CorequeryEntireVehicleFormsServiceConnectionClass,
      CorequeryGenericServiceConnectionClass
    >,
    private readonly _timezone: string,
  ) {
    this._nextLightweightDeparture = null;
  }

  peek(): Promise<LightweightDeparture<
    CorequeryTagsClass,
    CorequeryServiceOriginatingMovementClass,
    CorequeryServiceRegularMovementClass,
    CorequeryServiceTerminatingMovementClass
  > | null> {
    if (this._nextLightweightDeparture != null) {
      return Promise.resolve(this._nextLightweightDeparture);
    }

    const value = this._iterator.peek();
    if (value == null) {
      return Promise.resolve(null);
    }

    const result = this._converter.convertLightweightDeparture(
      value,
      this._timezone,
    );
    this._nextLightweightDeparture = result;
    return Promise.resolve(result);
  }

  skip(): Promise<void> {
    this._iterator.take();
    this._nextLightweightDeparture = null;
    return Promise.resolve();
  }

  take(): Promise<CorequeryDepartureClass> {
    const value = this._iterator.take();
    this._nextLightweightDeparture = null;

    return Promise.resolve(
      this._converter.convertDeparture(value, this._timezone),
    );
  }
}
