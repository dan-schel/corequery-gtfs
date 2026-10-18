import type { RouteStopConfig } from "../../config/routes.js";

export type RouteStopFields = {
  readonly stopId: number;
  readonly hideUnlessServed: boolean;
};

export class RouteStop {
  readonly stopId: number;
  readonly hideUnlessServed: boolean;

  constructor(fields: RouteStopFields) {
    this.stopId = fields.stopId;
    this.hideUnlessServed = fields.hideUnlessServed;
  }

  static build(config: RouteStopConfig) {
    return new RouteStop({
      stopId: config.stopId,
      hideUnlessServed: config.hideUnlessServed,
    });
  }

  with(newValues: Partial<RouteStopFields>) {
    return new RouteStop({ ...this, ...newValues });
  }
}
