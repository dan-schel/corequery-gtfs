import type { GtfsScheduleData } from "../../data/gtfs-schedule-data.js";
import type { GtfsScheduledTrip } from "../../data/trip/scheduled/gtfs-scheduled-trip.js";
import { GtfsUpdatedTrip } from "../../data/trip/updated/gtfs-updated-trip.js";
import type {
  StopTimeUpdateJson,
  TripUpdateJson,
  UpdatedTimeJson,
} from "../../data/raw/realtime-data-json.js";
import {
  GtfsTripUpdateTripIdentifier,
  type GtfsTripUpdateTripIdentificationError,
} from "./gtfs-trip-update-trip-identifier.js";
import type { StopGtfsIdMapping } from "../../data/ids/stop-gtfs-id-mapping.js";
import type { GtfsStopTime } from "../../data/gtfs-stop-time.js";
import { itsOk } from "@dan-schel/js-utils";
import type { GtfsUpdatedTripMovement } from "../../data/trip/updated/types.js";
import { GtfsTripMovementsInterpolator } from "./gtfs-trip-movements-interpolator.js";
import { GtfsAddedTrip } from "../../data/trip/added/gtfs-added-trip.js";
import type { GtfsAddedTripServicingMovement } from "../../data/trip/added/types.js";
import { GtfsAddedTripOriginatingMovement } from "../../data/trip/added/gtfs-added-trip-originating-movement.js";
import { GtfsAddedTripTerminatingMovement } from "../../data/trip/added/gtfs-added-trip-terminating-movement.js";
import { GtfsAddedTripRegularMovement } from "../../data/trip/added/gtfs-added-trip-regular-movement.js";

const TRIP_UPDATE_SCHEDULE_RELATIONSHIP_SCHEDULED = "SCHEDULED";
const TRIP_UPDATE_SCHEDULE_RELATIONSHIP_CANCELLED = "CANCELED";
const TRIP_UPDATE_SCHEDULE_RELATIONSHIP_ADDED = "ADDED";
const TRIP_UPDATE_SCHEDULE_RELATIONSHIP_NEW = "NEW";
const STOP_TIME_UPDATE_ENTRY_SCHEDULE_RELATIONSHIP_SCHEDULED = "SCHEDULED";

export type GtfsTripUpdateParserFields = {
  readonly timezone: string;
  readonly stopGtfsIdMapping: StopGtfsIdMapping;
  readonly onError: (error: GtfsTripUpdateParsingError) => void;
};

export class GtfsTripUpdateParser {
  private readonly _timezone: string;
  private readonly _stopGtfsIdMapping: StopGtfsIdMapping;
  private readonly _onError: (error: GtfsTripUpdateParsingError) => void;

  private readonly _tripIdentifier: GtfsTripUpdateTripIdentifier;
  private readonly _movementsInterpolator: GtfsTripMovementsInterpolator;

  constructor(fields: GtfsTripUpdateParserFields) {
    this._timezone = fields.timezone;
    this._stopGtfsIdMapping = fields.stopGtfsIdMapping;
    this._onError = fields.onError;

    this._tripIdentifier = new GtfsTripUpdateTripIdentifier({
      onError: this._onError,
    });
    this._movementsInterpolator = new GtfsTripMovementsInterpolator();
  }

  parse(tripUpdate: TripUpdateJson, scheduleData: GtfsScheduleData) {
    const sr = tripUpdate.trip.scheduleRelationship;

    // TODO: Each one of these branches should probably move to it's own
    // dedicated parser class.
    if (sr === TRIP_UPDATE_SCHEDULE_RELATIONSHIP_SCHEDULED) {
      return this._parseForScheduledTrip(tripUpdate, scheduleData);
    } else if (sr === TRIP_UPDATE_SCHEDULE_RELATIONSHIP_CANCELLED) {
      return this._parseForCancelledTrip(tripUpdate, scheduleData);
    } else if (
      // ADDED is deprecated in favour of NEW, but PTV still uses ADDED.
      sr === TRIP_UPDATE_SCHEDULE_RELATIONSHIP_ADDED ||
      sr === TRIP_UPDATE_SCHEDULE_RELATIONSHIP_NEW
    ) {
      // TODO: Test this.
      return this._parseForAddedTrip(tripUpdate, scheduleData);
    } else {
      this._onError(
        new UnsupportedTripUpdateScheduleRelationshipError(tripUpdate),
      );
      return null;
    }
  }

  private _parseForScheduledTrip(
    tripUpdate: TripUpdateJson,
    scheduleData: GtfsScheduleData,
  ): GtfsUpdatedTrip | null {
    const result = this._tripIdentifier.identify(tripUpdate.trip, scheduleData);
    if (result == null) return null;
    const { trip, serviceDay } = result;

    if (tripUpdate.stopTimeUpdate == null) {
      this._onError(new NoStopTimeUpdateFieldGivenError(tripUpdate));
      return null;
    }

    const updatedMovementsByIndex = new Map<number, GtfsUpdatedTripMovement>();

    for (const entry of tripUpdate.stopTimeUpdate) {
      // This `scheduleRelationship` field is probably how altered routes work.
      const sr = entry.scheduleRelationship;
      if (sr !== STOP_TIME_UPDATE_ENTRY_SCHEDULE_RELATIONSHIP_SCHEDULED) {
        const Err = UnsupportedStopTimeUpdateEntryScheduleRelationshipError;
        this._onError(new Err(tripUpdate, entry));
        return null;
      }

      // Check the fields we're gonna rely on (that PTV seems to reliably give
      // but are technically optional in the GTFS-RT spec) are actually present.
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
      if (entry.arrival == null && entry.departure == null) {
        const Err = NeitherArrivalNorDepartureGivenError;
        this._onError(new Err(tripUpdate, entry));
        return null;
      }

      // Find the stop in the scheduled trip that this update is supposed to be
      // for.
      const movementIndex = trip.movements.findIndex(
        (m) => m.isServicing && m.gtfsStopSequence === entry.stopSequence,
      );
      if (movementIndex === -1) {
        const Err = StopTimeUpdateEntryReferencesNonExistentStopSequenceError;
        this._onError(new Err(tripUpdate, entry, trip));
        return null;
      }

      // Enforced by findIndex above.
      const scheduledMovement = itsOk(trip.movements[movementIndex]);
      if (!scheduledMovement.isServicing) throw new Error();

      // Check that we haven't already matched a stop time update entry to this
      // movement index. (Would happen if `stopSequence` was the same value
      // twice, I guess.)
      if (updatedMovementsByIndex.has(movementIndex)) {
        const Err = MultipleStopTimeUpdateEntriesForSameMovementIndexError;
        this._onError(new Err(tripUpdate, entry, trip, movementIndex));
        return null;
      }

      // Look up the stop GTFS ID given in the stop time update entry, and check
      // whether it still maps to the same (CoreQuery) stop. In this way, we
      // allow the platform/position ID to change, not the overall stop/station.
      const gtfsIdMetadata = this._stopGtfsIdMapping.tryResolve(entry.stopId);
      if (gtfsIdMetadata == null) {
        const Err = StopTimeUpdateEntryReferencesUnmappedStopIdError;
        this._onError(new Err(tripUpdate, entry));
        return null;
      }
      if (gtfsIdMetadata.stopId !== scheduledMovement.gtfsIdMetadata.stopId) {
        const Err = StopTimeUpdateEntryChangesStopError;
        this._onError(new Err(tripUpdate, entry, trip, movementIndex));
        return null;
      }

      const updatedPositionId =
        gtfsIdMetadata.type === "positional" ? gtfsIdMetadata.positionId : null;

      // Parse the updated times from the `arrivalTime` and `departureTime`
      // fields.
      const realtimeArrivalTime =
        "arrivalTime" in scheduledMovement
          ? this._parseUpdatedTime(
              entry.arrival ?? null,
              scheduledMovement.arrivalTime,
              serviceDay,
              tripUpdate,
              entry,
            )
          : null;
      const realtimeDepartureTime =
        "departureTime" in scheduledMovement
          ? this._parseUpdatedTime(
              entry.departure ?? null,
              scheduledMovement.departureTime,
              serviceDay,
              tripUpdate,
              entry,
            )
          : null;

      updatedMovementsByIndex.set(
        movementIndex,
        scheduledMovement.asUpdatedTripMovement({
          arrivalTime: realtimeArrivalTime,
          departureTime: realtimeDepartureTime,
          updatedPositionId,
          updatedGtfsIdMetadata: gtfsIdMetadata,
          serviceDay,
          timezone: this._timezone,
        }),
      );
    }

    const rawMovements = trip.movements.map((m, i) => {
      return (
        updatedMovementsByIndex.get(i) ??
        m.asHollowUpdatedTripMovement(serviceDay, this._timezone)
      );
    });

    const interpolated = this._movementsInterpolator.interpolate(rawMovements);
    if (interpolated == null) {
      // TODO: This keeps happening in the PTV feed. In all the cases I've seen
      // so far, the arrival times are one minute later than the departure times
      // (for whatever reason). I think I should apply a patch for it, rather
      // than "fixing" it in corequery-gtfs.
      //
      // TODO: Add a test for this.
      const Err = KnownDepartureTimesEntailTimeTravelError;
      this._onError(new Err(tripUpdate, rawMovements));
      return null;
    }

    return new GtfsUpdatedTrip({
      scheduledTrip: trip,
      serviceDay,
      movements: interpolated,
      isCancelled: false,
    });
  }

  private _parseForCancelledTrip(
    tripUpdate: TripUpdateJson,
    scheduleData: GtfsScheduleData,
  ): GtfsUpdatedTrip | null {
    const result = this._tripIdentifier.identify(tripUpdate.trip, scheduleData);
    if (result == null) return null;
    const { trip, serviceDay } = result;

    return GtfsUpdatedTrip.unmodified(trip, serviceDay, this._timezone).with({
      isCancelled: true,
    });
  }

  private _parseForAddedTrip(
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

            // TODO: There doesn't seem to be any method for the GTFS-RT feed to
            // provide this. So far, we don't have any method for TrainQuery to
            // manually provide rules for set down only/pick up only stops, so
            // if V/Line are adding trips, this will be a problem!
            //
            // The solution will probably involve adding metadata to stops on
            // each route, to say whether they're set down only/pick up only by
            // default (similar to how TrainQuery v3 did it).
            picksUp: true,
            dropsOff: true,
          }),
        );
      }
    }

    // TODO: Add in passing movements through route matching, and use route
    // matching to determine the lineId, serviceTags, and color.

    return new GtfsAddedTrip({
      gtfsTripId,
      serviceDay,
      movements: servicingMovements,

      // TODO: Obviously wrong!
      lineIds: [],
      serviceTags: [],
      color: null,
    });
  }

  private _parseUpdatedTime(
    updatedTime: UpdatedTimeJson | null,
    scheduledTime: GtfsStopTime,
    serviceDay: Temporal.PlainDate,
    tripUpdate: TripUpdateJson,
    stopTimeUpdateEntry: StopTimeUpdateJson,
  ): Temporal.Instant | null {
    if (updatedTime == null) {
      return null;
    }

    const { time, delay } = updatedTime;

    const fromTime =
      time != null ? Temporal.Instant.fromEpochMilliseconds(time * 1000) : null;

    const fromDelay =
      delay != null
        ? scheduledTime
            .toInstant(serviceDay, this._timezone)
            .add({ seconds: delay })
        : null;

    // Most/all trips in PTV's realtime feed have both time and delay. If using
    // both of those methods gives us different results, then I've probably
    // messed something up (e.g. maybe my service day assumption in the trip
    // identifier is wrong)... or PTV has.
    //
    // We'll press on (this check is only meant for reporting/my interest), but
    // the something's probably gonna be very broken for this trip!
    if (fromTime != null && fromDelay != null && !fromTime.equals(fromDelay)) {
      this._onError(
        new TimeAndDelayDisagreeWithEachOtherError(
          tripUpdate,
          stopTimeUpdateEntry,
          updatedTime,
          fromTime,
          fromDelay,
        ),
      );
    }

    // I don't think it really matters which of `delay` or `time` we preference,
    // since they're either identical, or we've (probably) messed up the service
    // day, in which case we're either applying the right time to the wrong
    // service (`time`), or the we've calculated the time assuming the wrong
    // service day (`delay`).
    //
    // It'll probably be clearer to me trying to debug this if we apply this
    // realtime update to yesterday/tomorrow's service and it makes it look like
    // there's two departures of the same service happening at/near to the same
    // time, so I'll pick `time`.
    if (fromTime != null) {
      return fromTime;
    } else if (fromDelay != null) {
      return fromDelay;
    } else {
      const Err = NeitherTimeNorDelayGivenError;
      this._onError(new Err(tripUpdate, stopTimeUpdateEntry, updatedTime));
      return null;
    }
  }
}

export type GtfsTripUpdateParsingError =
  | UnsupportedTripUpdateScheduleRelationshipError
  | GtfsTripUpdateTripIdentificationError
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
  | NecessaryFieldNotSuppliedForAddedTripError
  | AddedTripIdDuplicatesScheduledTripIdError
  | AddedTripStopTimeUpdateMissingTimeError;

export class UnsupportedTripUpdateScheduleRelationshipError {
  readonly type = "unsupported-trip-update-schedule-relationship";

  constructor(readonly tripUpdate: TripUpdateJson) {}
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

export class StopTimeUpdateEntryReferencesUnmappedStopIdError {
  readonly type = "stop-time-update-entry-references-unmapped-stop-id";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
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

class KnownDepartureTimesEntailTimeTravelError {
  readonly type = "known-departure-times-entail-time-travel";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly movements: readonly GtfsUpdatedTripMovement[],
  ) {}
}

class NecessaryFieldNotSuppliedForAddedTripError {
  readonly type = "necessary-field-not-supplied-for-added-trip";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly field: "tripId" | "routeId" | "startDate",
  ) {}
}

class AddedTripIdDuplicatesScheduledTripIdError {
  readonly type = "added-trip-id-duplicates-scheduled-trip-id";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly tripId: string,
  ) {}
}

class AddedTripStopTimeUpdateMissingTimeError {
  readonly type = "added-trip-stop-time-update-missing-time";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
  ) {}
}
