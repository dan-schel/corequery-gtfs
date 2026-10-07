import type { GtfsScheduleData } from "../../data/gtfs-schedule-data.js";
import type { TripDescriptorJson } from "../../data/raw/realtime-data-json.js";
import {
  NecessaryFieldNotInTripDescriptorError,
  TripDescriptorReferencesNonExistentTripIdError,
  TripDescriptorStartTimeDoesNotMatchTripOriginStopTimeError,
  TripDoesNotOccurOnStartDateError,
  type GtfsScheduledTripIdentificationError,
} from "../error-types.js";

export type GtfsScheduledTripIdentifierFields = {
  readonly onError: (error: GtfsScheduledTripIdentificationError) => void;
};

export class GtfsScheduledTripIdentifier {
  private readonly _onError: (
    error: GtfsScheduledTripIdentificationError,
  ) => void;

  constructor(fields: GtfsScheduledTripIdentifierFields) {
    this._onError = fields.onError;
  }

  identify(tripDescriptor: TripDescriptorJson, scheduleData: GtfsScheduleData) {
    // Currently it seems like PTV always gives `tripId` and `startDate` in the
    // trip descriptor, even though the GTFS-RT spec allows other methods of
    // identifying the trip. We'll rely on them being present unless it later
    // turns out we can't.
    if (tripDescriptor.tripId == null) {
      const Err = NecessaryFieldNotInTripDescriptorError;
      this._onError(new Err(tripDescriptor, "tripId"));
      return null;
    }
    if (tripDescriptor.startDate == null) {
      const Err = NecessaryFieldNotInTripDescriptorError;
      this._onError(new Err(tripDescriptor, "startDate"));
      return null;
    }

    const trip = scheduleData.getTrip(tripDescriptor.tripId);

    if (trip == null) {
      // We might have intentionally ignored some trips when parsing the
      // schedule, e.g. replacement buses, so if a trip update is for one of
      // those it's not really an error. We should ignore it here too.
      if (!scheduleData.isTripIgnored(tripDescriptor.tripId)) {
        const Err = TripDescriptorReferencesNonExistentTripIdError;
        this._onError(new Err(tripDescriptor));
      }

      return null;
    }

    // It's unclear to me whether the startDate in GTFS-RT is meant to be the
    // "service day" of the trip, or just the calendar date of the first stop.
    // I'm assuming it's the service date for now, since startTime can exceed
    // 24:00:00, so they probably work together as a pair to be consistent with
    // the GTFS schedule representation.
    //
    // If this error ever fires, it indicates that that assumption is incorrect!
    // (Or that PTV made a mistake I guess.)
    if (!trip.calendar.occursOn(tripDescriptor.startDate)) {
      this._onError(new TripDoesNotOccurOnStartDateError(tripDescriptor, trip));
      return null;
    }

    // If a startTime is given, check that it matches the trip we've identified.
    // If it doesn't, it might indicate a bug with our matching logic. For now,
    // I've decided only to report it rather than return null, but idk, this
    // might be a strong enough case to say we've matched incorrectly.
    if (
      tripDescriptor.startTime != null &&
      !tripDescriptor.startTime.equals(trip.origination.departureTime)
    ) {
      const Err = TripDescriptorStartTimeDoesNotMatchTripOriginStopTimeError;
      this._onError(new Err(tripDescriptor, trip));
    }

    return { trip, serviceDay: tripDescriptor.startDate };
  }
}
