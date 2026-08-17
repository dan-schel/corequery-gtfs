import z from "zod";
import {
  floatStringSchema,
  gtfsBooleanSchema,
  gtfsDateSchema,
  gtfsStopTimeSchema,
  intStringSchema,
} from "../zod.js";
import type {
  CalendarCsvRow,
  CalendarDatesCsvRow,
  RoutesCsvRow,
  StopsCsvRow,
  StopTimesCsvRow,
  TransfersCsvRow,
  TripsCsvRow,
} from "../../../../../../src/gtfs/corequery-gtfs/data/raw/schedule-csvs.js";

export const stopsCsvSchema: z.ZodType<StopsCsvRow> = z
  .object({
    stop_id: z.string(),
    stop_name: z.string(),
    stop_lat: floatStringSchema,
    stop_lon: floatStringSchema,
    stop_url: z.string(),
    parent_station: z.string(),
    platform_code: z.string().optional(),
  })
  .readonly();

export const routesCsvSchema: z.ZodType<RoutesCsvRow> = z
  .object({
    route_id: z.string(),
    route_long_name: z.string(),
  })
  .readonly();

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
