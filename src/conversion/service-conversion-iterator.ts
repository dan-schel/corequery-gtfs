import type { GtfsDeparturesIterator } from "../departures/iterator/gtfs-departures-iterator.js";
import type { ServiceConverter } from "./service-converter.js";

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
  private _convertedNextDeparture: CorequeryDepartureClass | null;

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
    this._convertedNextDeparture = null;
  }

  peek(): Promise<CorequeryDepartureClass | null> {
    if (this._convertedNextDeparture != null) {
      return Promise.resolve(this._convertedNextDeparture);
    }

    const value = this._iterator.peek();
    if (value == null) {
      return Promise.resolve(null);
    }

    const result = this._converter.convertDeparture(value, this._timezone);
    this._convertedNextDeparture = result;
    return Promise.resolve(result);
  }

  take(): Promise<CorequeryDepartureClass> {
    const value = this._iterator.take();

    // If we've already converted this departure (in a previous `peek`), then
    // use the cached one. Otherwise, convert it now.
    const convertedValue =
      this._convertedNextDeparture != null
        ? this._convertedNextDeparture
        : this._converter.convertDeparture(value, this._timezone);

    // And then clear it, because otherwise the next `peek` or `take` will rely
    // on this cached value again, despite it now being stale.
    this._convertedNextDeparture = null;

    return Promise.resolve(convertedValue);
  }
}
