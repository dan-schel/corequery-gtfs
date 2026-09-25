import type { GtfsScheduleData } from "../../data/gtfs-schedule-data.js";
import type { TripUpdateJson } from "../../data/raw/realtime-data-json.js";
import type { StopGtfsIdMapping } from "../../data/ids/stop-gtfs-id-mapping.js";
import {
  GtfsAddedTripUpdateParser,
  type GtfsAddedTripUpdateParsingError,
} from "./gtfs-added-trip-update-parser.js";
import {
  GtfsCancelledTripUpdateParser,
  type GtfsCancelledTripUpdateParsingError,
} from "./gtfs-cancelled-trip-update-parser.js";
import {
  GtfsUpdatedTripUpdateParser,
  type GtfsUpdatedTripUpdateParsingError,
} from "./gtfs-updated-trip-update-parser.js";

const TRIP_UPDATE_SCHEDULE_RELATIONSHIP_SCHEDULED = "SCHEDULED";
const TRIP_UPDATE_SCHEDULE_RELATIONSHIP_CANCELLED = "CANCELED";
const TRIP_UPDATE_SCHEDULE_RELATIONSHIP_ADDED = "ADDED";
const TRIP_UPDATE_SCHEDULE_RELATIONSHIP_NEW = "NEW";

export type GtfsTripUpdateParserFields = {
  readonly timezone: string;
  readonly stopGtfsIdMapping: StopGtfsIdMapping;
  readonly onError: (error: GtfsTripUpdateParsingError) => void;
};

export class GtfsTripUpdateParser {
  private readonly _onError: (error: GtfsTripUpdateParsingError) => void;

  private readonly _updatedTripParser: GtfsUpdatedTripUpdateParser;
  private readonly _cancelledTripParser: GtfsCancelledTripUpdateParser;
  private readonly _addedTripParser: GtfsAddedTripUpdateParser;

  constructor(fields: GtfsTripUpdateParserFields) {
    this._onError = fields.onError;

    this._updatedTripParser = new GtfsUpdatedTripUpdateParser({
      timezone: fields.timezone,
      stopGtfsIdMapping: fields.stopGtfsIdMapping,
      onError: this._onError,
    });
    this._cancelledTripParser = new GtfsCancelledTripUpdateParser({
      timezone: fields.timezone,
      onError: this._onError,
    });
    this._addedTripParser = new GtfsAddedTripUpdateParser({
      stopGtfsIdMapping: fields.stopGtfsIdMapping,
      onError: this._onError,
    });
  }

  parse(tripUpdate: TripUpdateJson, scheduleData: GtfsScheduleData) {
    const sr = tripUpdate.trip.scheduleRelationship;

    if (sr === TRIP_UPDATE_SCHEDULE_RELATIONSHIP_SCHEDULED) {
      return this._updatedTripParser.parse(tripUpdate, scheduleData);
    } else if (sr === TRIP_UPDATE_SCHEDULE_RELATIONSHIP_CANCELLED) {
      return this._cancelledTripParser.parse(tripUpdate, scheduleData);
    } else if (
      // ADDED is deprecated in favour of NEW, but PTV still uses ADDED.
      sr === TRIP_UPDATE_SCHEDULE_RELATIONSHIP_ADDED ||
      sr === TRIP_UPDATE_SCHEDULE_RELATIONSHIP_NEW
    ) {
      return this._addedTripParser.parse(tripUpdate, scheduleData);
    } else {
      this._onError(
        new UnsupportedTripUpdateScheduleRelationshipError(tripUpdate),
      );
      return null;
    }
  }
}

export type GtfsTripUpdateParsingError =
  | UnsupportedTripUpdateScheduleRelationshipError
  | GtfsUpdatedTripUpdateParsingError
  | GtfsCancelledTripUpdateParsingError
  | GtfsAddedTripUpdateParsingError;

export class UnsupportedTripUpdateScheduleRelationshipError {
  readonly type = "unsupported-trip-update-schedule-relationship";

  constructor(readonly tripUpdate: TripUpdateJson) {}
}
