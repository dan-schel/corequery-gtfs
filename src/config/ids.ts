export type StopGtfsIdsConfig = Record<number, StopGtfsIdCollectionConfig>;
export type LineGtfsIdsConfig = Record<number, LineGtfsIdCollectionConfig>;

// TODO: Using terms like platforms, and replacment bus feels like a domain leak
// for corequery-gtfs. The concept of "certain GTFS ID means this position ID"
// is general enough, but calling it "platforms" is not. Same goes with the
// concept of "IDs we'll ignore" being called "replacement bus".
export type StopGtfsIdCollectionConfig = {
  readonly parent: string;
  readonly general?: readonly string[];
  readonly platforms?: Readonly<Record<number, readonly string[]>>;
  readonly replacementBus?: readonly string[];
};

export type LineGtfsIdCollectionConfig = {
  readonly primary: string;
  readonly other?: readonly string[];
  readonly replacementBus?: readonly string[];
};
