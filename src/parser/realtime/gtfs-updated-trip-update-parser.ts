import { itsOk } from "@dan-schel/js-utils";
import type { StopGtfsIdMapping } from "../../data/ids/stop-gtfs-id-mapping.js";
import type {
  StopTimeUpdateJson,
  TripUpdateJson,
  UpdatedTimeJson,
} from "../../data/raw/realtime-data-json.js";
import type { GtfsScheduleData } from "../../data/gtfs-schedule-data.js";
import type { GtfsStopTime } from "../../data/gtfs-stop-time.js";
import type { GtfsScheduledTrip } from "../../data/trip/scheduled/gtfs-scheduled-trip.js";
import { GtfsUpdatedTrip } from "../../data/trip/updated/gtfs-updated-trip.js";
import type { GtfsUpdatedTripMovement } from "../../data/trip/updated/types.js";
import { GtfsTripMovementsInterpolator } from "./gtfs-trip-movements-interpolator.js";
import {
  GtfsScheduledTripIdentifier,
  type GtfsScheduledTripIdentificationError,
} from "./gtfs-scheduled-trip-identifier.js";
import {
  NecessaryFieldNotInStopTimeUpdateEntryError,
  NoStopTimeUpdateFieldGivenError,
  StopTimeUpdateEntryReferencesUnmappedStopIdError,
  UnsupportedStopTimeUpdateEntryScheduleRelationshipError,
} from "./gtfs-trip-update-parser-common-error-types.js";

const STOP_TIME_UPDATE_ENTRY_SCHEDULE_RELATIONSHIP_SCHEDULED = "SCHEDULED";

export type GtfsUpdatedTripUpdateParserFields = {
  readonly timezone: string;
  readonly stopGtfsIdMapping: StopGtfsIdMapping;
  readonly onError: (error: GtfsUpdatedTripUpdateParsingError) => void;
};

export class GtfsUpdatedTripUpdateParser {
  private readonly _timezone: string;
  private readonly _stopGtfsIdMapping: StopGtfsIdMapping;
  private readonly _onError: (error: GtfsUpdatedTripUpdateParsingError) => void;

  private readonly _tripIdentifier: GtfsScheduledTripIdentifier;
  private readonly _movementsInterpolator: GtfsTripMovementsInterpolator;

  constructor(fields: GtfsUpdatedTripUpdateParserFields) {
    this._timezone = fields.timezone;
    this._stopGtfsIdMapping = fields.stopGtfsIdMapping;
    this._onError = fields.onError;

    this._tripIdentifier = new GtfsScheduledTripIdentifier({
      onError: this._onError,
    });
    this._movementsInterpolator = new GtfsTripMovementsInterpolator();
  }

  parse(
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

export type GtfsUpdatedTripUpdateParsingError =
  | GtfsScheduledTripIdentificationError
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
  | KnownDepartureTimesEntailTimeTravelError;

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

class KnownDepartureTimesEntailTimeTravelError {
  readonly type = "known-departure-times-entail-time-travel";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly movements: readonly GtfsUpdatedTripMovement[],
  ) {}
}
