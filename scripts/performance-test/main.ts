import "temporal-polyfill/global";
import path from "node:path";
import { setupIntegrationTest } from "../../tests/integration/support/setup/index.js";
import { createStopNameMapping } from "../../tests/integration/support/create-stop-name-mapping.js";
import { formatTable } from "../../tests/integration/support/format-table.js";
import { departureTestCases } from "./departure-test-cases.js";

const parsingIterationCount = 5;
const maxResults = 50;
const fixturesDirectory = path.join(import.meta.dirname, "fixtures");

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
  const results: string[][] = [["Subfeed", "Total", "Per run"]];

  for (const subfeed of ["suburban", "regional"] as const) {
    const dirname = path.join(fixturesDirectory, subfeed);
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
      `${(parsingElapsedMs / parsingIterationCount).toFixed(2)} ms`,
    ]);
  }

  return formatTable(results);
}

async function testDeparturesPerformance(): Promise<string> {
  const results: string[][] = [["Test", "Total", "Per run"]];

  for (const subfeed of ["suburban", "regional"] as const) {
    const dirname = path.join(fixturesDirectory, subfeed);
    const { source } = await setupIntegrationTest(dirname);
    const stopNameMapping = await createStopNameMapping(dirname);
    const testsForSubfeed = departureTestCases.filter(
      (c) => c.subfeed === subfeed,
    );

    for (const testCase of testsForSubfeed) {
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
      results.push([
        testCase.name,
        `${elapsedMs.toFixed(2)} ms`,
        `${(elapsedMs / runs.length).toFixed(2)} ms`,
      ]);
    }
  }

  return formatTable(results);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
