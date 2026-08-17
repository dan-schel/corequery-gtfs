import type { LineRoutesMappingConfig } from "../../config/routes.js";
import { Route } from "./route.js";

export class LineRoutesMapping {
  constructor(private readonly _map: Map<number, readonly Route[]>) {}

  static build(config: LineRoutesMappingConfig) {
    return new LineRoutesMapping(
      new Map(
        Object.entries(config).map(([lineId, routes]) => [
          Number(lineId),
          routes.map((route) => Route.build(route)),
        ]),
      ),
    );
  }

  // `require` doesn't make sense here. If a line has no routes defined, that
  // would be strange, but it's the type of thing we should catch in CI/linting.
  // (And in fact, we DO have a unit test to catch it).
  forLine(lineId: number): readonly Route[] {
    return this._map.get(lineId) ?? [];
  }
}
