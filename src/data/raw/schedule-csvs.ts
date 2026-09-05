import type { GtfsStopTime } from "../gtfs-stop-time.js";

export type TripsCsvRow = {
  readonly route_id: string;
  readonly service_id: string;
  readonly trip_id: string;
};
export type TripsCsv = readonly TripsCsvRow[];

export type StopTimesCsvRow = {
  readonly trip_id: string;
  readonly arrival_time: GtfsStopTime;
  readonly departure_time: GtfsStopTime;
  readonly stop_id: string;
  readonly stop_sequence: number;
  readonly pickup_type: number;
  readonly drop_off_type: number;
};
export type StopTimesCsv = readonly StopTimesCsvRow[];

export type CalendarCsvRow = {
  readonly service_id: string;
  readonly monday: boolean;
  readonly tuesday: boolean;
  readonly wednesday: boolean;
  readonly thursday: boolean;
  readonly friday: boolean;
  readonly saturday: boolean;
  readonly sunday: boolean;
  readonly start_date: Temporal.PlainDate;
  readonly end_date: Temporal.PlainDate;
};
export type CalendarCsv = readonly CalendarCsvRow[];

export type CalendarDatesCsvRow = {
  readonly service_id: string;
  readonly date: Temporal.PlainDate;
  readonly exception_type: number;
};
export type CalendarDatesCsv = readonly CalendarDatesCsvRow[];

export type TransfersCsvRow = {
  readonly from_stop_id: string;
  readonly to_stop_id: string;
  readonly from_trip_id: string;
  readonly to_trip_id: string;
  readonly transfer_type: number;
};
export type TransfersCsv = readonly TransfersCsvRow[];

export type GtfsFeedCsv = {
  readonly trips: TripsCsv;
  readonly stopTimes: StopTimesCsv;
  readonly calendar: CalendarCsv;
  readonly calendarDates: CalendarDatesCsv;
  readonly transfers: TransfersCsv;
};
