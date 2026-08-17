import type { RouteStopConfig } from "../../config/routes.js";

export type RouteStopFields = {
  readonly stopId: number;
  readonly collapseInStoppingPatterns: boolean;
};

export class RouteStop {
  readonly stopId: number;
  readonly collapseInStoppingPatterns: boolean;

  constructor(fields: RouteStopFields) {
    this.stopId = fields.stopId;
    this.collapseInStoppingPatterns = fields.collapseInStoppingPatterns;
  }

  static build(config: RouteStopConfig) {
    return new RouteStop({
      stopId: config.stopId,
      collapseInStoppingPatterns: config.collapseInStoppingPatterns,
    });
  }

  with(newValues: Partial<RouteStopFields>) {
    return new RouteStop({ ...this, ...newValues });
  }
}
