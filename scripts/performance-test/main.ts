import "temporal-polyfill/global";
import path from "node:path";
import { setupIntegrationTest } from "../../tests/integration/support/setup/index.js";
import { createStopNameMapping } from "../../tests/integration/support/create-stop-name-mapping.js";
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

console.log(
  `Departure queries: ${iterationCount} runs per case, up to ${maxResults} departures per run.\n` +
    "Timings exclude fixture loading, data parsing, and result formatting.\n",
);

for (const subfeed of ["suburban", "regional"] as const) {
  const dirname = path.join(fixturesDirectory, subfeed);
  const { source } = await setupIntegrationTest(dirname);
  const stopNameMapping = await createStopNameMapping(dirname);

  for (const category of categories.filter((c) => c.subfeed === subfeed)) {
    const stopId = stopNameMapping.requireId(category.station);

    for (const date of dates) {
      const instant = Temporal.Instant.from(date.instant);

      for (const direction of directions) {
        const start = performance.now();

        for (let iteration = 0; iteration < iterationCount; iteration++) {
          const iterator = source.getDeparturesIterator(
            stopId,
            instant,
            direction,
          );

          for (let i = 0; i < maxResults; i++) {
            if ((await iterator.peek()) == null) break;
            await iterator.take();
          }
        }

        const elapsedMs = performance.now() - start;
        const name = `${subfeed} (${category.category}) - ${date.name} (${direction})`;
        console.log(`${name}: ${elapsedMs.toFixed(2)} ms`);
      }
    }
  }
}
