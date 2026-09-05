import z from "zod";
import {
  gtfsBooleanSchema,
  gtfsDateSchema,
  gtfsStopTimeSchema,
  intStringSchema,
} from "../zod.js";
import type {
  CalendarCsvRow,
  CalendarDatesCsvRow,
  StopTimesCsvRow,
  TransfersCsvRow,
  TripsCsvRow,
} from "../../../../src/data/raw/schedule-csvs.js";

export const tripsCsvSchema: z.ZodType<TripsCsvRow> = z
  .object({
    route_id: z.string(),
    service_id: z.string(),
    trip_id: z.string(),
  })
  .readonly();

export const stopTimesCsvSchema: z.ZodType<StopTimesCsvRow> = z
  .object({
    trip_id: z.string(),
    arrival_time: gtfsStopTimeSchema,
    departure_time: gtfsStopTimeSchema,
    stop_id: z.string(),
    stop_sequence: intStringSchema,
    pickup_type: intStringSchema,
    drop_off_type: intStringSchema,
  })
  .readonly();

export const calendarCsvSchema: z.ZodType<CalendarCsvRow> = z
  .object({
    service_id: z.string(),
    monday: gtfsBooleanSchema,
    tuesday: gtfsBooleanSchema,
    wednesday: gtfsBooleanSchema,
    thursday: gtfsBooleanSchema,
    friday: gtfsBooleanSchema,
    saturday: gtfsBooleanSchema,
    sunday: gtfsBooleanSchema,
    start_date: gtfsDateSchema,
    end_date: gtfsDateSchema,
  })
  .readonly();

export const calendarDatesCsvSchema: z.ZodType<CalendarDatesCsvRow> = z
  .object({
    service_id: z.string(),
    date: gtfsDateSchema,
    exception_type: intStringSchema,
  })
  .readonly();

export const transfersCsvSchema: z.ZodType<TransfersCsvRow> = z
  .object({
    from_stop_id: z.string(),
    to_stop_id: z.string(),
    from_trip_id: z.string(),
    to_trip_id: z.string(),
    transfer_type: intStringSchema,
  })
  .readonly();
