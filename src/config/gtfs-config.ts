import type { LineGtfsIdsConfig, StopGtfsIdsConfig } from "./ids.js";
import type {
  BonusLinesMappingConfig,
  LineRoutesMappingConfig,
} from "./routes.js";
import type { TimezoneConfig } from "./timezone-config.js";

export type GtfsInterpolationMode = "follow-spec" | "lerp";

export type GtfsConfig = {
  readonly lineGtfsIds: LineGtfsIdsConfig;
  readonly stopGtfsIds: StopGtfsIdsConfig;
  readonly lineRoutesMapping: LineRoutesMappingConfig;
  readonly bonusLinesMapping?: BonusLinesMappingConfig;
  readonly timezoneConfig: TimezoneConfig;
  readonly interpolationMode?: GtfsInterpolationMode;
};
