import type { LineGtfsIdMetadata } from "./line-gtfs-id-metadata.js";
import type { LineGtfsIdCollectionConfig } from "../../config/ids.js";

export class LineGtfsIdCollection {
  constructor(
    readonly lineId: number,
    readonly primary: string,
    readonly other: readonly string[],
    readonly replacementBus: readonly string[],
  ) {}

  all(): LineGtfsIdMetadata[] {
    return [
      {
        type: "primary",
        id: this.primary,
        lineId: this.lineId,
      },

      ...this.other.map((id) => ({
        type: "other" as const,
        id,
        lineId: this.lineId,
      })),

      ...this.replacementBus.map((id) => ({
        type: "replacement-bus" as const,
        id,
        lineId: this.lineId,
      })),
    ];
  }

  allExcludingReplacementBus(): LineGtfsIdMetadata[] {
    return this.all().filter((metadata) => metadata.type !== "replacement-bus");
  }

  includes(
    id: string,
    { ignoreReplacementBusIds }: { ignoreReplacementBusIds: boolean },
  ) {
    const idsToCheck = ignoreReplacementBusIds
      ? this.allExcludingReplacementBus()
      : this.all();
    return idsToCheck.some((metadata) => metadata.id === id);
  }

  static build(stopId: number, gtfsIdsForSubfeed: LineGtfsIdCollectionConfig) {
    return new LineGtfsIdCollection(
      stopId,
      gtfsIdsForSubfeed.primary,
      gtfsIdsForSubfeed.other ?? [],
      gtfsIdsForSubfeed.replacementBus ?? [],
    );
  }

  static withParentOnly(lineId: number, parentGtfsId: string) {
    return new LineGtfsIdCollection(lineId, parentGtfsId, [], []);
  }
}
