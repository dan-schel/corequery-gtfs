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
import { GtfsScheduledTrip } from "../../data/gtfs-scheduled-trip.js";
import {
  GtfsStopTimeNormaliser,
  type GtfsStopTimeNormalisationError,
} from "./gtfs-stop-time-normaliser.js";
import {
  GtfsRouteMatcher,
  type GtfsRouteMatchingError,
} from "./gtfs-route-matcher.js";
import {
  type GtfsTransferConnectionError,
  GtfsTransferConnector,
} from "./gtfs-transfer-connector.js";
import type { LineRoutesMapping } from "../../data/route/line-routes-mapping.js";
import type { BonusLinesMapping } from "../../data/route/bonus-lines-mapping.js";

export class GtfsTripParser {
  private readonly _stopTimeNormaliser: GtfsStopTimeNormaliser;
  private readonly _primaryRouteMatcher: GtfsRouteMatcher;
  private readonly _bonusRouteMatcher: GtfsRouteMatcher;
  private readonly _transferConnector: GtfsTransferConnector;

  constructor(
    // Unlike csvs, lineGtfsIdMapping, and stopGtfsIdMapping, these are not
    // subfeed-dependent, so I'm opting to make them constructor args.
    private readonly _lineRoutesMapping: LineRoutesMapping,
    private readonly _bonusLinesMapping: BonusLinesMapping,

    private readonly _onError: (error: GtfsTripParsingError) => void,
  ) {
    this._stopTimeNormaliser = new GtfsStopTimeNormaliser(this._onError);
    this._primaryRouteMatcher = new GtfsRouteMatcher(this._onError);
    this._transferConnector = new GtfsTransferConnector(this._onError);

    // We don't care if a bonus route doesn't match. Most of the time, it won't!
    this._bonusRouteMatcher = new GtfsRouteMatcher(() => {});
  }

  parse(
    trips: TripsCsv,
    stopTimes: StopTimesCsv,
    transfers: TransfersCsv,
    calendars: readonly GtfsCalendar[],
    lineGtfsIdMapping: LineGtfsIdMapping,
    stopGtfsIdMapping: StopGtfsIdMapping,
  ) {
    const calendarMap = this._buildCalendarMap(calendars);
    const rowsByTrip = this._organiseStopTimesIntoTrips(trips, stopTimes);

    const unconnectedTrips: GtfsScheduledTrip[] = [];
    const ignoredTripIds: string[] = [];

    for (const { trip, stopTimes } of rowsByTrip) {
      const calendar = calendarMap.get(trip.service_id);
      if (calendar == null) {
        this._onError(new TripReferencesNonExistentCalendarError(trip));
        continue;
      }

      const lineIdMatch = lineGtfsIdMapping.tryResolve(trip.route_id);
      if (lineIdMatch == null) {
        this._onError(new TripReferencesUnmappedRouteIdError(trip));
        continue;
      }

      if (lineIdMatch.type === "replacement-bus") {
        ignoredTripIds.push(trip.trip_id);
        continue;
      }

      const normalizedStopTimes = this._stopTimeNormaliser.normalise(stopTimes);
      // Stop time normaliser reports its own errors.
      if (normalizedStopTimes == null) continue;

      const routesForLine = this._lineRoutesMapping.forLine(lineIdMatch.lineId);

      const routeMatchResult = this._primaryRouteMatcher.match(
        normalizedStopTimes,
        routesForLine,
        stopGtfsIdMapping,
      );
      // Route matcher reports its own errors.
      if (routeMatchResult == null) continue;

      const { lineIds, serviceTags } = this._applyBonusLines(
        lineIdMatch.lineId,
        routeMatchResult.serviceTags,
        normalizedStopTimes,
        stopGtfsIdMapping,
      );

      unconnectedTrips.push(
        new GtfsScheduledTrip({
          gtfsTripId: trip.trip_id,
          gtfsRouteId: trip.route_id,
          calendar,
          movements: routeMatchResult.movements,
          lineIds,
          color: routeMatchResult.color,
          serviceTags,
          previousTrip: null,
          nextTrip: null,
        }),
      );
    }

    const parsedTrips: readonly GtfsScheduledTrip[] =
      this._transferConnector.connect(unconnectedTrips, transfers);

    return { parsedTrips, ignoredTripIds };
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

  private _applyBonusLines(
    mainRouteLineId: number,
    mainRouteServiceTags: readonly number[],
    normalizedStopTimes: StopTimesCsv,
    stopGtfsIdMapping: StopGtfsIdMapping,
  ) {
    const bonusLines = this._bonusLinesMapping.forLine(mainRouteLineId);
    if (bonusLines == null) {
      return { lineIds: [mainRouteLineId], serviceTags: mainRouteServiceTags };
    }

    // Go through all bonus lines, and collect the line IDs and service tags
    // for any routes that match.
    const lineIds = new Set<number>();
    const serviceTags = new Set<number>();
    for (const bonusLine of bonusLines.lines) {
      const matchResult = this._bonusRouteMatcher.match(
        normalizedStopTimes,
        this._lineRoutesMapping.forLine(bonusLine),
        stopGtfsIdMapping,
      );

      if (matchResult != null) {
        lineIds.add(bonusLine);
        for (const serviceTag of matchResult.serviceTags) {
          serviceTags.add(serviceTag);
        }
      }
    }

    // If in "replace" mode, we throw away the main route's line ID and tags if
    // anything else matches. Otherwise they're added on.
    const shouldReplace = lineIds.size > 0 && bonusLines.mode === "replace";
    if (!shouldReplace) {
      lineIds.add(mainRouteLineId);
      for (const serviceTag of mainRouteServiceTags) {
        serviceTags.add(serviceTag);
      }
    }

    return {
      lineIds: Array.from(lineIds),
      serviceTags: Array.from(serviceTags),
    };
  }

  private _buildCalendarMap(calendars: readonly GtfsCalendar[]) {
    return new Map<string, GtfsCalendar>(
      calendars.map((c) => [c.gtfsCalendarId, c]),
    );
  }
}

export type GtfsTripParsingError =
  | StopTimeReferencesNonExistentTripError
  | DuplicateTripIdError
  | TripReferencesNonExistentCalendarError
  | TripReferencesUnmappedRouteIdError
  | GtfsStopTimeNormalisationError
  | GtfsRouteMatchingError
  | GtfsTransferConnectionError;

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
