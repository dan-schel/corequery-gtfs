import type { Color } from "../corequery-types.js";

export type LineRoutesMappingConfig = Record<number, readonly RouteConfig[]>;

export type RouteConfig = {
  readonly color: Color | null;
  readonly stops: readonly RouteStopConfig[];
  readonly serviceTags: readonly number[];
};

export type RouteStopConfig = {
  readonly stopId: number;
  readonly collapseInStoppingPatterns: boolean;
};

export type BonusLinesMappingConfig = Record<number, BonusLinesConfig>;

export type BonusLinesConfig = {
  readonly mode: "add" | "replace";
  readonly lines: readonly number[];
};
