import { itsOk } from "@dan-schel/js-utils";
import type { StopGtfsIdMapping } from "../../data/ids/stop-gtfs-id-mapping.js";
import type {
  StopTimeUpdateJson,
  TripUpdateJson,
} from "../../data/raw/realtime-data-json.js";
import type { GtfsScheduleData } from "../../data/gtfs-schedule-data.js";
import { GtfsAddedTripOriginatingMovement } from "../../data/trip/added/gtfs-added-trip-originating-movement.js";
import { GtfsAddedTripRegularMovement } from "../../data/trip/added/gtfs-added-trip-regular-movement.js";
import { GtfsAddedTripTerminatingMovement } from "../../data/trip/added/gtfs-added-trip-terminating-movement.js";
import { GtfsAddedTrip } from "../../data/trip/added/gtfs-added-trip.js";
import type {
  GtfsAddedTripMovement,
  GtfsAddedTripServicingMovement,
} from "../../data/trip/added/types.js";
import {
  NecessaryFieldNotInStopTimeUpdateEntryError,
  NoStopTimeUpdateFieldGivenError,
  StopTimeUpdateEntryReferencesUnmappedStopIdError,
  UnsupportedStopTimeUpdateEntryScheduleRelationshipError,
} from "./gtfs-trip-update-parser-common-error-types.js";
import {
  GtfsRouteMatcher,
  type GtfsRouteMatchingError,
} from "../gtfs-route-matcher.js";
import type { LineRoutesMapping } from "../../data/route/line-routes-mapping.js";
import type { BonusLinesMapping } from "../../data/route/bonus-lines-mapping.js";
import type { LineGtfsIdMapping } from "../../data/ids/line-gtfs-id-mapping.js";
import { GtfsAddedTripPassingMovement } from "../../data/trip/added/gtfs-added-trip-passing-movement.js";

const STOP_TIME_UPDATE_ENTRY_SCHEDULE_RELATIONSHIP_SCHEDULED = "SCHEDULED";

export type GtfsAddedTripUpdateParserFields = {
  readonly stopGtfsIdMapping: StopGtfsIdMapping;
  readonly lineGtfsIdMapping: LineGtfsIdMapping;
  readonly lineRoutesMapping: LineRoutesMapping;
  readonly bonusLinesMapping: BonusLinesMapping;
  readonly onError: (error: GtfsAddedTripUpdateParsingError) => void;
};

export class GtfsAddedTripUpdateParser {
  private readonly _onError: (error: GtfsAddedTripUpdateParsingError) => void;

  private readonly _stopGtfsIdMapping: StopGtfsIdMapping;
  private readonly _lineGtfsIdMapping: LineGtfsIdMapping;
  private readonly _routeMatcher: GtfsRouteMatcher;

  constructor(fields: GtfsAddedTripUpdateParserFields) {
    this._onError = fields.onError;
    this._stopGtfsIdMapping = fields.stopGtfsIdMapping;
    this._lineGtfsIdMapping = fields.lineGtfsIdMapping;

    this._routeMatcher = new GtfsRouteMatcher({
      onError: fields.onError,
      lineRoutesMapping: fields.lineRoutesMapping,
      bonusLinesMapping: fields.bonusLinesMapping,
    });
  }

  parse(
    tripUpdate: TripUpdateJson,
    scheduleData: GtfsScheduleData,
  ): GtfsAddedTrip | null {
    // TODO: Test this.

    const gtfsTripId = tripUpdate.trip.tripId;
    if (gtfsTripId == null) {
      const Err = NecessaryFieldNotSuppliedForAddedTripError;
      this._onError(new Err(tripUpdate, "tripId"));
      return null;
    }

    const gtfsRouteId = tripUpdate.trip.routeId;
    if (gtfsRouteId == null) {
      const Err = NecessaryFieldNotSuppliedForAddedTripError;
      this._onError(new Err(tripUpdate, "routeId"));
      return null;
    }
    const lineGtfsIdMetadata = this._lineGtfsIdMapping.tryResolve(gtfsRouteId);
    if (lineGtfsIdMetadata == null) {
      const Err = AddedTripReferencesUnmappedRouteIdError;
      this._onError(new Err(tripUpdate, gtfsRouteId));
      return null;
    }

    const serviceDay = tripUpdate.trip.startDate;
    if (serviceDay == null) {
      const Err = NecessaryFieldNotSuppliedForAddedTripError;
      this._onError(new Err(tripUpdate, "startDate"));
      return null;
    }

    if (scheduleData.getTrip(gtfsTripId) != null) {
      const Err = AddedTripIdDuplicatesScheduledTripIdError;
      this._onError(new Err(tripUpdate, gtfsTripId));
      return null;
    }

    if (tripUpdate.stopTimeUpdate == null) {
      this._onError(new NoStopTimeUpdateFieldGivenError(tripUpdate));
      return null;
    }

    // TODO: Report non-sequential stop sequences, like we do for scheduled
    // trips?
    const sortedEntries = [...tripUpdate.stopTimeUpdate].sort(
      (a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0),
    );

    const servicingMovements: GtfsAddedTripServicingMovement[] = [];
    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = itsOk(sortedEntries[i]);

      // "ADDED" trips seem to always have "SCHEDULED" stop time updates, even
      // though that kinda makes no sense. I guess it's as opposed to "SKIPPED".
      const sr = entry.scheduleRelationship;
      if (sr !== STOP_TIME_UPDATE_ENTRY_SCHEDULE_RELATIONSHIP_SCHEDULED) {
        const Err = UnsupportedStopTimeUpdateEntryScheduleRelationshipError;
        this._onError(new Err(tripUpdate, entry));
        return null;
      }

      if (entry.stopSequence == null) {
        const Err = NecessaryFieldNotInStopTimeUpdateEntryError;
        this._onError(new Err(tripUpdate, entry, "stopSequence"));
        return null;
      }

      if (entry.stopId == null) {
        const Err = NecessaryFieldNotInStopTimeUpdateEntryError;
        this._onError(new Err(tripUpdate, entry, "stopId"));
        return null;
      }

      const gtfsIdMetadata = this._stopGtfsIdMapping.tryResolve(entry.stopId);
      if (gtfsIdMetadata == null) {
        const Err = StopTimeUpdateEntryReferencesUnmappedStopIdError;
        this._onError(new Err(tripUpdate, entry));
        return null;
      }

      const stopId = gtfsIdMetadata.stopId;
      const positionId =
        gtfsIdMetadata.type === "positional" ? gtfsIdMetadata.positionId : null;

      // TODO: PTV still seems to provide delay values for "ADDED" trips, from
      // which we could infer scheduled times for these added trips. The added
      // trip movement classes don't currently support scheduled vs realtime
      // times because I assumed GTFS-RT wouldn't supply scheduled times for
      // added trips, but it looks like that's wrong!
      if (i === 0) {
        const departureTimestamp = entry.departure?.time;
        if (departureTimestamp == null) {
          const Err = AddedTripStopTimeUpdateMissingTimeError;
          this._onError(new Err(tripUpdate, entry));
          return null;
        }

        const departureTime = Temporal.Instant.fromEpochMilliseconds(
          departureTimestamp * 1000,
        );

        servicingMovements.push(
          new GtfsAddedTripOriginatingMovement({
            stopId,
            positionId,
            departureTime,
            gtfsIdMetadata,
            gtfsStopSequence: entry.stopSequence,
          }),
        );
      } else if (i === sortedEntries.length - 1) {
        const arrivalTimestamp = entry.arrival?.time;
        if (arrivalTimestamp == null) {
          const Err = AddedTripStopTimeUpdateMissingTimeError;
          this._onError(new Err(tripUpdate, entry));
          return null;
        }

        const arrivalTime = Temporal.Instant.fromEpochMilliseconds(
          arrivalTimestamp * 1000,
        );

        servicingMovements.push(
          new GtfsAddedTripTerminatingMovement({
            stopId,
            positionId,
            arrivalTime,
            gtfsIdMetadata,
            gtfsStopSequence: entry.stopSequence,
          }),
        );
      } else {
        const departureTimestamp = entry.departure?.time;
        const arrivalTimestamp = (entry.arrival ?? entry.departure)?.time;

        if (arrivalTimestamp == null || departureTimestamp == null) {
          const Err = AddedTripStopTimeUpdateMissingTimeError;
          this._onError(new Err(tripUpdate, entry));
          return null;
        }

        const arrivalTime = Temporal.Instant.fromEpochMilliseconds(
          arrivalTimestamp * 1000,
        );
        const departureTime = Temporal.Instant.fromEpochMilliseconds(
          departureTimestamp * 1000,
        );

        servicingMovements.push(
          new GtfsAddedTripRegularMovement({
            stopId,
            positionId,
            arrivalTime,
            departureTime,
            gtfsIdMetadata,
            gtfsStopSequence: entry.stopSequence,

            // TODO: These can be set via `stop_time_properties` (experimental
            // field), but I'm not sure if V/Line actually does. If not, we
            // might need to handle it manually. This could involve adding
            // metadata to stops on each route, to say whether they're set down
            // only/pick up only by default (similar to how TrainQuery v3 did
            // it).
            picksUp: true,
            dropsOff: true,
          }),
        );
      }
    }

    const routeMatch = this._routeMatcher.match<GtfsAddedTripMovement>(
      lineGtfsIdMetadata.lineId,
      servicingMovements,
      (stopId) => new GtfsAddedTripPassingMovement({ stopId }),
    );
    // Route matcher reports its own errors.
    if (routeMatch == null) return null;

    return new GtfsAddedTrip({
      gtfsTripId,
      serviceDay,
      movements: routeMatch.movements,
      lineIds: routeMatch.lineIds,
      serviceTags: routeMatch.serviceTags,
      color: routeMatch.color,
    });
  }
}

export type GtfsAddedTripUpdateParsingError =
  | NecessaryFieldNotSuppliedForAddedTripError
  | AddedTripIdDuplicatesScheduledTripIdError
  | NoStopTimeUpdateFieldGivenError
  | UnsupportedStopTimeUpdateEntryScheduleRelationshipError
  | NecessaryFieldNotInStopTimeUpdateEntryError
  | StopTimeUpdateEntryReferencesUnmappedStopIdError
  | AddedTripStopTimeUpdateMissingTimeError
  | AddedTripReferencesUnmappedRouteIdError
  | GtfsRouteMatchingError;

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
