import { itsOk } from "@dan-schel/js-utils";
import type { StopGtfsIdMapping } from "../../data/ids/stop-gtfs-id-mapping.js";
import type {
  TripUpdateJson,
  UpdatedTimeJson,
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
  AddedTripIdDuplicatesScheduledTripIdError,
  AddedTripReferencesUnmappedRouteIdError,
  AddedTripStopTimeUpdateMissingTimeError,
  NecessaryFieldNotSuppliedForAddedTripError,
  NecessaryFieldNotInStopTimeUpdateEntryError,
  NoStopTimeUpdateFieldGivenError,
  NonSequentialStopTimeUpdateEntryError,
  StopTimeUpdateEntryReferencesUnmappedStopIdError,
  UnsupportedStopTimeUpdateEntryScheduleRelationshipError,
  type GtfsAddedTripUpdateParsingError,
} from "../error-types.js";
import { GtfsRouteMatcher } from "../gtfs-route-matcher.js";
import type { LineRoutesMapping } from "../../data/route/line-routes-mapping.js";
import type { BonusLinesMapping } from "../../data/route/bonus-lines-mapping.js";
import type { LineGtfsIdMapping } from "../../data/ids/line-gtfs-id-mapping.js";
import { GtfsAddedTripPassingMovement } from "../../data/trip/added/gtfs-added-trip-passing-movement.js";

const STOP_TIME_UPDATE_ENTRY_SCHEDULE_RELATIONSHIP_SCHEDULED = "SCHEDULED";
const STOP_TIME_PROPERTIES_DROP_OFF_PICKUP_TYPE_NONE = "NONE";

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

      if (entry.stopSequence !== i + 1) {
        this._onError(
          new NonSequentialStopTimeUpdateEntryError(tripUpdate, entry, i + 1),
        );
      }

      const stopId = gtfsIdMetadata.stopId;
      const positionId =
        gtfsIdMetadata.type === "positional" ? gtfsIdMetadata.positionId : null;

      if (i === 0) {
        const departure = this._parseTime(entry.departure ?? null);
        if (departure == null) {
          const Err = AddedTripStopTimeUpdateMissingTimeError;
          this._onError(new Err(tripUpdate, entry));
          return null;
        }

        servicingMovements.push(
          new GtfsAddedTripOriginatingMovement({
            stopId,
            positionId,
            scheduledDepartureTime: departure.scheduledTime,
            knownRealtimeDepartureTime: departure.knownRealtimeTime,
            gtfsIdMetadata,
            gtfsStopSequence: entry.stopSequence,
          }),
        );
      } else if (i === sortedEntries.length - 1) {
        const arrival = this._parseTime(entry.arrival ?? null);
        if (arrival == null) {
          const Err = AddedTripStopTimeUpdateMissingTimeError;
          this._onError(new Err(tripUpdate, entry));
          return null;
        }

        servicingMovements.push(
          new GtfsAddedTripTerminatingMovement({
            stopId,
            positionId,
            scheduledArrivalTime: arrival.scheduledTime,
            knownRealtimeArrivalTime: arrival.knownRealtimeTime,
            gtfsIdMetadata,
            gtfsStopSequence: entry.stopSequence,
          }),
        );
      } else {
        const departure = this._parseTime(entry.departure ?? null);
        const arrival = this._parseTime(
          entry.arrival ?? entry.departure ?? null,
        );

        if (arrival == null || departure == null) {
          const Err = AddedTripStopTimeUpdateMissingTimeError;
          this._onError(new Err(tripUpdate, entry));
          return null;
        }

        // I'm not sure if V/Line actually supplies `stop_time_properties`
        // (experimental field). If not, we might need to handle it manually.
        // This could involve adding metadata to stops on each route, to say
        // whether they're set down only/pick up only by default (similar to how
        // TrainQuery v3 did it).
        const picksUp =
          entry.stopTimeProperties?.pickupType !==
          STOP_TIME_PROPERTIES_DROP_OFF_PICKUP_TYPE_NONE;
        const dropsOff =
          entry.stopTimeProperties?.dropOffType !==
          STOP_TIME_PROPERTIES_DROP_OFF_PICKUP_TYPE_NONE;

        servicingMovements.push(
          new GtfsAddedTripRegularMovement({
            stopId,
            positionId,
            scheduledArrivalTime: arrival.scheduledTime,
            knownRealtimeArrivalTime: arrival.knownRealtimeTime,
            scheduledDepartureTime: departure.scheduledTime,
            knownRealtimeDepartureTime: departure.knownRealtimeTime,
            gtfsIdMetadata,
            gtfsStopSequence: entry.stopSequence,

            picksUp,
            dropsOff,
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

  private _parseTime(updatedTime: UpdatedTimeJson | null) {
    if (updatedTime?.time == null) return null;

    const knownRealtimeTime = Temporal.Instant.fromEpochMilliseconds(
      updatedTime.time * 1000,
    );

    // Added trips have no scheduled trip to pull scheduled times from, but PTV
    // still supplies a delay alongside the time, so we can work backwards from
    // it. The GTFS-RT spec doesn't require `delay` for added trips, so this may
    // be null.
    const scheduledTime =
      updatedTime.delay != null
        ? knownRealtimeTime.subtract({ seconds: updatedTime.delay })
        : null;

    return { scheduledTime, knownRealtimeTime };
  }
}
