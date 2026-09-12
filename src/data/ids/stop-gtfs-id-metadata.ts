export type StopGtfsIdMetadata =
  | GeneralStopGtfsIdMetadata
  | PositionalStopGtfsIdMetadata;

type GeneralStopGtfsIdMetadata = {
  readonly type: "general";
  readonly id: string;
  readonly stopId: number;
};

type PositionalStopGtfsIdMetadata = {
  readonly type: "positional";
  readonly id: string;
  readonly stopId: number;
  readonly positionId: number;
};
