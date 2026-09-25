import type {
  StopTimeUpdateJson,
  TripUpdateJson,
} from "../../data/raw/realtime-data-json.js";

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
