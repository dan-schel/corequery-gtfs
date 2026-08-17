export type {
  GtfsCalendarParsingError,
  DuplicateCalendarIdError,
  UnexpectedCalendarDateExceptionTypeError,
  InvalidCalendarDateRangeError,
  MultipleExceptionsForSameDateError,
} from "./gtfs-calendar-parser.js";

export type {
  GtfsRouteMatchingError,
  NoMatchingRouteError,
  StopTimeReferencesUnmappedStopIdError,
  UnexpectedPickupTypeError,
  UnexpectedDropOffTypeError,
} from "./gtfs-route-matcher.js";

export type { GtfsScheduleParsingError } from "./gtfs-schedule-parser.js";

export type {
  GtfsStopTimeNormalisationError,
  InvalidStopSequenceError,
  MultipleStopSequencesError,
} from "./gtfs-stop-time-normaliser.js";

export type {
  GtfsTransferConnectionError,
  TransferReferencesNonExistentTrip,
  TransferIsNotFromTerminusError,
  TransferIsNotToOriginError,
  TransferReferencesTripAlreadyConnectedError,
  TransferIsNotInSeatTransferError,
  TransferIsNotSameStopAndPositionError,
  TransferCrossesCalendarsError,
  TransferRequiresTimeTravelError,
} from "./gtfs-transfer-connector.js";

export type {
  GtfsTripParsingError,
  StopTimeReferencesNonExistentTripError,
  DuplicateTripIdError,
  TripReferencesNonExistentCalendarError,
  TripReferencesUnmappedRouteIdError,
} from "./gtfs-trip-parser.js";
