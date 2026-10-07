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
}

export class InvalidCalendarDateRangeError {
  readonly type = "invalid-calendar-date-range";
  constructor(readonly row: CalendarCsvRow) {}
}

export class UnexpectedCalendarDateExceptionTypeError {
  readonly type = "unexpected-calendar-date-exception-type";
  constructor(readonly row: CalendarDatesCsvRow) {}
}

export class MultipleExceptionsForSameDateError {
  readonly type = "multiple-exceptions-for-same-date";
  constructor(readonly subsequentRowForSameDate: CalendarDatesCsvRow) {}
}

export class StopTimeReferencesNonExistentTripError {
  readonly type = "stop-time-references-non-existent-trip";
  constructor(readonly stopTime: StopTimesCsvRow) {}
}

export class DuplicateTripIdError {
  readonly type = "duplicate-trip-id";
  constructor(readonly subsequentRowWithDuplicateId: TripsCsvRow) {}
}

export class TripReferencesNonExistentCalendarError {
  readonly type = "trip-references-non-existent-calendar";
  constructor(readonly trip: TripsCsvRow) {}
}

export class TripReferencesUnmappedRouteIdError {
  readonly type = "trip-references-unmapped-route-id";
  constructor(readonly trip: TripsCsvRow) {}
}

export class StopTimeReferencesUnmappedStopIdError {
  readonly type = "stop-time-references-unmapped-stop-id";
  constructor(readonly stopTime: StopTimesCsvRow) {}
}

export class UnexpectedPickupTypeError {
  readonly type = "unexpected-pickup-type";
  constructor(readonly stopTime: StopTimesCsvRow) {}
}

export class UnexpectedDropOffTypeError {
  readonly type = "unexpected-drop-off-type";
  constructor(readonly stopTime: StopTimesCsvRow) {}
}

export class InvalidStopSequenceError {
  readonly type = "stop-sequence-duplicated";
  constructor(readonly stopTimes: StopTimesCsv) {}
}

export class MultipleStopSequencesError {
  readonly type = "multiple-stop-sequences";
  constructor(readonly stopTimes: StopTimesCsv) {}
}

export class NoMatchingRouteError {
  readonly type = "no-matching-route";
  constructor(readonly stopIds: readonly number[]) {}
}

export class TransferReferencesNonExistentTrip {
  readonly type = "transfer-references-non-existent-trip";
  constructor(
    readonly transfer: TransfersCsvRow,
    readonly field: "from_trip_id" | "to_trip_id",
  ) {}
}

export class TransferIsNotFromTerminusError {
  readonly type = "transfer-is-not-from-terminus";
  constructor(
    readonly transfer: TransfersCsvRow,
    readonly fromTrip: GtfsScheduledTrip,
  ) {}
}

export class TransferIsNotToOriginError {
  readonly type = "transfer-is-not-to-origin";
  constructor(
    readonly transfer: TransfersCsvRow,
    readonly toTrip: GtfsScheduledTrip,
  ) {}
}

export class TransferReferencesTripAlreadyConnectedError {
  readonly type = "transfer-references-trip-already-connected";
  constructor(
    readonly transfer: TransfersCsvRow,
    readonly tripWithExistingConnection: GtfsScheduledTrip,
  ) {}
}

export class TransferIsNotInSeatTransferError {
  readonly type = "transfer-is-not-in-seat-transfer";
  constructor(readonly transfer: TransfersCsvRow) {}
}

export class TransferIsNotSameStopAndPositionError {
  readonly type = "transfer-is-not-same-stop-and-position";
  constructor(readonly transfer: TransfersCsvRow) {}
}

export class TransferCrossesCalendarsError {
  readonly type = "transfer-crosses-calendars";
  constructor(readonly transfer: TransfersCsvRow) {}
}

export class TransferRequiresTimeTravelError {
  readonly type = "transfer-requires-time-travel";
  constructor(readonly transfer: TransfersCsvRow) {}
}

export class NecessaryFieldNotSuppliedForAddedTripError {
  readonly type = "necessary-field-not-supplied-for-added-trip";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly field: "tripId" | "routeId" | "startDate",
  ) {}
}

export class AddedTripIdDuplicatesScheduledTripIdError {
  readonly type = "added-trip-id-duplicates-scheduled-trip-id";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly tripId: string,
  ) {}
}

export class AddedTripStopTimeUpdateMissingTimeError {
  readonly type = "added-trip-stop-time-update-missing-time";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
  ) {}
}

export class AddedTripReferencesUnmappedRouteIdError {
  readonly type = "trip-references-unmapped-route-id";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly gtfsRouteId: string,
  ) {}
}

export class NonSequentialStopTimeUpdateEntryError {
  readonly type = "non-sequential-stop-time-update-entry";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
    readonly expectedStopSequence: number,
  ) {}
}

export class NoStopTimeUpdateFieldGivenError {
  readonly type = "no-stop-time-update-field-given";
  constructor(readonly tripUpdate: TripUpdateJson) {}
}

export class UnsupportedStopTimeUpdateEntryScheduleRelationshipError {
  readonly type = "unsupported-stop-time-update-entry-schedule-relationship";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
  ) {}
}

export class NecessaryFieldNotInStopTimeUpdateEntryError {
  readonly type = "necessary-field-not-in-stop-time-update-entry";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
    readonly field: "stopSequence" | "stopId",
  ) {}
}

export class StopTimeUpdateEntryReferencesUnmappedStopIdError {
  readonly type = "stop-time-update-entry-references-unmapped-stop-id";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
  ) {}
}

export class StopTimeUpdateEntryReferencesNonExistentStopSequenceError {
  readonly type =
    "stop-time-update-entry-references-non-existent-stop-sequence";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
    readonly matchedTrip: GtfsScheduledTrip,
  ) {}
}

export class MultipleStopTimeUpdateEntriesForSameMovementIndexError {
  readonly type = "multiple-stop-time-update-entries-for-same-movement-index";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
    readonly matchedTrip: GtfsScheduledTrip,
    readonly matchedMovementIndex: number,
  ) {}
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
}

export class NeitherTimeNorDelayGivenError {
  readonly type = "neither-time-nor-delay-given";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
    readonly updatedTime: UpdatedTimeJson,
  ) {}
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
}

export class NeitherArrivalNorDepartureGivenError {
  readonly type = "neither-arrival-nor-departure-given";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
  ) {}
}

export class KnownDepartureTimesEntailTimeTravelError {
  readonly type = "known-departure-times-entail-time-travel";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly movements: readonly GtfsUpdatedTripMovement[],
  ) {}
}

export class TooFewSurvivingServicingMovementsError {
  readonly type = "too-few-surviving-servicing-movements";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly survivingMovements: GtfsUpdatedTripMovement[],
  ) {}
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
}

export class TripDescriptorReferencesNonExistentTripIdError {
  readonly type = "trip-descriptor-references-non-existent-trip-id";
  constructor(readonly tripDescriptor: TripDescriptorJson) {}
}

export class TripDoesNotOccurOnStartDateError {
  readonly type = "trip-does-not-occur-on-start-date";
  constructor(
    readonly tripDescriptor: TripDescriptorJson,
    readonly trip: GtfsScheduledTrip,
  ) {}
}

export class TripDescriptorStartTimeDoesNotMatchTripOriginStopTimeError {
  readonly type =
    "trip-descriptor-start-time-does-not-match-trip-origin-stop-time";
  constructor(
    readonly tripDescriptor: TripDescriptorJson,
    readonly trip: GtfsScheduledTrip,
  ) {}
}

export class UnsupportedTripUpdateScheduleRelationshipError {
  readonly type = "unsupported-trip-update-schedule-relationship";
  constructor(readonly tripUpdate: TripUpdateJson) {}
}
