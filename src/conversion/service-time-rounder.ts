import { assertNever } from "@dan-schel/js-utils";
import type {
  ServiceOriginatingMovementFields,
  ServiceRegularMovementFields,
  ServiceTerminatingMovementFields,
} from "../corequery-types.js";
import type { GtfsTimeRounding } from "../gtfs-service-source.js";

export class ServiceTimeRounder {
  constructor(readonly mode: GtfsTimeRounding) {}

  roundOriginatingMovement(fields: ServiceOriginatingMovementFields) {
    return {
      ...fields,
      departureTime: this._roundTime(fields.departureTime),
      formerDepartureTime: this._roundNullableTime(fields.formerDepartureTime),
    };
  }

  roundRegularMovement(fields: ServiceRegularMovementFields) {
    return {
      ...fields,
      arrivalTime: this._roundTime(fields.arrivalTime),
      formerArrivalTime: this._roundNullableTime(fields.formerArrivalTime),
      departureTime: this._roundTime(fields.departureTime),
      formerDepartureTime: this._roundNullableTime(fields.formerDepartureTime),
    };
  }

  roundTerminatingMovement(fields: ServiceTerminatingMovementFields) {
    return {
      ...fields,
      arrivalTime: this._roundTime(fields.arrivalTime),
      formerArrivalTime: this._roundNullableTime(fields.formerArrivalTime),
    };
  }

  private _roundNullableTime(time: Temporal.Instant | null) {
    if (time === null) return time;
    return this._roundTime(time);
  }

  private _roundTime(time: Temporal.Instant) {
    if (this.mode === "no-rounding") {
      return time;
    } else if (this.mode === "nearest-minute") {
      return time.round({ smallestUnit: "minute" });
    } else {
      assertNever(this.mode);
    }
  }
}
