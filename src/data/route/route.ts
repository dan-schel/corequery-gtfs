import type { Color } from "corequery";
import { RouteStop } from "./route-stop.js";
import type { RouteConfig } from "../../config/routes.js";

type RouteFields = {
  readonly color: Color | null;
  readonly stops: readonly RouteStop[];
  readonly serviceTags: readonly number[];
};

export class Route {
  readonly color: Color | null;
  readonly stops: readonly RouteStop[];
  readonly serviceTags: readonly number[];

  constructor(fields: RouteFields) {
    this.color = fields.color;
    this.stops = fields.stops.map((stop) => new RouteStop(stop));
    this.serviceTags = fields.serviceTags;
  }

  static build(config: RouteConfig) {
    return new Route({
      color: config.color,
      stops: config.stops.map((stop) => RouteStop.build(stop)),
      serviceTags: config.serviceTags,
    });
  }

  with(newValues: Partial<RouteFields>) {
    return new Route({ ...this, ...newValues });
  }

  matchesStoppingOrder(stopIds: readonly number[]): boolean {
    const routeStops = this.stops.map((stop) => stop.stopId);
    return isSubsequence(stopIds, routeStops);
  }

  isShorterThan(other: Route): boolean {
    return this.stops.length < other.stops.length;
  }
}

function isSubsequence(
  subseq: readonly number[],
  seq: readonly number[],
): boolean {
  if (subseq.length === 0) return true;

  let subseqIndex = 0;

  for (const item of seq) {
    if (item === subseq[subseqIndex]) {
      subseqIndex++;
      if (subseqIndex === subseq.length) {
        return true;
      }
    }
  }

  return false;
}
