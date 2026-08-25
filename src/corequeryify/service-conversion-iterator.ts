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
    // isn't ideal.
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
    if (this._convertedNextDeparture != null) {
      const result = this._convertedNextDeparture;
      this._convertedNextDeparture = null;
      return Promise.resolve(result);
    }

    const value = this._iterator.take();
    const result = this._converter.convertDeparture(value, this._timezone);
    return Promise.resolve(result);
  }
}
