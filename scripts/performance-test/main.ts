import "temporal-polyfill/global";
import path from "node:path";
import { setupIntegrationTest } from "../../tests/integration/support/setup/index.js";
import { createStopNameMapping } from "../../tests/integration/support/create-stop-name-mapping.js";
import { formatTable } from "../../tests/integration/support/format-table.js";
import { departureTestCases } from "./departure-test-cases.js";

const parsingIterationCount = 5;
const maxResults = 50;
const dataDirectory = path.join(import.meta.dirname, "data");

async function main() {
  console.log("Running tests...\n");

  const parsingTable = await testParsingPerformance();
  const departuresTable = await testDeparturesPerformance();

  console.log(`Parsing GTFS data\n${"-".repeat(80)}`);
  console.log(parsingTable);
  console.log(`\nQuerying for departures\n${"-".repeat(80)}`);
  console.log(departuresTable);
}

async function testParsingPerformance(): Promise<string> {
  const results: string[][] = [];

  for (const subfeed of ["suburban", "regional"] as const) {
    const dirname = path.join(dataDirectory, subfeed);
    const { system, scheduleData, realtimeData } =
      await setupIntegrationTest(dirname);

    const parsingStart = performance.now();
    for (let iteration = 0; iteration < parsingIterationCount; iteration++) {
      system.onNewScheduleData(scheduleData, realtimeData);
    }
    const parsingElapsedMs = performance.now() - parsingStart;

    results.push([
      subfeed,
      `${parsingElapsedMs.toFixed(2)} ms`,
      `${(parsingElapsedMs / parsingIterationCount).toFixed(2)} ms per run`,
    ]);
  }

  return formatTable(results);
}

async function testDeparturesPerformance(): Promise<string> {
  async function prepareSubfeed(subfeed: string) {
    const dirname = path.join(dataDirectory, subfeed);
    const { source } = await setupIntegrationTest(dirname);
    const stopNameMapping = await createStopNameMapping(dirname);
    return { source, stopNameMapping };
  }

  const subfeeds = {
    suburban: await prepareSubfeed("suburban"),
    regional: await prepareSubfeed("regional"),
  };

  const tables = new Map<string, string[][]>();

  for (const testCase of departureTestCases) {
    const { source, stopNameMapping } = subfeeds[testCase.subfeed];

    const runs = testCase.times.flatMap((time) => {
      const instant = Temporal.Instant.from(time);
      return testCase.stations.map((station) => ({
        stopId: stopNameMapping.requireId(station),
        instant,
      }));
    });

    const start = performance.now();

    for (const run of runs) {
      const iterator = source.getDeparturesIterator(
        run.stopId,
        run.instant,
        testCase.direction,
      );

      for (let i = 0; i < maxResults; i++) {
        if ((await iterator.peek()) == null) break;
        await iterator.take();
      }
    }

    const elapsedMs = performance.now() - start;
    const rows = tables.get(testCase.group) ?? [];
    rows.push([
      `  ${testCase.name}`,
      `${elapsedMs.toFixed(2)} ms`,
      `${(elapsedMs / runs.length).toFixed(2)} ms per run`,
    ]);
    tables.set(testCase.group, rows);
  }

  return [...tables]
    .map(([group, rows]) => `${group}\n${formatTable(rows)}`)
    .join("\n\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
