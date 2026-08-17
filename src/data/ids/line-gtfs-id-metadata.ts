export type LineGtfsIdMetadata =
  | PrimaryLineGtfsIdMetadata
  | OtherLineGtfsIdMetadata
  | ReplacementBusLineGtfsIdMetadata;

type PrimaryLineGtfsIdMetadata = {
  readonly type: "primary";
  readonly id: string;
  readonly lineId: number;
};

type OtherLineGtfsIdMetadata = {
  readonly type: "other";
  readonly id: string;
  readonly lineId: number;
};

type ReplacementBusLineGtfsIdMetadata = {
  readonly type: "replacement-bus";
  readonly id: string;
  readonly lineId: number;
};
