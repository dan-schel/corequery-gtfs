import z from "zod";
import { createSchemaHelpers, buildZodTransform } from "@dan-schel/js-utils";
import { GtfsStopTime } from "../../../../../src/gtfs/corequery-gtfs/data/gtfs-stop-time.js";

export const { intStringSchema, floatStringSchema } = createSchemaHelpers(z);

export const gtfsBooleanSchema = intStringSchema.transform(
  (value) => value !== 0,
);

export const gtfsDateSchema = z
  .string()
  .refine((val) => /^\d{8}$/.test(val))
  .transform(buildZodTransform((val) => Temporal.PlainDate.from(val)));

export const gtfsStopTimeSchema = z
  .string()
  .transform(buildZodTransform((val) => GtfsStopTime.parse(val)));
