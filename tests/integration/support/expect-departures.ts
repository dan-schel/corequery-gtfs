import { expect } from "vitest";
import type { StopNameMapping } from "./create-stop-name-mapping.js";
import type { DeparturesIterationDirection } from "../../../src/corequery-types.js";
import type {
  IntegrationTestDeparture,
  IntegrationTestService,
  IntegrationTestServiceSource,
} from "./setup/integration-test-corequery-types.js";
import { assertNever, itsOk } from "@dan-schel/js-utils";

export async function expectDeparturesToMatchSnapshot({
  source,
  stopNameMapping,
  stopName,
  instant,
  direction,
  maxResults,
  formatTimezone,
  maxConnectionsToFollow,
  iterationCount = 1,
}: {
  source: IntegrationTestServiceSource;
  stopNameMapping: StopNameMapping;
  stopName: string;
  instant: string;
  direction: DeparturesIterationDirection;
  maxResults: number;
  formatTimezone: string;
  maxConnectionsToFollow: number;
  iterationCount?: number;
}) {
  const stopId = stopNameMapping.requireId(stopName);

  let departures: IntegrationTestDeparture[] = [];
  for (let iteration = 0; iteration < iterationCount; iteration++) {
    const iterator = source.getDeparturesIterator(
      stopId,
      Temporal.Instant.from(instant),
      direction,
    );
    departures = [];

    for (let i = 0; i < maxResults; i++) {
      const departure = await iterator.peek();
      if (departure == null) break;

      await iterator.take();
      departures.push(departure);
    }
  }

  // Format only the final traversal so repeated runs measure iteration work.
  const results: string[][] = [];

  for (const departure of departures) {
    results.push(
      await formatDeparture(
        departure,
        source,
        stopNameMapping,
        formatTimezone,
        maxConnectionsToFollow,
      ),
    );
  }

  const snapshot = `\n${formatTable(results)}\n`;

  expect(snapshot).toMatchSnapshot();
}

async function formatDeparture(
  departure: IntegrationTestDeparture,
  source: IntegrationTestServiceSource,
  stopNameMapping: StopNameMapping,
  formatTimezone: string,
  maxConnectionsToFollow: number,
) {
  const { timeType, time, formerTime } = getTimePair(departure);

  const timeStr = time.toLocaleString("en-AU", {
    timeStyle: "short",
    dateStyle: "short",
    timeZone: formatTimezone,
  });

  const destination = await getDestination(
    departure,
    source,
    stopNameMapping,
    maxConnectionsToFollow,
  );

  const delayMins =
    formerTime == null
      ? 0
      : Math.floor(time.since(formerTime).total("minutes"));

  const suffix = timeType === "interpolated-live-time" ? " (*)" : "";

  const realtimeStr =
    departure.service.liveDataType === "scheduled"
      ? "No realtime data"
      : delayMins === 0
        ? `On time${suffix}`
        : delayMins > 0
          ? `${delayMins} mins delayed${suffix}`
          : `${-delayMins} mins early${suffix}`;

  const id = `(ID: "${departure.service.intrasourceId}")`;

  return [timeStr, destination, realtimeStr, id];
}

function getTimePair(departure: IntegrationTestDeparture) {
  const movement = itsOk(departure.service.movements[departure.movementIndex]);
  if (movement.type === "passing") throw new Error();

  if ("departureTime" in movement) {
    return {
      timeType: movement.departureTimeType,
      time: movement.departureTime,
      formerTime: movement.formerDepartureTime,
    };
  } else if ("arrivalTime" in movement) {
    return {
      timeType: movement.arrivalTimeType,
      time: movement.arrivalTime,
      formerTime: movement.formerArrivalTime,
    };
  } else {
    assertNever(movement);
  }
}

async function getDestination(
  departure: IntegrationTestDeparture,
  source: IntegrationTestServiceSource,
  stopNameMapping: StopNameMapping,
  maxConnectionsToFollow: number,
) {
  function getTerminusStopName(service: IntegrationTestService) {
    const finalMovement = itsOk(
      service.movements[service.movements.length - 1],
    );
    return stopNameMapping.requireName(finalMovement.stopId);
  }

  async function getNextService(service: IntegrationTestService) {
    const connection = service.connections.find(
      (c) =>
        c.type === "entire-vehicle-forms-service" &&
        c.direction !== "from-other",
    );
    if (connection == null) return null;

    return await source.getService(connection.otherServiceIntrasourceId);
  }

  let output = getTerminusStopName(departure.service);
  let service = await getNextService(departure.service);
  let connectionsFollowed = 1;

  while (service != null && connectionsFollowed <= maxConnectionsToFollow) {
    output += ` -> ${getTerminusStopName(service)}`;

    service = await getNextService(service);
    connectionsFollowed++;
  }

  if (service != null) {
    output += " -> ...";
  }

  const isAdded = departure.service.liveDataType === "added";
  return isAdded ? `${output} (added)` : output;
}

function formatTable(rows: string[][]) {
  if (rows.length === 0) return "<empty>";

  const columnWidths = itsOk(rows[0]).map((_, colIndex) =>
    Math.max(...rows.map((row) => itsOk(row[colIndex]).length)),
  );

  const formattedRows = rows.map((row) =>
    row.map((text, i) => text.padEnd(itsOk(columnWidths[i]), " ")).join("   "),
  );

  return formattedRows.join("\n");
}
