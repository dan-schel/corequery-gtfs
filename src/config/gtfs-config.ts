import type { LineGtfsIdsConfig, StopGtfsIdsConfig } from "./ids.js";
import type {
  BonusLinesMappingConfig,
  LineRoutesMappingConfig,
} from "./routes.js";
import type { TimezoneData } from "./timezone-data.js";

export type GtfsConfig = {
  readonly lineGtfsIds: LineGtfsIdsConfig;
  readonly stopGtfsIds: StopGtfsIdsConfig;
  readonly lineRoutesMapping: LineRoutesMappingConfig;
  readonly bonusLinesMapping?: BonusLinesMappingConfig;
  readonly timezoneData: TimezoneData;
};
