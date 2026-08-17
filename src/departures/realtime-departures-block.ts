import { itsOk } from "@dan-schel/js-utils";
import type { GtfsRealtimeData } from "../data/gtfs-realtime-data.js";
import type { GtfsUpdatedTripServicingMovement } from "../data/gtfs-updated-trip-movements.js";
import type { GtfsUpdatedTrip } from "../data/gtfs-updated-trip.js";
import { DeparturesBlock } from "./departures-block.js";

export type RealtimeDeparturesBlockEntry = {
  readonly trip: GtfsUpdatedTrip;
  readonly instant: Temporal.Instant;
  readonly movement: GtfsUpdatedTripServicingMovement;
};

export class RealtimeDeparturesBlock extends DeparturesBlock {
  private constructor(
    readonly entries: readonly RealtimeDeparturesBlockEntry[],
    earliestDepartureInstant: Temporal.Instant,
    latestDepartureInstant: Temporal.Instant,
  ) {
    super(earliestDepartureInstant, latestDepartureInstant);
  }

  static tryBuild(
    stopId: number,

    // No point using an index for the realtime data, since it can change every
    // 30 seconds, so you're unlikely to re-use it across queries.
    realtimeData: GtfsRealtimeData,
  ): RealtimeDeparturesBlock | null {
    const movements: RealtimeDeparturesBlockEntry[] = [];
    for (const trip of realtimeData.allTrips()) {
      for (const movement of trip.movements) {
        if (!movement.isServicing) continue;
        if (movement.stopId !== stopId) continue;

        movements.push({
          trip,
          instant: movement.timeRelevantToDeparturesAlgorithm,
          movement,
        });
      }
    }

    if (movements.length === 0) return null;

    movements.sort((a, b) => Temporal.Instant.compare(a.instant, b.instant));

    const earliestDepInstant = itsOk(movements[0]).instant;
    const latestDepInstant = itsOk(movements[movements.length - 1]).instant;

    return new RealtimeDeparturesBlock(
      movements,
      earliestDepInstant,
      latestDepInstant,
    );
  }

  override getIterationIndexOfNextFrom(instant: Temporal.Instant): number {
    const result = this.entries.findIndex(
      (m) => Temporal.Instant.compare(m.instant, instant) >= 0,
    );
    return result !== -1 ? result : this.entries.length;
  }

  override getIterationIndexOfPreviousFrom(instant: Temporal.Instant): number {
    // No need to handle -1, because we'd want to return -1 in that case anyway!
    return this.entries.findLastIndex(
      (m) => Temporal.Instant.compare(m.instant, instant) <= 0,
    );
  }
}
