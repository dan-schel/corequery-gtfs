import type { TimezoneData } from "../departures/scheduled-departures-blocks-builder.js";
import type { LineGtfsIdsConfig, StopGtfsIdsConfig } from "./ids.js";
import type {
  BonusLinesMappingConfig,
  LineRoutesMappingConfig,
} from "./routes.js";

export type GtfsConfig = {
  readonly lineGtfsIds: LineGtfsIdsConfig;
  readonly stopGtfsIds: StopGtfsIdsConfig;
  readonly lineRoutesMapping: LineRoutesMappingConfig;
  readonly bonusLinesMapping?: BonusLinesMappingConfig;
  readonly timezoneData: TimezoneData;
};
