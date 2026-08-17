import { z } from "zod";
import {
  floatStringSchema,
  gtfsDateSchema,
  gtfsStopTimeSchema,
} from "../zod.js";
import type { RealtimeDataJson } from "../../../../../../src/gtfs/corequery-gtfs/data/raw/realtime-data-json.js";

const tripDescriptorSchema = z
  .object({
    tripId: z.string().optional(),
    startTime: gtfsStopTimeSchema.optional(),
    startDate: gtfsDateSchema.optional(),
    scheduleRelationship: z.string().optional(),
    routeId: z.string().optional(),
  })
  .readonly();

const updatedTimeJson = z
  .object({
    delay: z.number().optional(),
    time: floatStringSchema.optional(),
  })
  .readonly();

const stopTimeUpdateSchema = z
  .object({
    stopSequence: z.number().optional(),
    arrival: updatedTimeJson.optional(),
    departure: updatedTimeJson.optional(),
    stopId: z.string().optional(),
    scheduleRelationship: z.string().default("SCHEDULED"),
  })
  .readonly();

const tripUpdateSchema = z
  .object({
    trip: tripDescriptorSchema,
    stopTimeUpdate: stopTimeUpdateSchema.array().optional(),
  })
  .readonly();

export const realtimeJsonSchema: z.ZodType<RealtimeDataJson> = z
  .object({
    tripUpdates: tripUpdateSchema.array().default([]),
  })
  .readonly();
