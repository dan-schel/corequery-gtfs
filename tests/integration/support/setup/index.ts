import path from "path";
import fsp from "fs/promises";
import fs from "fs";
import csvParser from "csv-parser";
import { configJsonSchema } from "./config-json-schema.js";
import { realtimeJsonSchema } from "./realtime-json-schema.js";
import type z from "zod";
import {
  calendarCsvSchema,
  calendarDatesCsvSchema,
  stopTimesCsvSchema,
  transfersCsvSchema,
  tripsCsvSchema,
} from "./schedule-csv-schemas.js";
import type { GtfsFeedCsv } from "../../../../src/data/raw/schedule-csvs.js";
import { GtfsSystem } from "../../../../src/gtfs-system.js";
import { GtfsServiceSource } from "../../../../src/gtfs-service-source.js";
import type { IntegrationTestServiceSource } from "./integration-test-corequery-types.js";

export async function setupIntegrationTest(dirname: string) {
  const configJsonPath = path.join(dirname, "config.json");
  const configJsonStr = await fsp.readFile(configJsonPath, "utf-8");
  const config = configJsonSchema.parse(JSON.parse(configJsonStr));

  const realtimeJsonPath = path.join(dirname, "gtfs", "realtime.json");
  const realtimeJsonStr = await fsp.readFile(realtimeJsonPath, "utf-8");
  const realtimeData = realtimeJsonSchema.parse(JSON.parse(realtimeJsonStr));

  async function read<T extends z.ZodType>(csvFileName: string, schema: T) {
    return await readCsv(path.join(dirname, "gtfs", csvFileName), schema);
  }
  const scheduleData: GtfsFeedCsv = {
    trips: await read("trips.txt", tripsCsvSchema),
    stopTimes: await read("stop_times.txt", stopTimesCsvSchema),
    calendar: await read("calendar.txt", calendarCsvSchema),
    calendarDates: await read("calendar_dates.txt", calendarDatesCsvSchema),
    transfers: await read("transfers.txt", transfersCsvSchema),
  };

  const system = GtfsSystem.build(config);
  system.onNewScheduleData(scheduleData, realtimeData);

  const source: IntegrationTestServiceSource = new GtfsServiceSource({
    sourceId: "integration-test",
    gtfsSystem: system,
    departureIterationLimitHours: null,

    buildDeparture: (fields) => fields,
    buildService: (fields) => fields,
    buildTags: (tags) => tags,
    buildServiceOriginatingMovement: (fields) => ({
      type: "originating",
      ...fields,
    }),
    buildServiceRegularMovement: (fields) => ({
      type: "regular",
      ...fields,
    }),
    buildServiceTerminatingMovement: (fields) => ({
      type: "terminating",
      ...fields,
    }),
    buildServicePassingMovement: (fields) => ({
      type: "passing",
      ...fields,
    }),
    buildServiceConnection: (fields) => fields,
  });

  return { source, system };
}

async function readCsv<T extends z.ZodType>(
  path: string,
  schema: T,
): Promise<readonly z.infer<T>[]> {
  return await new Promise((resolve) => {
    const results: z.infer<T>[] = [];
    fs.createReadStream(path)
      .pipe(
        csvParser({
          mapHeaders: ({ header }) => header.trim(),
        }),
      )
      .on("data", (row) => {
        results.push(schema.parse(row));
      })
      .on("end", () => {
        resolve(results);
      });
  });
}
