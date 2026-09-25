import type { GtfsScheduleData } from "../../data/gtfs-schedule-data.js";
import type { TripUpdateJson } from "../../data/raw/realtime-data-json.js";
import { GtfsUpdatedTrip } from "../../data/trip/updated/gtfs-updated-trip.js";
import {
  GtfsScheduledTripIdentifier,
  type GtfsScheduledTripIdentificationError,
} from "./gtfs-scheduled-trip-identifier.js";

export type GtfsCancelledTripUpdateParserFields = {
  readonly timezone: string;
  readonly onError: (error: GtfsCancelledTripUpdateParsingError) => void;
};

export class GtfsCancelledTripUpdateParser {
  private readonly _timezone: string;
  private readonly _onError: (
    error: GtfsCancelledTripUpdateParsingError,
  ) => void;

  private readonly _tripIdentifier: GtfsScheduledTripIdentifier;

  constructor(fields: GtfsCancelledTripUpdateParserFields) {
    this._timezone = fields.timezone;
    this._onError = fields.onError;

    this._tripIdentifier = new GtfsScheduledTripIdentifier({
      onError: this._onError,
    });
  }

  parse(
    tripUpdate: TripUpdateJson,
    scheduleData: GtfsScheduleData,
  ): GtfsUpdatedTrip | null {
    const result = this._tripIdentifier.identify(tripUpdate.trip, scheduleData);
    if (result == null) return null;
    const { trip, serviceDay } = result;

    return GtfsUpdatedTrip.unmodified(trip, serviceDay, this._timezone).with({
      isCancelled: true,
    });
  }
}

export type GtfsCancelledTripUpdateParsingError =
  GtfsScheduledTripIdentificationError;
