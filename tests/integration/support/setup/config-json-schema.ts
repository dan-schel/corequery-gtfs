import z from "zod";
import { intStringSchema } from "../zod.js";
import type { GtfsConfig } from "../../../../src/config/index.js";

const lineGtfsIdsSchema = z.record(
  intStringSchema,
  z.object({
    general: z.string().array(),
    ignored: z.string().array().optional(),
  }),
);

const stopGtfsIdsSchema = z.record(
  intStringSchema,
  z.object({
    general: z.string().array(),
    positional: z.record(intStringSchema, z.string().array()).optional(),
  }),
);

const colorSchema = z.enum([
  "red",
  "yellow",
  "green",
  "cyan",
  "blue",
  "pink",
  "purple",
  "gray",
]);

const lineRoutesMappingSchema = z.record(
  intStringSchema,
  z
    .object({
      color: colorSchema.nullable(),
      stops: z
        .object({
          stopId: z.number(),
          collapseInStoppingPatterns: z.boolean(),
        })
        .array(),
      serviceTags: z.number().array(),
    })
    .array(),
);

const bonusLinesMappingSchema = z.record(
  intStringSchema,
  z.object({
    mode: z.enum(["add", "replace"]),
    lines: z.number().array(),
  }),
);

const timezoneDataSchema = z.object({
  timezone: z.string(),
  minimumViableOffsetSeconds: z.number(),
  maximumViableOffsetSeconds: z.number(),
});

export const configJsonSchema: z.ZodType<GtfsConfig> = z.object({
  lineGtfsIds: lineGtfsIdsSchema,
  stopGtfsIds: stopGtfsIdsSchema,
  lineRoutesMapping: lineRoutesMappingSchema,
  bonusLinesMapping: bonusLinesMappingSchema.optional(),
  timezoneData: timezoneDataSchema,
});
