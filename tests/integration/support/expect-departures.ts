import { assertNever } from "@dan-schel/js-utils";
import { expect } from "vitest";
import { GtfsScheduledTrip } from "../../../src/data/gtfs-scheduled-trip.js";
import { GtfsUpdatedTrip } from "../../../src/data/gtfs-updated-trip.js";
import type { GtfsTripServicingMovement } from "../../../src/data/utils.js";
import type { DeparturesIteratorResult } from "../../../src/departures/departures-iterator.js";
import type { GtfsSystem } from "../../../src/gtfs-system.js";
import type { StopNameMapping } from "./create-stop-name-mapping.js";
import type { DeparturesIterationDirection } from "../../../src/corequery-types.js";

export function expectDeparturesToMatchSnapshot({
  system,
  stopNameMapping,
  stopName,
  instant,
  direction,
  maxResults,
  formatTimezone,
}: {
  system: GtfsSystem;
  stopNameMapping: StopNameMapping;
  stopName: string;
  instant: string;
  direction: DeparturesIterationDirection;
  maxResults: number;
  formatTimezone: string;
}) {
  const stopId = stopNameMapping.requireId(stopName);
  const iterator = system.requireFeed().createDepartureIterator(stopId);

  iterator.set(Temporal.Instant.from(instant), direction);

  const results: string[] = [];

  for (let i = 0; i < maxResults; i++) {
    const departure = iterator.peek();
    if (departure == null) break;

    iterator.take();

    results.push(formatDeparture(departure, stopNameMapping, formatTimezone));
  }

  const snapshot = `\n${results.join("\n")}\n`;

  expect(snapshot).toMatchSnapshot();
}

function formatDeparture(
  // TODO: These are meant to be integration tests, so now that we're converting
  // departures into corequery services, we should use the values post
  // conversion. (For the buildDeparture, buildService, etc. functions we'll
  // just return the fields as-is, given that we don't have a class to make!)
  departure: DeparturesIteratorResult,
  stopNameMapping: StopNameMapping,
  formatTimezone: string,
): string {
  function getScheduledTripInfo(trip: GtfsScheduledTrip | GtfsUpdatedTrip) {
    if (trip instanceof GtfsScheduledTrip) {
      return trip;
    } else if (trip instanceof GtfsUpdatedTrip) {
      return trip.scheduledTrip;
    } else {
      assertNever(trip);
    }
  }

  function formatDelay(movement: GtfsTripServicingMovement) {
    if ("realtimeTimeRelevantToDeparturesAlgorithm" in movement) {
      const realtimeTime = movement.realtimeTimeRelevantToDeparturesAlgorithm;
      if (realtimeTime == null) return `No realtime data at this stop`;
      const scheduledTime = movement.scheduledTimeRelevantToDeparturesAlgorithm;
      const minsDelayed = realtimeTime.since(scheduledTime).total("minutes");

      if (minsDelayed === 0) return `On time`;

      return `${minsDelayed} mins late`;
    } else {
      return `No realtime data`;
    }
  }

  function getScheduledTime(movement: GtfsTripServicingMovement) {
    if ("scheduledTimeRelevantToDeparturesAlgorithm" in movement) {
      return movement.scheduledTimeRelevantToDeparturesAlgorithm;
    } else {
      return movement.timeRelevantToDeparturesAlgorithm.toInstant(
        departure.serviceDay,
        formatTimezone,
      );
    }
  }

  const scheduledTrip = getScheduledTripInfo(departure.trip);
  const delayStr = formatDelay(departure.movement);
  const scheduledTime = getScheduledTime(departure.movement).toLocaleString(
    "en-AU",
    {
      timeStyle: "short",
      dateStyle: "short",
      timeZone: formatTimezone,
    },
  );
  const terminus = stopNameMapping.requireName(
    scheduledTrip.termination.stopId,
  );
  const finalTerminus = stopNameMapping.requireName(
    scheduledTrip.finalTermination.stopId,
  );

  const terminusStr =
    finalTerminus === terminus
      ? terminus
      : `${finalTerminus} (via ${terminus})`;

  return `${scheduledTime.padEnd(18)}   ${terminusStr.padEnd(50, " ")}   ${delayStr}`;
}
