import type { LineGtfsIdMapping } from "../../data/ids/line-gtfs-id-mapping.js";
import type { StopGtfsIdMapping } from "../../data/ids/stop-gtfs-id-mapping.js";
import type {
  StopTimesCsv,
  StopTimesCsvRow,
  TransfersCsv,
  TripsCsv,
  TripsCsvRow,
} from "../../data/raw/schedule-csvs.js";
import type { GtfsCalendar } from "../../data/gtfs-calendar.js";
import { GtfsScheduledTrip } from "../../data/trip/scheduled/gtfs-scheduled-trip.js";
import {
  GtfsStopTimeNormaliser,
  type GtfsStopTimeNormalisationError,
} from "./gtfs-stop-time-normaliser.js";
import {
  GtfsRouteMatcher,
  type GtfsRouteMatchingError,
} from "../gtfs-route-matcher.js";
import {
  type GtfsTransferParsingError,
  GtfsTransferParser,
} from "./gtfs-transfer-parser.js";
import type { LineRoutesMapping } from "../../data/route/line-routes-mapping.js";
import type { BonusLinesMapping } from "../../data/route/bonus-lines-mapping.js";
import type {
  GtfsScheduledTripMovement,
  GtfsScheduledTripServicingMovement,
} from "../../data/trip/scheduled/types.js";
import { itsOk } from "@dan-schel/js-utils";
import { GtfsScheduledTripOriginatingMovement } from "../../data/trip/scheduled/gtfs-scheduled-trip-originating-movement.js";
import { GtfsScheduledTripTerminatingMovement } from "../../data/trip/scheduled/gtfs-scheduled-trip-terminating-movement.js";
import { GtfsScheduledTripRegularMovement } from "../../data/trip/scheduled/gtfs-scheduled-trip-regular-movement.js";
import { GtfsScheduledTripPassingMovement } from "../../data/trip/scheduled/gtfs-scheduled-trip-passing-movement.js";

const STOP_TIME_PICKUP_TYPE_REGULAR = 0;
const STOP_TIME_PICKUP_TYPE_NO_PICKUP = 1;
const STOP_TIME_DROP_OFF_TYPE_REGULAR = 0;
const STOP_TIME_DROP_OFF_TYPE_NO_DROP_OFF = 1;

export type GtfsTripParserFields = {
  readonly lineRoutesMapping: LineRoutesMapping;
  readonly bonusLinesMapping: BonusLinesMapping;
  readonly lineGtfsIdMapping: LineGtfsIdMapping;
  readonly stopGtfsIdMapping: StopGtfsIdMapping;
  readonly onError: (error: GtfsTripParsingError) => void;
};

export class GtfsTripParser {
  private readonly _lineRoutesMapping: LineRoutesMapping;
  private readonly _lineGtfsIdMapping: LineGtfsIdMapping;
  private readonly _stopGtfsIdMapping: StopGtfsIdMapping;

  private readonly _onError: (error: GtfsTripParsingError) => void;

  private readonly _stopTimeNormaliser: GtfsStopTimeNormaliser;
  private readonly _routeMatcher: GtfsRouteMatcher;
  private readonly _transferParser: GtfsTransferParser;

  constructor(fields: GtfsTripParserFields) {
    this._lineRoutesMapping = fields.lineRoutesMapping;
    this._lineGtfsIdMapping = fields.lineGtfsIdMapping;
    this._stopGtfsIdMapping = fields.stopGtfsIdMapping;
    this._onError = fields.onError;

    this._stopTimeNormaliser = new GtfsStopTimeNormaliser({
      onError: this._onError,
    });
    this._routeMatcher = new GtfsRouteMatcher({
      onError: this._onError,
      lineRoutesMapping: fields.lineRoutesMapping,
      bonusLinesMapping: fields.bonusLinesMapping,
    });
    this._transferParser = new GtfsTransferParser({
      onError: this._onError,
    });
  }

  parse(
    trips: TripsCsv,
    stopTimes: StopTimesCsv,
    transfers: TransfersCsv,
    calendars: readonly GtfsCalendar[],
  ) {
    const calendarMap = this._buildCalendarMap(calendars);
    const rowsByTrip = this._organiseStopTimesIntoTrips(trips, stopTimes);

    const parsedTrips: GtfsScheduledTrip[] = [];
    const ignoredTripIds: string[] = [];

    for (const { trip, stopTimes } of rowsByTrip) {
      const calendar = calendarMap.get(trip.service_id);
      if (calendar == null) {
        this._onError(new TripReferencesNonExistentCalendarError(trip));
        continue;
      }

      const lineIdMatch = this._lineGtfsIdMapping.tryResolve(trip.route_id);
      if (lineIdMatch == null) {
        this._onError(new TripReferencesUnmappedRouteIdError(trip));
        continue;
      }

      if (lineIdMatch.type === "ignored") {
        ignoredTripIds.push(trip.trip_id);
        continue;
      }

      const normalizedStopTimes = this._stopTimeNormaliser.normalise(stopTimes);
      // Stop time normaliser reports its own errors.
      if (normalizedStopTimes == null) continue;

      const servicingMovements =
        this._convertToServicingMovements(normalizedStopTimes);
      if (servicingMovements == null) continue;

      const routeMatch = this._routeMatcher.match<GtfsScheduledTripMovement>(
        lineIdMatch.lineId,
        servicingMovements,
        (stopId) => new GtfsScheduledTripPassingMovement({ stopId }),
      );
      // Route matcher reports its own errors.
      if (routeMatch == null) continue;

      parsedTrips.push(
        new GtfsScheduledTrip({
          gtfsTripId: trip.trip_id,
          gtfsRouteId: trip.route_id,
          calendar,
          movements: routeMatch.movements,
          lineIds: routeMatch.lineIds,
          color: routeMatch.color,
          serviceTags: routeMatch.serviceTags,
        }),
      );
    }

    const parsedTransfers = this._transferParser.parse(parsedTrips, transfers);

    return { parsedTrips, parsedTransfers, ignoredTripIds };
  }

  private _buildCalendarMap(calendars: readonly GtfsCalendar[]) {
    return new Map<string, GtfsCalendar>(
      calendars.map((c) => [c.gtfsCalendarId, c]),
    );
  }

  private _organiseStopTimesIntoTrips(
    trips: TripsCsv,
    stopTimes: StopTimesCsv,
  ) {
    type MutableGroups = { trip: TripsCsvRow; stopTimes: StopTimesCsvRow[] };
    const result = new Map<string, MutableGroups>();

    // Step 1: Build a map from everything in trips.txt.
    for (const trip of trips) {
      if (result.has(trip.trip_id)) {
        // We only keep the first trip we see for a given trip_id, I guess.
        this._onError(new DuplicateTripIdError(trip));
        continue;
      }

      result.set(trip.trip_id, { trip, stopTimes: [] });
    }

    // Step 2: Iterate through stop_times.txt and add each row to the
    // appropriate trip.
    for (const stopTime of stopTimes) {
      const trip = result.get(stopTime.trip_id);

      if (trip == null) {
        // It's likely if something's missing from trips.txt that multiple
        // stop_times.txt rows will reference it. However, I consider it out of
        // scope for the parser to group those errors. Something which listens
        // for the errors (i.e. to build some report) is responsible for that.
        this._onError(new StopTimeReferencesNonExistentTripError(stopTime));
        continue;
      }

      trip.stopTimes.push(stopTime);
    }

    // Step 3: Convert to an array. Do NOT sort by stop_sequence, as the stop
    // time normaliser is interested in the original order of the rows in
    // stop_times.txt for some special case handling (i.e. PTV has published
    // invalid data, but we can still interpret it).
    return Array.from(result.values()).map((group) => ({
      ...group,
      stopTimes: group.stopTimes,
    }));
  }

  private _convertToServicingMovements(
    stopTimes: StopTimesCsv,
  ): readonly GtfsScheduledTripServicingMovement[] | null {
    const result: GtfsScheduledTripServicingMovement[] = [];

    for (let i = 0; i < stopTimes.length; i++) {
      const stopTime = itsOk(stopTimes[i]);

      const gtfsIdMetadata = this._stopGtfsIdMapping.tryResolve(
        stopTime.stop_id,
      );
      if (gtfsIdMetadata == null) {
        this._onError(new StopTimeReferencesUnmappedStopIdError(stopTime));
        return null;
      }

      const positionId =
        gtfsIdMetadata.type === "positional" ? gtfsIdMetadata.positionId : null;

      const picksUp = this._doesPickUp(stopTime);
      const dropsOff = this._doesDropOff(stopTime);

      if (i === 0) {
        result.push(
          new GtfsScheduledTripOriginatingMovement({
            stopId: gtfsIdMetadata.stopId,
            positionId,
            departureTime: stopTime.departure_time,
            gtfsIdMetadata,
            gtfsStopSequence: stopTime.stop_sequence,
          }),
        );
      } else if (i === stopTimes.length - 1) {
        result.push(
          new GtfsScheduledTripTerminatingMovement({
            stopId: gtfsIdMetadata.stopId,
            positionId,
            arrivalTime: stopTime.arrival_time,
            gtfsIdMetadata,
            gtfsStopSequence: stopTime.stop_sequence,
          }),
        );
      } else {
        result.push(
          new GtfsScheduledTripRegularMovement({
            stopId: gtfsIdMetadata.stopId,
            positionId,
            arrivalTime: stopTime.arrival_time,
            departureTime: stopTime.departure_time,
            picksUp,
            dropsOff,
            gtfsIdMetadata,
            gtfsStopSequence: stopTime.stop_sequence,
          }),
        );
      }
    }

    return result;
  }

  private _doesPickUp(stopTime: StopTimesCsvRow): boolean {
    if (stopTime.pickup_type === STOP_TIME_PICKUP_TYPE_REGULAR) {
      return true;
    } else if (stopTime.pickup_type === STOP_TIME_PICKUP_TYPE_NO_PICKUP) {
      return false;
    } else {
      this._onError(new UnexpectedPickupTypeError(stopTime));

      // If pickup_type is unexpected, let's just treat it like a normal stop. I
      // don't think we need to exclude the whole trip for something as minor as
      // mislabelling pick up only stops.
      return true;
    }
  }

  private _doesDropOff(stopTime: StopTimesCsvRow): boolean {
    if (stopTime.drop_off_type === STOP_TIME_DROP_OFF_TYPE_REGULAR) {
      return true;
    } else if (stopTime.drop_off_type === STOP_TIME_DROP_OFF_TYPE_NO_DROP_OFF) {
      return false;
    } else {
      this._onError(new UnexpectedDropOffTypeError(stopTime));

      // If drop_off_type is unexpected, let's just treat it like a normal stop.
      // I don't think we need to exclude the whole trip for something as minor
      // as mislabelling drop off only stops.
      return true;
    }
  }
}

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
