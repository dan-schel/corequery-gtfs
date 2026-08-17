import { itsOk } from "@dan-schel/js-utils";
import type { GtfsScheduleData } from "../data/gtfs-schedule-data.js";
import { GtfsStopTime } from "../data/gtfs-stop-time.js";
import type { GtfsScheduledTrip } from "../data/gtfs-scheduled-trip.js";
import type { GtfsScheduledTripServicingMovement } from "../data/gtfs-scheduled-trip-movements.js";
import { PlainDateRange } from "../data/plain-date-range.js";

export type GtfsScheduledMovementsIndexEntry = {
  readonly trip: GtfsScheduledTrip;
  readonly time: GtfsStopTime;
  readonly movement: GtfsScheduledTripServicingMovement;
};

export class GtfsScheduledMovementsIndex {
  private constructor(
    private readonly _index: Map<
      number,
      readonly GtfsScheduledMovementsIndexEntry[]
    >,
    private readonly _rangeEncompassingAllCalendarsByStop: Map<
      number,
      PlainDateRange
    >,
  ) {}

  getMovementsForStop(
    stopId: number,
  ): readonly GtfsScheduledMovementsIndexEntry[] {
    return this._index.get(stopId) ?? [];
  }

  getRangeEncompassingAllCalendarsForStop(
    stopId: number,
  ): PlainDateRange | null {
    return this._rangeEncompassingAllCalendarsByStop.get(stopId) ?? null;
  }

  static build(schedule: GtfsScheduleData): GtfsScheduledMovementsIndex {
    const index = new Map<number, GtfsScheduledMovementsIndexEntry[]>();
    const calendarsByStop = new Map<number, Set<string>>();

    for (const trip of schedule.allTrips()) {
      for (const movement of trip.movements) {
        if (!movement.isServicing) continue;

        const entry: GtfsScheduledMovementsIndexEntry = {
          trip,
          movement,

          // The departure time, unless it's a terminating movement, in which
          // case it's the arrival time.
          time: movement.timeRelevantToDeparturesAlgorithm,
        };

        if (!index.has(movement.stopId)) {
          index.set(movement.stopId, []);
        }
        const existingEntries = itsOk(index.get(movement.stopId));
        existingEntries.push(entry);

        if (!calendarsByStop.has(movement.stopId)) {
          calendarsByStop.set(movement.stopId, new Set());
        }
        const existingCalendars = itsOk(calendarsByStop.get(movement.stopId));
        existingCalendars.add(trip.calendar.gtfsCalendarId);
      }
    }

    for (const entries of index.values()) {
      entries.sort((a, b) => GtfsStopTime.compare(a.time, b.time));
    }

    const rangeEncompassingAllCalendarsByStop = new Map<
      number,
      PlainDateRange
    >();

    for (const [stopId, calendarIds] of calendarsByStop.entries()) {
      let range: PlainDateRange | null = null;

      for (const calendarId of calendarIds) {
        const calendar = schedule.requireCalendar(calendarId);
        const calendarFullDateRange = calendar.getFullDateRange();

        if (range == null) {
          range = calendarFullDateRange;
        } else {
          range = PlainDateRange.encompassing(range, calendarFullDateRange);
        }
      }

      if (range != null) {
        rangeEncompassingAllCalendarsByStop.set(stopId, range);
      }
    }

    return new GtfsScheduledMovementsIndex(
      index,
      rangeEncompassingAllCalendarsByStop,
    );
  }
}
