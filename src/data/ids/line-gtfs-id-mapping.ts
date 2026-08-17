import { parseIntThrow } from "@dan-schel/js-utils";
import type { LineGtfsIdsConfig } from "../../config/ids.js";
import type { LineGtfsIdMetadata } from "./line-gtfs-id-metadata.js";
import { LineGtfsIdCollection } from "./line-gtfs-id-collection.js";

type FromLineIdMapping = Map<number, LineGtfsIdCollection>;
type FromGtfsIdMapping = Map<string, LineGtfsIdMetadata>;

export class LineGtfsIdMapping {
  private _fromLineIdMapping: FromLineIdMapping;
  private _fromGtfsIdMapping: FromGtfsIdMapping;

  constructor(fromLineIdMapping: FromLineIdMapping) {
    this._fromLineIdMapping = fromLineIdMapping;
    this._fromGtfsIdMapping =
      LineGtfsIdMapping._reverseMapping(fromLineIdMapping);
  }

  tryResolve(gtfsId: string): LineGtfsIdMetadata | null {
    return this._fromGtfsIdMapping.get(gtfsId) ?? null;
  }

  resolveOrThrow(gtfsId: string): LineGtfsIdMetadata {
    const result = this.tryResolve(gtfsId);
    if (result == null) throw new Error(`GTFS ID "${gtfsId}" not mapped.`);
    return result;
  }

  getForLine(lineId: number): LineGtfsIdCollection | null {
    return this._fromLineIdMapping.get(lineId) ?? null;
  }

  requireForLine(lineId: number): LineGtfsIdCollection {
    const result = this.getForLine(lineId);
    if (result == null) throw new Error(`No GTFS IDs for line ${lineId}.`);
    return result;
  }

  allIds(): LineGtfsIdMetadata[] {
    return [...this._fromGtfsIdMapping.values()];
  }

  static build(config: LineGtfsIdsConfig): LineGtfsIdMapping {
    const result = new Map<number, LineGtfsIdCollection>();

    for (const [lineIdStr, gtfsIds] of Object.entries(config)) {
      const lineId = parseIntThrow(lineIdStr);
      result.set(lineId, LineGtfsIdCollection.build(lineId, gtfsIds));
    }

    return new LineGtfsIdMapping(result);
  }

  private static _reverseMapping(
    fromLineIdMapping: FromLineIdMapping,
  ): FromGtfsIdMapping {
    const result = new Map<string, LineGtfsIdMetadata>();

    for (const gtfsIdCollection of fromLineIdMapping.values()) {
      for (const gtfsId of gtfsIdCollection.all()) {
        result.set(gtfsId.id, gtfsId);
      }
    }

    return result;
  }
}
