export type StopGtfsIdMetadata =
  | ParentStopGtfsIdMetadata
  | GeneralStopGtfsIdMetadata
  | PlatformStopGtfsIdMetadata
  | ReplacementBusStopGtfsIdMetadata;

type ParentStopGtfsIdMetadata = {
  readonly type: "parent";
  readonly id: string;
  readonly stopId: number;
};

type GeneralStopGtfsIdMetadata = {
  readonly type: "general";
  readonly id: string;
  readonly stopId: number;
};

type PlatformStopGtfsIdMetadata = {
  readonly type: "platform";
  readonly id: string;
  readonly stopId: number;
  readonly positionId: number;
};

type ReplacementBusStopGtfsIdMetadata = {
  readonly type: "replacement-bus";
  readonly id: string;
  readonly stopId: number;
};
