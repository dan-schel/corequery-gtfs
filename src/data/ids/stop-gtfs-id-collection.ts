import { parseIntThrow } from "@dan-schel/js-utils";
import type { StopGtfsIdCollectionConfig } from "../../config/ids.js";
import type { StopGtfsIdMetadata } from "./stop-gtfs-id-metadata.js";

export class StopGtfsIdCollection {
  constructor(
    readonly stopId: number,
    readonly parent: string,
    readonly general: readonly string[],
    readonly platforms: Map<number, readonly string[]>,
    readonly replacementBus: readonly string[],
  ) {}

  all(): StopGtfsIdMetadata[] {
    return [
      {
        type: "parent",
        id: this.parent,
        stopId: this.stopId,
      },

      ...this.general.map((id) => ({
        type: "general" as const,
        id,
        stopId: this.stopId,
      })),

      ...this.replacementBus.map((id) => ({
        type: "replacement-bus" as const,
        id,
        stopId: this.stopId,
      })),

      ...[...this.platforms.entries()].flatMap(([positionId, ids]) =>
        ids.map((id) => ({
          type: "platform" as const,
          id,
          stopId: this.stopId,
          positionId,
        })),
      ),
    ];
  }

  includes(id: string) {
    return this.all().some((metadata) => metadata.id === id);
  }

  static build(stopId: number, gtfsIdsForSubfeed: StopGtfsIdCollectionConfig) {
    const platformsConfig = gtfsIdsForSubfeed.platforms ?? {};
    const platforms = new Map<number, readonly string[]>();
    for (const [platformIdStr, gtfsIds] of Object.entries(platformsConfig)) {
      platforms.set(parseIntThrow(platformIdStr), gtfsIds);
    }

    return new StopGtfsIdCollection(
      stopId,
      gtfsIdsForSubfeed.parent,
      gtfsIdsForSubfeed.general ?? [],
      platforms,
      gtfsIdsForSubfeed.replacementBus ?? [],
    );
  }

  static withParentOnly(stopId: number, parentGtfsId: string) {
    return new StopGtfsIdCollection(stopId, parentGtfsId, [], new Map(), []);
  }
}
