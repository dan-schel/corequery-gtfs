import type { DeparturesIterator } from "../departures/departures-iterator.js";
import type { ServiceConverter } from "./service-converter.js";

export class ServiceConversionIterator<
  CorequeryDepartureClass,
  CorequeryServiceClass,
  CorequeryTagsClass,
  CorequeryServiceOriginatingMovementClass,
  CorequeryServiceRegularMovementClass,
  CorequeryServiceTerminatingMovementClass,
  CorequeryServicePassingMovementClass,
  CorequeryServiceConnectionClass,
> {
  private _convertedNextDeparture: CorequeryDepartureClass | null;

  constructor(
    // TODO: There's two things called DeparturesIterator in this repo, which
    // isn't ideal. Maybe this one could be prefixed with Gtfs, but it raises
    // the larger question of whether anything in this repo need be prefixed
    // with Gtfs given the package name.
    private readonly _iterator: DeparturesIterator,

    private readonly _converter: ServiceConverter<
      CorequeryDepartureClass,
      CorequeryServiceClass,
      CorequeryTagsClass,
      CorequeryServiceOriginatingMovementClass,
      CorequeryServiceRegularMovementClass,
      CorequeryServiceTerminatingMovementClass,
      CorequeryServicePassingMovementClass,
      CorequeryServiceConnectionClass
    >,

    // TODO: The need to pass around timezone here (and everywhere), I think
    // hints at that it should be a property of the DeparturesIteratorResult.
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
