export type StopGtfsIdsConfig = Record<number, StopGtfsIdCollectionConfig>;
export type LineGtfsIdsConfig = Record<number, LineGtfsIdCollectionConfig>;

export type StopGtfsIdCollectionConfig = {
  readonly general: readonly string[];
  readonly positional?: Readonly<Record<number, readonly string[]>>;
};

export type LineGtfsIdCollectionConfig = {
  readonly general: readonly string[];
  readonly ignored?: readonly string[];
};
