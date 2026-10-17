import "temporal-polyfill/global";
import path from "node:path";
import { setupIntegrationTest } from "../../tests/integration/support/setup/index.js";
import { createStopNameMapping } from "../../tests/integration/support/create-stop-name-mapping.js";
import { formatTable } from "../../tests/integration/support/format-table.js";
import type { DeparturesIterationDirection } from "../../src/corequery-types.js";

const iterationCount = 20;
const maxResults = 50;
const fixturesDirectory = path.join(import.meta.dirname, "fixtures");

const categories = [
  { subfeed: "suburban", category: "Busy", station: "Flinders Street" },
  { subfeed: "suburban", category: "Normal", station: "Clayton" },
  { subfeed: "regional", category: "Busy", station: "Southern Cross" },
  { subfeed: "regional", category: "Quiet", station: "Bairnsdale" },
] as const;

const dates = [
  { name: "Today", instant: "2026-10-07T20:39:00+11:00" },
  { name: "One year later", instant: "2027-10-07T20:39:00+11:00" },
  { name: "One year earlier", instant: "2025-10-07T20:39:00+11:00" },
];

const directions: readonly DeparturesIterationDirection[] = [
  "forwards",
  "backwards",
];

const testCases = categories.flatMap((category) =>
  dates.flatMap((date) =>
    directions.map((direction) => ({
      name: `${category.subfeed} (${category.category}) - ${date.name} (${direction})`,
      subfeed: category.subfeed,
      station: category.station,
      instant: Temporal.Instant.from(date.instant),
      direction,
    })),
  ),
);

async function main() {
  console.log("Running tests...\n");

  const results: string[][] = [["Test", "Total", "Per run"]];

  for (const subfeed of ["suburban", "regional"] as const) {
    const dirname = path.join(fixturesDirectory, subfeed);
    const { source } = await setupIntegrationTest(dirname);
    const stopNameMapping = await createStopNameMapping(dirname);

    for (const testCase of testCases.filter((c) => c.subfeed === subfeed)) {
      const stopId = stopNameMapping.requireId(testCase.station);
      const start = performance.now();

      for (let iteration = 0; iteration < iterationCount; iteration++) {
        const iterator = source.getDeparturesIterator(
          stopId,
          testCase.instant,
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
        `${(elapsedMs / iterationCount).toFixed(2)} ms`,
      ]);
    }
  }

  console.log(`Querying for departures\n${"-".repeat(80)}`);
  console.log(formatTable(results));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
