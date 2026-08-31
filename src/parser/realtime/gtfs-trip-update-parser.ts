import type { GtfsScheduleData } from "../../data/gtfs-schedule-data.js";
import type { GtfsScheduledTrip } from "../../data/gtfs-scheduled-trip.js";
import { GtfsUpdatedTrip } from "../../data/gtfs-updated-trip.js";
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
import type { GtfsUpdatedTripMovement } from "../../data/gtfs-updated-trip-movements.js";

const TRIP_UPDATE_SCHEDULE_RELATIONSHIP_SCHEDULED = "SCHEDULED";
const TRIP_UPDATE_SCHEDULE_RELATIONSHIP_CANCELLED = "CANCELED";
const STOP_TIME_UPDATE_ENTRY_SCHEDULE_RELATIONSHIP_SCHEDULED = "SCHEDULED";

export class GtfsTripUpdateParser {
  private readonly _tripIdentifier: GtfsTripUpdateTripIdentifier;

  constructor(
    // We could maybe store this in the GtfsSchedule obj itself if we wanted,
    // since you can parse it from agency.txt.
    private readonly _timezone: string,

    private readonly _onError: (error: GtfsTripUpdateParsingError) => void,
  ) {
    this._tripIdentifier = new GtfsTripUpdateTripIdentifier(_onError);
  }

  parse(
    tripUpdate: TripUpdateJson,
    scheduleData: GtfsScheduleData,
    stopGtfsIdMapping: StopGtfsIdMapping,
  ) {
    const sr = tripUpdate.trip.scheduleRelationship;

    if (sr === TRIP_UPDATE_SCHEDULE_RELATIONSHIP_SCHEDULED) {
      return this._parseForScheduledTrip(
        tripUpdate,
        scheduleData,
        stopGtfsIdMapping,
      );
    } else if (sr === TRIP_UPDATE_SCHEDULE_RELATIONSHIP_CANCELLED) {
      return this._parseForCancelledTrip(tripUpdate, scheduleData);
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
    stopGtfsIdMapping: StopGtfsIdMapping,
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
      const gtfsIdMetadata = stopGtfsIdMapping.tryResolve(entry.stopId);
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

      // This is not really an error (note that I don't return null!), it's just
      // logging to see if it ever happens. We support platform changes done in
      // this way, but I built that support on assumptions, and I have no idea
      // if this is typically how PTV would represent a platform change.
      if (gtfsIdMetadata.id !== scheduledMovement.gtfsIdMetadata.id) {
        const Err = StopTimeUpdateEntryChangesPlatformError;
        this._onError(new Err(tripUpdate, entry, trip, movementIndex));
      }

      const updatedPositionId =
        gtfsIdMetadata.type === "platform" ? gtfsIdMetadata.positionId : null;

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

    let movements = trip.movements.map((m) =>
      m.asHollowUpdatedTripMovement(serviceDay, this._timezone),
    );
    movements = movements.map((movement, i) => {
      return updatedMovementsByIndex.get(i) ?? movement;
    });

    return new GtfsUpdatedTrip({
      scheduledTrip: trip,
      serviceDay,
      movements,
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
  | StopTimeUpdateEntryChangesPlatformError
  | NeitherTimeNorDelayGivenError
  | TimeAndDelayDisagreeWithEachOtherError
  | NeitherArrivalNorDepartureGivenError;

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

// i.e. It doesn't just change the platform (which we're fine with), but the
// entire stop.
export class StopTimeUpdateEntryChangesStopError {
  readonly type = "stop-time-update-entry-changes-stop";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
    readonly matchedTrip: GtfsScheduledTrip,
    readonly matchedMovementIndex: number,
  ) {}
}

// Just logging this to see if it ever happens. It's not really an error, and we
// handle it well.
export class StopTimeUpdateEntryChangesPlatformError {
  readonly type = "stop-time-update-entry-changes-platform";
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
