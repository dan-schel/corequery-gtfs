import type { GtfsScheduleData } from "../../data/gtfs-schedule-data.js";
import type { GtfsScheduledTrip } from "../../data/gtfs-scheduled-trip.js";
import type { TripDescriptorJson } from "../../data/raw/realtime-data-json.js";

export class GtfsTripUpdateTripIdentifier {
  constructor(
    private readonly _onError: (
      error: GtfsTripUpdateTripIdentificationError,
    ) => void,
  ) {}

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

    // TODO: We filter out trips from replacement bus services, so if we ever
    // got a trip update for a replacement bus it would trigger this error, but
    // we should probably ignore that case.
    if (trip == null) {
      const Err = TripDescriptorReferencesNonExistentTripIdError;
      this._onError(new Err(tripDescriptor));
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

export type GtfsTripUpdateTripIdentificationError =
  | NecessaryFieldNotInTripDescriptorError
  | TripDescriptorReferencesNonExistentTripIdError
  | TripDoesNotOccurOnStartDateError
  | TripDescriptorStartTimeDoesNotMatchTripOriginStopTimeError;

// Naming "necessary" rather that "required" since "required" implies that it
// breaks the GTFS-RT spec, but in reality it's just that we don't support other
// methods of identifying the trip yet.
export class NecessaryFieldNotInTripDescriptorError extends Error {
  readonly type = "necessary-field-not-in-trip-descriptor";
  constructor(
    readonly tripDescriptor: TripDescriptorJson,
    readonly field: "tripId" | "startDate",
  ) {
    super();
  }
}

export class TripDescriptorReferencesNonExistentTripIdError extends Error {
  readonly type = "trip-descriptor-references-non-existent-trip-id";
  constructor(readonly tripDescriptor: TripDescriptorJson) {
    super();
  }
}

export class TripDoesNotOccurOnStartDateError extends Error {
  readonly type = "trip-does-not-occur-on-start-date";
  constructor(
    readonly tripDescriptor: TripDescriptorJson,
    readonly trip: GtfsScheduledTrip,
  ) {
    super();
  }
}

export class TripDescriptorStartTimeDoesNotMatchTripOriginStopTimeError extends Error {
  readonly type =
    "trip-descriptor-start-time-does-not-match-trip-origin-stop-time";
  constructor(
    readonly tripDescriptor: TripDescriptorJson,
    readonly trip: GtfsScheduledTrip,
  ) {
    super();
  }
}
