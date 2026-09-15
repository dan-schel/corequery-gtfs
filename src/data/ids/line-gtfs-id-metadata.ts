export type LineGtfsIdMetadata =
  GeneralLineGtfsIdMetadata | IgnoredLineGtfsIdMetadata;

type GeneralLineGtfsIdMetadata = {
  readonly type: "general";
  readonly id: string;
  readonly lineId: number;
};

type IgnoredLineGtfsIdMetadata = {
  readonly type: "ignored";
  readonly id: string;
  readonly lineId: number;
};
