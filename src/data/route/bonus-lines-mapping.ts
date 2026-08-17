import type {
  BonusLinesMappingConfig,
  BonusLinesConfig,
} from "../../config/routes.js";

export class BonusLinesMapping {
  constructor(private readonly _map: Map<number, BonusLines>) {}

  static build(config: BonusLinesMappingConfig) {
    return new BonusLinesMapping(
      new Map(
        Object.entries(config).map(([lineId, bonusLines]) => [
          Number(lineId),
          BonusLines.build(bonusLines),
        ]),
      ),
    );
  }

  // `require` doesn't make sense here. Not all lines are expected to have bonus
  // lines, e.g. the Gippsland line.
  forLine(lineId: number): BonusLines | null {
    return this._map.get(lineId) ?? null;
  }
}

export type BonusLinesFields = {
  readonly mode: "add" | "replace";
  readonly lines: readonly number[];
};

export class BonusLines {
  readonly mode: "add" | "replace";
  readonly lines: readonly number[];

  constructor(fields: BonusLinesFields) {
    this.mode = fields.mode;
    this.lines = fields.lines;
  }

  static build(config: BonusLinesConfig) {
    return new BonusLines(config);
  }
}
