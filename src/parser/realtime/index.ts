export type { GtfsRealtimeDataParsingError } from "./gtfs-realtime-data-parser.js";

export type {
  GtfsTripUpdateParsingError,
  UnsupportedTripUpdateScheduleRelationshipError,
  NoStopTimeUpdateFieldGivenError,
  UnsupportedStopTimeUpdateEntryScheduleRelationshipError,
  NecessaryFieldNotInStopTimeUpdateEntryError,
  StopTimeUpdateEntryReferencesNonExistentStopSequenceError,
  MultipleStopTimeUpdateEntriesForSameMovementIndexError,
  StopTimeUpdateEntryReferencesUnmappedStopIdError,
  StopTimeUpdateEntryChangesStopError,
  StopTimeUpdateEntryChangesPlatformError,
  NeitherTimeNorDelayGivenError,
  TimeAndDelayDisagreeWithEachOtherError,
  NeitherArrivalNorDepartureGivenError,
} from "./gtfs-trip-update-parser.js";

export type {
  GtfsTripUpdateTripIdentificationError,
  NecessaryFieldNotInTripDescriptorError,
  TripDescriptorReferencesNonExistentTripIdError,
  TripDoesNotOccurOnStartDateError,
  TripDescriptorStartTimeDoesNotMatchTripOriginStopTimeError,
} from "./gtfs-trip-update-trip-identifier.js";
