import { parseIntThrow } from "@dan-schel/js-utils";
import type { StopGtfsIdCollectionConfig } from "../../config/ids.js";
import type { StopGtfsIdMetadata } from "./stop-gtfs-id-metadata.js";

export class StopGtfsIdCollection {
  constructor(
    readonly stopId: number,
    readonly general: readonly string[],
    readonly positional: Map<number, readonly string[]>,
  ) {}

  all(): StopGtfsIdMetadata[] {
    return [
      ...this.general.map((id) => ({
        type: "general" as const,
        id,
        stopId: this.stopId,
      })),

      ...[...this.positional.entries()].flatMap(([positionId, ids]) =>
        ids.map((id) => ({
          type: "positional" as const,
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
    const positionalConfig = gtfsIdsForSubfeed.positional ?? {};
    const positional = new Map<number, readonly string[]>();
    for (const [positionIdStr, gtfsIds] of Object.entries(positionalConfig)) {
      positional.set(parseIntThrow(positionIdStr), gtfsIds);
    }

    return new StopGtfsIdCollection(
      stopId,
      gtfsIdsForSubfeed.general,
      positional,
    );
  }

  static simple(stopId: number, gtfsId: string) {
    return new StopGtfsIdCollection(stopId, [gtfsId], new Map());
  }
}
