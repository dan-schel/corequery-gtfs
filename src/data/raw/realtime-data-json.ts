import type { GtfsStopTime } from "../gtfs-stop-time.js";

export type TripDescriptorJson = {
  readonly tripId?: string;
  readonly startTime?: GtfsStopTime;
  readonly startDate?: Temporal.PlainDate;
  readonly scheduleRelationship?: string;
  readonly routeId?: string;
};

export type UpdatedTimeJson = {
  readonly delay?: number;
  readonly time?: number;
};

export type StopTimeUpdateJson = {
  readonly stopSequence?: number;
  readonly arrival?: UpdatedTimeJson;
  readonly departure?: UpdatedTimeJson;
  readonly stopId?: string;
  readonly scheduleRelationship: string;
};

export type TripUpdateJson = {
  readonly trip: TripDescriptorJson;
  readonly stopTimeUpdate?: readonly StopTimeUpdateJson[];
};

export type RealtimeDataJson = {
  readonly tripUpdates: readonly TripUpdateJson[];
};
