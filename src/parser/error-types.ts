import type {
  StopTimeUpdateJson,
  TripDescriptorJson,
  TripUpdateJson,
  UpdatedTimeJson,
} from "../data/raw/realtime-data-json.js";
import type {
  CalendarCsvRow,
  CalendarDatesCsvRow,
  StopTimesCsv,
  StopTimesCsvRow,
  TransfersCsvRow,
  TripsCsvRow,
} from "../data/raw/schedule-csvs.js";
import type { GtfsScheduledTrip } from "../data/trip/scheduled/gtfs-scheduled-trip.js";
import type { GtfsUpdatedTripMovement } from "../data/trip/updated/types.js";

export type GtfsScheduleParsingError =
  GtfsCalendarParsingError | GtfsTripParsingError;

export type GtfsCalendarParsingError =
  | DuplicateCalendarIdError
  | UnexpectedCalendarDateExceptionTypeError
  | InvalidCalendarDateRangeError
  | MultipleExceptionsForSameDateError;

export type GtfsTripParsingError =
  | StopTimeReferencesNonExistentTripError
  | DuplicateTripIdError
  | TripReferencesNonExistentCalendarError
  | TripReferencesUnmappedRouteIdError
  | GtfsStopTimeNormalisationError
  | GtfsRouteMatchingError
  | GtfsTransferParsingError
  | StopTimeReferencesUnmappedStopIdError
  | UnexpectedPickupTypeError
  | UnexpectedDropOffTypeError;

export type GtfsStopTimeNormalisationError =
  InvalidStopSequenceError | MultipleStopSequencesError;

export type GtfsRouteMatchingError = NoMatchingRouteError;

export type GtfsTransferParsingError =
  | TransferReferencesNonExistentTrip
  | TransferIsNotFromTerminusError
  | TransferIsNotToOriginError
  | TransferReferencesTripAlreadyConnectedError
  | TransferIsNotInSeatTransferError
  | TransferIsNotSameStopAndPositionError
  | TransferCrossesCalendarsError
  | TransferRequiresTimeTravelError;

export type GtfsRealtimeDataParsingError = GtfsTripUpdateParsingError;

export type GtfsTripUpdateParsingError =
  | UnsupportedTripUpdateScheduleRelationshipError
  | GtfsUpdatedTripUpdateParsingError
  | GtfsCancelledTripUpdateParsingError
  | GtfsAddedTripUpdateParsingError;

export type GtfsUpdatedTripUpdateParsingError =
  | GtfsScheduledTripIdentificationError
  | GtfsRouteMatchingError
  | NoStopTimeUpdateFieldGivenError
  | UnsupportedStopTimeUpdateEntryScheduleRelationshipError
  | NecessaryFieldNotInStopTimeUpdateEntryError
  | StopTimeUpdateEntryReferencesNonExistentStopSequenceError
  | MultipleStopTimeUpdateEntriesForSameMovementIndexError
  | StopTimeUpdateEntryReferencesUnmappedStopIdError
  | StopTimeUpdateEntryChangesStopError
  | NeitherTimeNorDelayGivenError
  | TimeAndDelayDisagreeWithEachOtherError
  | NeitherArrivalNorDepartureGivenError
  | KnownDepartureTimesEntailTimeTravelError
  | TooFewSurvivingServicingMovementsError;

export type GtfsCancelledTripUpdateParsingError =
  GtfsScheduledTripIdentificationError;

export type GtfsAddedTripUpdateParsingError =
  | NecessaryFieldNotSuppliedForAddedTripError
  | AddedTripIdDuplicatesScheduledTripIdError
  | NoStopTimeUpdateFieldGivenError
  | UnsupportedStopTimeUpdateEntryScheduleRelationshipError
  | NecessaryFieldNotInStopTimeUpdateEntryError
  | StopTimeUpdateEntryReferencesUnmappedStopIdError
  | AddedTripStopTimeUpdateMissingTimeError
  | AddedTripReferencesUnmappedRouteIdError
  | GtfsRouteMatchingError
  | NonSequentialStopTimeUpdateEntryError;

export type GtfsScheduledTripIdentificationError =
  | NecessaryFieldNotInTripDescriptorError
  | TripDescriptorReferencesNonExistentTripIdError
  | TripDoesNotOccurOnStartDateError
  | TripDescriptorStartTimeDoesNotMatchTripOriginStopTimeError;

export class DuplicateCalendarIdError {
  readonly type = "duplicate-calendar";
  constructor(readonly subsequentRowWithDuplicateId: CalendarCsvRow) {}

  formatDebugMessage() {
    return `Calendar with ID "${this.subsequentRowWithDuplicateId.service_id}" seen twice.`;
  }
}

export class InvalidCalendarDateRangeError {
  readonly type = "invalid-calendar-date-range";
  constructor(readonly row: CalendarCsvRow) {}

  formatDebugMessage() {
    return `Calendar with ID "${this.row.service_id}" has an invalid date range.`;
  }
}

export class UnexpectedCalendarDateExceptionTypeError {
  readonly type = "unexpected-calendar-date-exception-type";
  constructor(readonly row: CalendarDatesCsvRow) {}

  formatDebugMessage() {
    return `Calendar date exception for service "${this.row.service_id}" on "${this.row.date.toString()}" has unexpected type "${this.row.exception_type}".`;
  }
}

export class MultipleExceptionsForSameDateError {
  readonly type = "multiple-exceptions-for-same-date";
  constructor(readonly subsequentRowForSameDate: CalendarDatesCsvRow) {}

  formatDebugMessage() {
    return `Calendar service "${this.subsequentRowForSameDate.service_id}" has multiple exceptions on "${this.subsequentRowForSameDate.date.toString()}".`;
  }
}

export class StopTimeReferencesNonExistentTripError {
  readonly type = "stop-time-references-non-existent-trip";
  constructor(readonly stopTime: StopTimesCsvRow) {}

  formatDebugMessage() {
    return `Stop time references non-existent trip "${this.stopTime.trip_id}".`;
  }
}

export class DuplicateTripIdError {
  readonly type = "duplicate-trip-id";
  constructor(readonly subsequentRowWithDuplicateId: TripsCsvRow) {}

  formatDebugMessage() {
    return `Trip with ID "${this.subsequentRowWithDuplicateId.trip_id}" seen twice.`;
  }
}

export class TripReferencesNonExistentCalendarError {
  readonly type = "trip-references-non-existent-calendar";
  constructor(readonly trip: TripsCsvRow) {}

  formatDebugMessage() {
    return `Trip "${this.trip.trip_id}" references non-existent service "${this.trip.service_id}".`;
  }
}

export class TripReferencesUnmappedRouteIdError {
  readonly type = "trip-references-unmapped-route-id";
  constructor(readonly trip: TripsCsvRow) {}

  formatDebugMessage() {
    return `Trip "${this.trip.trip_id}" references unmapped route "${this.trip.route_id}".`;
  }
}

export class StopTimeReferencesUnmappedStopIdError {
  readonly type = "stop-time-references-unmapped-stop-id";
  constructor(readonly stopTime: StopTimesCsvRow) {}

  formatDebugMessage() {
    return `Stop time for trip "${this.stopTime.trip_id}" references unmapped stop "${this.stopTime.stop_id}".`;
  }
}

export class UnexpectedPickupTypeError {
  readonly type = "unexpected-pickup-type";
  constructor(readonly stopTime: StopTimesCsvRow) {}

  formatDebugMessage() {
    return `Stop time for trip "${this.stopTime.trip_id}" at stop "${this.stopTime.stop_id}" has unexpected pickup type "${this.stopTime.pickup_type}".`;
  }
}

export class UnexpectedDropOffTypeError {
  readonly type = "unexpected-drop-off-type";
  constructor(readonly stopTime: StopTimesCsvRow) {}

  formatDebugMessage() {
    return `Stop time for trip "${this.stopTime.trip_id}" at stop "${this.stopTime.stop_id}" has unexpected drop-off type "${this.stopTime.drop_off_type}".`;
  }
}

export class InvalidStopSequenceError {
  readonly type = "stop-sequence-duplicated";
  constructor(readonly stopTimes: StopTimesCsv) {}

  formatDebugMessage() {
    return `Stop times for trip "${this.stopTimes[0]?.trip_id}" have an invalid stop sequence.`;
  }
}

export class MultipleStopSequencesError {
  readonly type = "multiple-stop-sequences";
  constructor(readonly stopTimes: StopTimesCsv) {}

  formatDebugMessage() {
    return `Stop times for trip "${this.stopTimes[0]?.trip_id}" have multiple entries for a stop sequence.`;
  }
}

export class NoMatchingRouteError {
  readonly type = "no-matching-route";
  constructor(readonly stopIds: readonly number[]) {}

  formatDebugMessage() {
    const stopIds = this.stopIds.map((stopId) => `"${stopId}"`).join(", ");
    return `No route matches stops ${stopIds}.`;
  }
}

export class TransferReferencesNonExistentTrip {
  readonly type = "transfer-references-non-existent-trip";
  constructor(
    readonly transfer: TransfersCsvRow,
    readonly field: "from_trip_id" | "to_trip_id",
  ) {}

  formatDebugMessage() {
    return `Transfer references non-existent trip "${this.transfer[this.field]}".`;
  }
}

export class TransferIsNotFromTerminusError {
  readonly type = "transfer-is-not-from-terminus";
  constructor(
    readonly transfer: TransfersCsvRow,
    readonly fromTrip: GtfsScheduledTrip,
  ) {}

  formatDebugMessage() {
    return `Transfer from trip "${this.fromTrip.gtfsTripId}" does not start at its terminus.`;
  }
}

export class TransferIsNotToOriginError {
  readonly type = "transfer-is-not-to-origin";
  constructor(
    readonly transfer: TransfersCsvRow,
    readonly toTrip: GtfsScheduledTrip,
  ) {}

  formatDebugMessage() {
    return `Transfer to trip "${this.toTrip.gtfsTripId}" does not end at its origin.`;
  }
}

export class TransferReferencesTripAlreadyConnectedError {
  readonly type = "transfer-references-trip-already-connected";
  constructor(
    readonly transfer: TransfersCsvRow,
    readonly tripWithExistingConnection: GtfsScheduledTrip,
  ) {}

  formatDebugMessage() {
    return `Transfer references trip "${this.tripWithExistingConnection.gtfsTripId}", which is already connected.`;
  }
}

export class TransferIsNotInSeatTransferError {
  readonly type = "transfer-is-not-in-seat-transfer";
  constructor(readonly transfer: TransfersCsvRow) {}

  formatDebugMessage() {
    return `Transfer from trip "${this.transfer.from_trip_id}" to trip "${this.transfer.to_trip_id}" is not an in-seat transfer.`;
  }
}

export class TransferIsNotSameStopAndPositionError {
  readonly type = "transfer-is-not-same-stop-and-position";
  constructor(readonly transfer: TransfersCsvRow) {}

  formatDebugMessage() {
    return `Transfer from trip "${this.transfer.from_trip_id}" to trip "${this.transfer.to_trip_id}" changes stop or position.`;
  }
}

export class TransferCrossesCalendarsError {
  readonly type = "transfer-crosses-calendars";
  constructor(readonly transfer: TransfersCsvRow) {}

  formatDebugMessage() {
    return `Transfer from trip "${this.transfer.from_trip_id}" to trip "${this.transfer.to_trip_id}" crosses service calendars.`;
  }
}

export class TransferRequiresTimeTravelError {
  readonly type = "transfer-requires-time-travel";
  constructor(readonly transfer: TransfersCsvRow) {}

  formatDebugMessage() {
    return `Transfer from trip "${this.transfer.from_trip_id}" to trip "${this.transfer.to_trip_id}" requires time travel.`;
  }
}

export class NecessaryFieldNotSuppliedForAddedTripError {
  readonly type = "necessary-field-not-supplied-for-added-trip";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly field: "tripId" | "routeId" | "startDate",
  ) {}

  formatDebugMessage() {
    return `Added trip update for trip "${this.tripUpdate.trip.tripId}" is missing "${this.field}".`;
  }
}

export class AddedTripIdDuplicatesScheduledTripIdError {
  readonly type = "added-trip-id-duplicates-scheduled-trip-id";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly tripId: string,
  ) {}

  formatDebugMessage() {
    return `Added trip update for trip "${this.tripId}" duplicates a scheduled trip ID.`;
  }
}

export class AddedTripStopTimeUpdateMissingTimeError {
  readonly type = "added-trip-stop-time-update-missing-time";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
  ) {}

  formatDebugMessage() {
    return `Stop time update for trip "${this.tripUpdate.trip.tripId}" at stop "${this.stopTimeUpdateEntry.stopId}" has no required time.`;
  }
}

export class AddedTripReferencesUnmappedRouteIdError {
  readonly type = "trip-references-unmapped-route-id";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly gtfsRouteId: string,
  ) {}

  formatDebugMessage() {
    return `Added trip update for trip "${this.tripUpdate.trip.tripId}" references unmapped route "${this.gtfsRouteId}".`;
  }
}

export class NonSequentialStopTimeUpdateEntryError {
  readonly type = "non-sequential-stop-time-update-entry";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
    readonly expectedStopSequence: number,
  ) {}

  formatDebugMessage() {
    return `Stop time updates in trip update "${this.tripUpdate.trip.tripId}" did not form a regular sequence.`;
  }
}

export class NoStopTimeUpdateFieldGivenError {
  readonly type = "no-stop-time-update-field-given";
  constructor(readonly tripUpdate: TripUpdateJson) {}

  formatDebugMessage() {
    return `Trip update for trip "${this.tripUpdate.trip.tripId}" has no stop time updates.`;
  }
}

export class UnsupportedStopTimeUpdateEntryScheduleRelationshipError {
  readonly type = "unsupported-stop-time-update-entry-schedule-relationship";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
  ) {}

  formatDebugMessage() {
    return `Stop time update for trip "${this.tripUpdate.trip.tripId}" at stop "${this.stopTimeUpdateEntry.stopId}" has unsupported relationship "${this.stopTimeUpdateEntry.scheduleRelationship}".`;
  }
}

export class NecessaryFieldNotInStopTimeUpdateEntryError {
  readonly type = "necessary-field-not-in-stop-time-update-entry";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
    readonly field: "stopSequence" | "stopId",
  ) {}

  formatDebugMessage() {
    return `Stop time update for trip "${this.tripUpdate.trip.tripId}" at stop "${this.stopTimeUpdateEntry.stopId}" is missing "${this.field}".`;
  }
}

export class StopTimeUpdateEntryReferencesUnmappedStopIdError {
  readonly type = "stop-time-update-entry-references-unmapped-stop-id";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
  ) {}

  formatDebugMessage() {
    return `Stop time update for trip "${this.tripUpdate.trip.tripId}" references unmapped stop "${this.stopTimeUpdateEntry.stopId}".`;
  }
}

export class StopTimeUpdateEntryReferencesNonExistentStopSequenceError {
  readonly type =
    "stop-time-update-entry-references-non-existent-stop-sequence";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
    readonly matchedTrip: GtfsScheduledTrip,
  ) {}

  formatDebugMessage() {
    return `Stop time update for trip "${this.tripUpdate.trip.tripId}" references non-existent stop sequence "${this.stopTimeUpdateEntry.stopSequence}".`;
  }
}

export class MultipleStopTimeUpdateEntriesForSameMovementIndexError {
  readonly type = "multiple-stop-time-update-entries-for-same-movement-index";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
    readonly matchedTrip: GtfsScheduledTrip,
    readonly matchedMovementIndex: number,
  ) {}

  formatDebugMessage() {
    return `Trip update for trip "${this.tripUpdate.trip.tripId}" has multiple entries for stop sequence "${this.stopTimeUpdateEntry.stopSequence}".`;
  }
}

// i.e. It doesn't just change the position/platform (which we're fine with),
// but the entire stop.
export class StopTimeUpdateEntryChangesStopError {
  readonly type = "stop-time-update-entry-changes-stop";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
    readonly matchedTrip: GtfsScheduledTrip,
    readonly matchedMovementIndex: number,
  ) {}

  formatDebugMessage() {
    return `Stop time update for trip "${this.tripUpdate.trip.tripId}" changes stop "${this.matchedTrip.movements[this.matchedMovementIndex]?.stopId}".`;
  }
}

export class NeitherTimeNorDelayGivenError {
  readonly type = "neither-time-nor-delay-given";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
    readonly updatedTime: UpdatedTimeJson,
  ) {}

  formatDebugMessage() {
    return `Stop time update for trip "${this.tripUpdate.trip.tripId}" has neither time nor delay.`;
  }
}

export class TimeAndDelayDisagreeWithEachOtherError {
  readonly type = "time-and-delay-disagree-with-each-other";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
    readonly updatedTime: UpdatedTimeJson,
    readonly parsedFromTime: Temporal.Instant,
    readonly parsedFromDelay: Temporal.Instant,
  ) {}

  formatDebugMessage() {
    return `Time and delay disagree in trip update "${this.tripUpdate.trip.tripId}" at stop "${this.stopTimeUpdateEntry.stopId}".`;
  }
}

export class NeitherArrivalNorDepartureGivenError {
  readonly type = "neither-arrival-nor-departure-given";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
  ) {}

  formatDebugMessage() {
    return `Stop time update for trip "${this.tripUpdate.trip.tripId}" at stop "${this.stopTimeUpdateEntry.stopId}" has neither arrival nor departure.`;
  }
}

export class KnownDepartureTimesEntailTimeTravelError {
  readonly type = "known-departure-times-entail-time-travel";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly movements: readonly GtfsUpdatedTripMovement[],
  ) {}

  formatDebugMessage() {
    return `Known departure times in trip update "${this.tripUpdate.trip.tripId}" entail time travel.`;
  }
}

export class TooFewSurvivingServicingMovementsError {
  readonly type = "too-few-surviving-servicing-movements";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly survivingMovements: GtfsUpdatedTripMovement[],
  ) {}

  formatDebugMessage() {
    return `Trip update "${this.tripUpdate.trip.tripId}" leaves fewer than two stops in the replaced trip.`;
  }
}

// Naming "necessary" rather that "required" since "required" implies that it
// breaks the GTFS-RT spec, but in reality it's just that we don't support other
// methods of identifying the trip yet.
export class NecessaryFieldNotInTripDescriptorError {
  readonly type = "necessary-field-not-in-trip-descriptor";
  constructor(
    readonly tripDescriptor: TripDescriptorJson,
    readonly field: "tripId" | "startDate",
  ) {}

  formatDebugMessage() {
    return `Trip descriptor for trip "${this.tripDescriptor.tripId}" is missing "${this.field}".`;
  }
}

export class TripDescriptorReferencesNonExistentTripIdError {
  readonly type = "trip-descriptor-references-non-existent-trip-id";
  constructor(readonly tripDescriptor: TripDescriptorJson) {}

  formatDebugMessage() {
    return `Trip descriptor references non-existent trip "${this.tripDescriptor.tripId}".`;
  }
}

export class TripDoesNotOccurOnStartDateError {
  readonly type = "trip-does-not-occur-on-start-date";
  constructor(
    readonly tripDescriptor: TripDescriptorJson,
    readonly trip: GtfsScheduledTrip,
  ) {}

  formatDebugMessage() {
    return `Trip "${this.trip.gtfsTripId}" does not run on "${String(this.tripDescriptor.startDate)}".`;
  }
}

export class TripDescriptorStartTimeDoesNotMatchTripOriginStopTimeError {
  readonly type =
    "trip-descriptor-start-time-does-not-match-trip-origin-stop-time";
  constructor(
    readonly tripDescriptor: TripDescriptorJson,
    readonly trip: GtfsScheduledTrip,
  ) {}

  formatDebugMessage() {
    return `Trip descriptor for trip "${this.tripDescriptor.tripId}" has a start time that does not match the schedule.`;
  }
}

export class UnsupportedTripUpdateScheduleRelationshipError {
  readonly type = "unsupported-trip-update-schedule-relationship";
  constructor(readonly tripUpdate: TripUpdateJson) {}

  formatDebugMessage() {
    return `Trip update for trip "${this.tripUpdate.trip.tripId}" has unsupported relationship "${this.tripUpdate.trip.scheduleRelationship}".`;
  }
}
