import { itsOk } from "@dan-schel/js-utils";
import type { StopGtfsIdMapping } from "../../data/ids/stop-gtfs-id-mapping.js";
import type { LineGtfsIdMapping } from "../../data/ids/line-gtfs-id-mapping.js";
import type { LineRoutesMapping } from "../../data/route/line-routes-mapping.js";
import type { BonusLinesMapping } from "../../data/route/bonus-lines-mapping.js";
import type { GtfsScheduleData } from "../../data/gtfs-schedule-data.js";
import type {
  StopTimeUpdateJson,
  TripUpdateJson,
  UpdatedTimeJson,
} from "../../data/raw/realtime-data-json.js";
import type { GtfsScheduledTrip } from "../../data/trip/scheduled/gtfs-scheduled-trip.js";
import type { GtfsStopTime } from "../../data/gtfs-stop-time.js";
import { GtfsUpdatedTrip } from "../../data/trip/updated/gtfs-updated-trip.js";
import type { GtfsUpdatedTripMovement } from "../../data/trip/updated/types.js";
import { GtfsReplacedTrip } from "../../data/trip/replaced/gtfs-replaced-trip.js";
import { GtfsReplacedTripOriginatingMovement } from "../../data/trip/replaced/gtfs-replaced-trip-originating-movement.js";
import { GtfsReplacedTripRegularMovement } from "../../data/trip/replaced/gtfs-replaced-trip-regular-movement.js";
import { GtfsReplacedTripTerminatingMovement } from "../../data/trip/replaced/gtfs-replaced-trip-terminating-movement.js";
import { GtfsReplacedTripPassingMovement } from "../../data/trip/replaced/gtfs-replaced-trip-passing-movement.js";
import type {
  GtfsReplacedTripMovement,
  GtfsReplacedTripServicingMovement,
} from "../../data/trip/replaced/types.js";
import {
  GtfsRouteMatcher,
  type GtfsRouteMatchingError,
} from "../gtfs-route-matcher.js";
import {
  NecessaryFieldNotInStopTimeUpdateEntryError,
  NoStopTimeUpdateFieldGivenError,
  StopTimeUpdateEntryReferencesUnmappedStopIdError,
  UnsupportedStopTimeUpdateEntryScheduleRelationshipError,
} from "./gtfs-trip-update-parser-common-error-types.js";
import {
  GtfsScheduledTripIdentifier,
  type GtfsScheduledTripIdentificationError,
} from "./gtfs-scheduled-trip-identifier.js";
import { GtfsTripMovementsInterpolator } from "./gtfs-trip-movements-interpolator.js";

const STOP_TIME_UPDATE_ENTRY_SCHEDULE_RELATIONSHIP_SKIPPED = "SKIPPED";
const STOP_TIME_UPDATE_ENTRY_SCHEDULE_RELATIONSHIP_SCHEDULED = "SCHEDULED";

export type GtfsReplacedTripUpdateParserFields = {
  readonly timezone: string;
  readonly stopGtfsIdMapping: StopGtfsIdMapping;
  readonly lineGtfsIdMapping: LineGtfsIdMapping;
  readonly lineRoutesMapping: LineRoutesMapping;
  readonly bonusLinesMapping: BonusLinesMapping;
  readonly onError: (error: GtfsReplacedTripUpdateParsingError) => void;
};

export class GtfsReplacedTripUpdateParser {
  private readonly _timezone: string;
  private readonly _stopGtfsIdMapping: StopGtfsIdMapping;
  private readonly _lineGtfsIdMapping: LineGtfsIdMapping;
  private readonly _onError: (
    error: GtfsReplacedTripUpdateParsingError,
  ) => void;
  private readonly _routeMatcher: GtfsRouteMatcher;
  private readonly _tripIdentifier: GtfsScheduledTripIdentifier;
  private readonly _movementsInterpolator: GtfsTripMovementsInterpolator;

  constructor(fields: GtfsReplacedTripUpdateParserFields) {
    this._timezone = fields.timezone;
    this._stopGtfsIdMapping = fields.stopGtfsIdMapping;
    this._lineGtfsIdMapping = fields.lineGtfsIdMapping;
    this._onError = fields.onError;
    this._routeMatcher = new GtfsRouteMatcher({
      onError: this._onError,
      lineRoutesMapping: fields.lineRoutesMapping,
      bonusLinesMapping: fields.bonusLinesMapping,
    });
    this._tripIdentifier = new GtfsScheduledTripIdentifier({
      onError: this._onError,
    });
    this._movementsInterpolator = new GtfsTripMovementsInterpolator();
  }

  parse(
    tripUpdate: TripUpdateJson,
    scheduleData: GtfsScheduleData,
  ): GtfsReplacedTrip | null {
    const identification = this._tripIdentifier.identify(
      tripUpdate.trip,
      scheduleData,
    );
    if (identification == null) return null;
    const { trip, serviceDay } = identification;

    const entries = tripUpdate.stopTimeUpdate;
    if (entries == null) return null;

    const skippedStopSequences = new Set<number>();
    const skippedMovementIndexes = new Set<number>();

    for (const entry of entries) {
      if (
        entry.scheduleRelationship !==
        STOP_TIME_UPDATE_ENTRY_SCHEDULE_RELATIONSHIP_SKIPPED
      ) {
        continue;
      }

      if (entry.stopSequence == null) {
        this._onError(
          new NecessaryFieldNotInStopTimeUpdateEntryError(
            tripUpdate,
            entry,
            "stopSequence",
          ),
        );
        return null;
      }
      if (entry.stopId == null) {
        this._onError(
          new NecessaryFieldNotInStopTimeUpdateEntryError(
            tripUpdate,
            entry,
            "stopId",
          ),
        );
        return null;
      }

      const movementIndex = trip.movements.findIndex(
        (movement) =>
          movement.isServicing &&
          movement.gtfsStopSequence === entry.stopSequence,
      );
      if (movementIndex === -1) {
        this._onError(
          new SkippedStopTimeUpdateEntryReferencesNonExistentStopSequenceError(
            tripUpdate,
            entry,
            trip,
          ),
        );
        return null;
      }
      if (skippedMovementIndexes.has(movementIndex)) {
        this._onError(
          new MultipleSkippedStopTimeUpdateEntriesForSameMovementIndexError(
            tripUpdate,
            entry,
            trip,
            movementIndex,
          ),
        );
        return null;
      }

      const scheduledMovement = trip.movements[movementIndex];
      if (scheduledMovement == null || !scheduledMovement.isServicing) {
        throw new Error();
      }

      const gtfsIdMetadata = this._stopGtfsIdMapping.tryResolve(entry.stopId);
      if (gtfsIdMetadata == null) {
        this._onError(
          new StopTimeUpdateEntryReferencesUnmappedStopIdError(
            tripUpdate,
            entry,
          ),
        );
        return null;
      }
      if (gtfsIdMetadata.stopId !== scheduledMovement.gtfsIdMetadata.stopId) {
        this._onError(
          new SkippedStopTimeUpdateEntryChangesStopError(
            tripUpdate,
            entry,
            trip,
            movementIndex,
          ),
        );
        return null;
      }

      skippedStopSequences.add(entry.stopSequence);
      skippedMovementIndexes.add(movementIndex);
    }

    const duplicatedEntry = entries.find(
      (entry) =>
        entry.stopSequence != null &&
        skippedStopSequences.has(entry.stopSequence) &&
        entry.scheduleRelationship !==
          STOP_TIME_UPDATE_ENTRY_SCHEDULE_RELATIONSHIP_SKIPPED,
    );
    if (duplicatedEntry != null) {
      const movementIndex = trip.movements.findIndex(
        (movement) =>
          movement.isServicing &&
          movement.gtfsStopSequence === duplicatedEntry.stopSequence,
      );
      if (movementIndex !== -1) {
        this._onError(
          new MultipleSkippedStopTimeUpdateEntriesForSameMovementIndexError(
            tripUpdate,
            duplicatedEntry,
            trip,
            movementIndex,
          ),
        );
        return null;
      }
    }

    const updatedTrip = this._parseStopTimeUpdates(
      {
        ...tripUpdate,
        stopTimeUpdate: entries.filter(
          (entry) =>
            entry.scheduleRelationship !==
            STOP_TIME_UPDATE_ENTRY_SCHEDULE_RELATIONSHIP_SKIPPED,
        ),
      },
      trip,
      serviceDay,
    );
    if (updatedTrip == null) return null;

    const updatedServicingMovements = updatedTrip.movements.filter(
      (movement) =>
        movement.isServicing &&
        !skippedStopSequences.has(movement.gtfsStopSequence),
    );
    if (updatedServicingMovements.length < 2) {
      this._onError(
        new ReplacedTripHasTooFewServicingMovementsError(
          tripUpdate,
          updatedServicingMovements.length,
        ),
      );
      return null;
    }

    const servicingMovements: GtfsReplacedTripServicingMovement[] =
      updatedServicingMovements.map((movement, index) => {
        if (index === 0) {
          if (!("effectiveDepartureTime" in movement)) throw new Error();
          return new GtfsReplacedTripOriginatingMovement({
            stopId: movement.stopId,
            positionId: movement.updatedPositionId,
            departureTime: movement.effectiveDepartureTime,
            gtfsIdMetadata: movement.updatedGtfsIdMetadata,
            gtfsStopSequence: movement.gtfsStopSequence,
          });
        }

        if (index === updatedServicingMovements.length - 1) {
          if (!("effectiveArrivalTime" in movement)) throw new Error();
          return new GtfsReplacedTripTerminatingMovement({
            stopId: movement.stopId,
            positionId: movement.updatedPositionId,
            arrivalTime: movement.effectiveArrivalTime,
            gtfsIdMetadata: movement.updatedGtfsIdMetadata,
            gtfsStopSequence: movement.gtfsStopSequence,
          });
        }

        if (movement.type !== "regular") throw new Error();
        return new GtfsReplacedTripRegularMovement({
          stopId: movement.stopId,
          positionId: movement.updatedPositionId,
          arrivalTime: movement.effectiveArrivalTime,
          departureTime: movement.effectiveDepartureTime,
          picksUp: movement.picksUp,
          dropsOff: movement.dropsOff,
          gtfsIdMetadata: movement.updatedGtfsIdMetadata,
          gtfsStopSequence: movement.gtfsStopSequence,
        });
      });

    const routeMetadata = this._lineGtfsIdMapping.tryResolve(trip.gtfsRouteId);
    if (routeMetadata == null || routeMetadata.type === "ignored") {
      this._onError(
        new ReplacedTripReferencesUnroutableRouteIdError(
          tripUpdate,
          trip.gtfsRouteId,
        ),
      );
      return null;
    }

    const routeMatch = this._routeMatcher.match<GtfsReplacedTripMovement>(
      routeMetadata.lineId,
      servicingMovements,
      (stopId) => new GtfsReplacedTripPassingMovement({ stopId }),
    );
    if (routeMatch == null) return null;

    return new GtfsReplacedTrip({
      scheduledTrip: trip,
      serviceDay,
      movements: routeMatch.movements,
      lineIds: routeMatch.lineIds,
      serviceTags: routeMatch.serviceTags,
      color: routeMatch.color,
    });
  }

  private _parseStopTimeUpdates(
    tripUpdate: TripUpdateJson,
    trip: GtfsScheduledTrip,
    serviceDay: Temporal.PlainDate,
  ): GtfsUpdatedTrip | null {
    if (tripUpdate.stopTimeUpdate == null) {
      this._onError(new NoStopTimeUpdateFieldGivenError(tripUpdate));
      return null;
    }

    const updatedMovementsByIndex = new Map<number, GtfsUpdatedTripMovement>();
    for (const entry of tripUpdate.stopTimeUpdate) {
      if (
        entry.scheduleRelationship !==
        STOP_TIME_UPDATE_ENTRY_SCHEDULE_RELATIONSHIP_SCHEDULED
      ) {
        this._onError(
          new UnsupportedStopTimeUpdateEntryScheduleRelationshipError(
            tripUpdate,
            entry,
          ),
        );
        return null;
      }
      if (entry.stopSequence == null) {
        this._onError(
          new NecessaryFieldNotInStopTimeUpdateEntryError(
            tripUpdate,
            entry,
            "stopSequence",
          ),
        );
        return null;
      }
      if (entry.stopId == null) {
        this._onError(
          new NecessaryFieldNotInStopTimeUpdateEntryError(
            tripUpdate,
            entry,
            "stopId",
          ),
        );
        return null;
      }
      if (entry.arrival == null && entry.departure == null) {
        this._onError(
          new NeitherArrivalNorDepartureGivenError(tripUpdate, entry),
        );
        return null;
      }

      const movementIndex = trip.movements.findIndex(
        (movement) =>
          movement.isServicing &&
          movement.gtfsStopSequence === entry.stopSequence,
      );
      if (movementIndex === -1) {
        this._onError(
          new StopTimeUpdateEntryReferencesNonExistentStopSequenceError(
            tripUpdate,
            entry,
            trip,
          ),
        );
        return null;
      }

      const scheduledMovement = itsOk(trip.movements[movementIndex]);
      if (!scheduledMovement.isServicing) throw new Error();
      if (updatedMovementsByIndex.has(movementIndex)) {
        this._onError(
          new MultipleStopTimeUpdateEntriesForSameMovementIndexError(
            tripUpdate,
            entry,
            trip,
            movementIndex,
          ),
        );
        return null;
      }

      const gtfsIdMetadata = this._stopGtfsIdMapping.tryResolve(entry.stopId);
      if (gtfsIdMetadata == null) {
        this._onError(
          new StopTimeUpdateEntryReferencesUnmappedStopIdError(
            tripUpdate,
            entry,
          ),
        );
        return null;
      }
      if (gtfsIdMetadata.stopId !== scheduledMovement.gtfsIdMetadata.stopId) {
        this._onError(
          new StopTimeUpdateEntryChangesStopError(
            tripUpdate,
            entry,
            trip,
            movementIndex,
          ),
        );
        return null;
      }

      const arrivalTime =
        "arrivalTime" in scheduledMovement
          ? this._parseUpdatedTime(
              entry.arrival ?? null,
              scheduledMovement.arrivalTime,
              serviceDay,
              tripUpdate,
              entry,
            )
          : null;
      const departureTime =
        "departureTime" in scheduledMovement
          ? this._parseUpdatedTime(
              entry.departure ?? null,
              scheduledMovement.departureTime,
              serviceDay,
              tripUpdate,
              entry,
            )
          : null;
      const updatedPositionId =
        gtfsIdMetadata.type === "positional" ? gtfsIdMetadata.positionId : null;

      updatedMovementsByIndex.set(
        movementIndex,
        scheduledMovement.asUpdatedTripMovement({
          arrivalTime,
          departureTime,
          updatedPositionId,
          updatedGtfsIdMetadata: gtfsIdMetadata,
          serviceDay,
          timezone: this._timezone,
        }),
      );
    }

    const rawMovements = trip.movements.map(
      (movement, index) =>
        updatedMovementsByIndex.get(index) ??
        movement.asHollowUpdatedTripMovement(serviceDay, this._timezone),
    );
    const movements = this._movementsInterpolator.interpolate(rawMovements);
    if (movements == null) {
      this._onError(
        new KnownDepartureTimesEntailTimeTravelError(tripUpdate, rawMovements),
      );
      return null;
    }

    return new GtfsUpdatedTrip({
      scheduledTrip: trip,
      serviceDay,
      movements,
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
    if (updatedTime == null) return null;

    const { time, delay } = updatedTime;
    const fromTime =
      time != null ? Temporal.Instant.fromEpochMilliseconds(time * 1000) : null;
    const fromDelay =
      delay != null
        ? scheduledTime
            .toInstant(serviceDay, this._timezone)
            .add({ seconds: delay })
        : null;

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
    if (fromTime != null) return fromTime;
    if (fromDelay != null) return fromDelay;

    this._onError(
      new NeitherTimeNorDelayGivenError(
        tripUpdate,
        stopTimeUpdateEntry,
        updatedTime,
      ),
    );
    return null;
  }
}

export type GtfsReplacedTripUpdateParsingError =
  | GtfsScheduledTripIdentificationError
  | GtfsRouteMatchingError
  | NecessaryFieldNotInStopTimeUpdateEntryError
  | NoStopTimeUpdateFieldGivenError
  | UnsupportedStopTimeUpdateEntryScheduleRelationshipError
  | StopTimeUpdateEntryReferencesUnmappedStopIdError
  | StopTimeUpdateEntryReferencesNonExistentStopSequenceError
  | MultipleStopTimeUpdateEntriesForSameMovementIndexError
  | StopTimeUpdateEntryChangesStopError
  | NeitherArrivalNorDepartureGivenError
  | NeitherTimeNorDelayGivenError
  | TimeAndDelayDisagreeWithEachOtherError
  | KnownDepartureTimesEntailTimeTravelError
  | SkippedStopTimeUpdateEntryReferencesNonExistentStopSequenceError
  | MultipleSkippedStopTimeUpdateEntriesForSameMovementIndexError
  | SkippedStopTimeUpdateEntryChangesStopError
  | ReplacedTripHasTooFewServicingMovementsError
  | ReplacedTripReferencesUnroutableRouteIdError;

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

export class StopTimeUpdateEntryChangesStopError {
  readonly type = "stop-time-update-entry-changes-stop";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
    readonly matchedTrip: GtfsScheduledTrip,
    readonly matchedMovementIndex: number,
  ) {}
}

export class NeitherArrivalNorDepartureGivenError {
  readonly type = "neither-arrival-nor-departure-given";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
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

export class KnownDepartureTimesEntailTimeTravelError {
  readonly type = "known-departure-times-entail-time-travel";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly movements: readonly GtfsUpdatedTripMovement[],
  ) {}
}

export class SkippedStopTimeUpdateEntryReferencesNonExistentStopSequenceError {
  readonly type =
    "skipped-stop-time-update-entry-references-non-existent-stop-sequence";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
    readonly matchedTrip: GtfsScheduledTrip,
  ) {}
}

export class MultipleSkippedStopTimeUpdateEntriesForSameMovementIndexError {
  readonly type =
    "multiple-skipped-stop-time-update-entries-for-same-movement-index";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
    readonly matchedTrip: GtfsScheduledTrip,
    readonly matchedMovementIndex: number,
  ) {}
}

export class SkippedStopTimeUpdateEntryChangesStopError {
  readonly type = "skipped-stop-time-update-entry-changes-stop";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly stopTimeUpdateEntry: StopTimeUpdateJson,
    readonly matchedTrip: GtfsScheduledTrip,
    readonly matchedMovementIndex: number,
  ) {}
}

export class ReplacedTripHasTooFewServicingMovementsError {
  readonly type = "replaced-trip-has-too-few-servicing-movements";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly remainingMovementCount: number,
  ) {}
}

export class ReplacedTripReferencesUnroutableRouteIdError {
  readonly type = "replaced-trip-references-unroutable-route-id";
  constructor(
    readonly tripUpdate: TripUpdateJson,
    readonly gtfsRouteId: string,
  ) {}
}
