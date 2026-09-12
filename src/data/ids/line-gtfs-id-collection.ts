import type { LineGtfsIdMetadata } from "./line-gtfs-id-metadata.js";
import type { LineGtfsIdCollectionConfig } from "../../config/ids.js";

export class LineGtfsIdCollection {
  constructor(
    readonly lineId: number,
    readonly general: readonly string[],
    readonly ignored: readonly string[],
  ) {}

  all(): LineGtfsIdMetadata[] {
    return [
      ...this.general.map((id) => ({
        type: "general" as const,
        id,
        lineId: this.lineId,
      })),

      ...this.ignored.map((id) => ({
        type: "ignored" as const,
        id,
        lineId: this.lineId,
      })),
    ];
  }

  allNonIgnored(): LineGtfsIdMetadata[] {
    return this.all().filter((metadata) => metadata.type !== "ignored");
  }

  includes(id: string, { excludeIgnored }: { excludeIgnored: boolean }) {
    const idsToCheck = excludeIgnored ? this.allNonIgnored() : this.all();
    return idsToCheck.some((metadata) => metadata.id === id);
  }

  static build(stopId: number, gtfsIdsForSubfeed: LineGtfsIdCollectionConfig) {
    return new LineGtfsIdCollection(
      stopId,
      gtfsIdsForSubfeed.general,
      gtfsIdsForSubfeed.ignored ?? [],
    );
  }

  static simple(lineId: number, gtfsId: string) {
    return new LineGtfsIdCollection(lineId, [gtfsId], []);
  }
}
