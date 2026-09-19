import { describe, expect, it } from "vitest";
import { GtfsUpdatedTripPassingMovement } from "../../../src/data/trip/updated/gtfs-updated-trip-passing-movement.js";
import { GtfsUpdatedTripOriginatingMovement } from "../../../src/data/trip/updated/gtfs-updated-trip-originating-movement.js";
import { GtfsUpdatedTripTerminatingMovement } from "../../../src/data/trip/updated/gtfs-updated-trip-terminating-movement.js";
import { GtfsUpdatedTripRegularMovement } from "../../../src/data/trip/updated/gtfs-updated-trip-regular-movement.js";
import type { GtfsUpdatedTripMovement } from "../../../src/data/trip/updated/types.js";
import { GtfsTripMovementsInterpolator } from "../../../src/parser/realtime/gtfs-trip-movements-interpolator.js";

const nullTime = "--:--" as const;
type NullTime = typeof nullTime;

describe("GtfsTripMovementsInterpolator", () => {
  it("interpolates missing delays between known realtime values", () => {
    expectInterpolationToMatchSnapshot([
      //   Scheduled:        Realtime:
      orig("--:--", "08:00", "--:--", "08:05"),
      rglr("08:10", "08:15", "08:12", "08:17"),
      term("08:20", "--:--", "08:25", "--:--"),
    ]);
  });
});

function expectInterpolationToMatchSnapshot(
  movements: GtfsUpdatedTripMovement[],
) {
  const interpolator = new GtfsTripMovementsInterpolator();
  const interpolated = interpolator.interpolate(movements);

  const str = interpolated
    .map((m) => {
      const sArr = "scheduledArrivalTime" in m ? m.scheduledArrivalTime : null;
      const sDep =
        "scheduledDepartureTime" in m ? m.scheduledDepartureTime : null;
      const kArr =
        "knownRealtimeArrivalTime" in m ? m.knownRealtimeArrivalTime : null;
      const kDep =
        "knownRealtimeDepartureTime" in m ? m.knownRealtimeDepartureTime : null;
      const aArr =
        "assumedRealtimeArrivalTime" in m ? m.assumedRealtimeArrivalTime : null;
      const aDep =
        "assumedRealtimeDepartureTime" in m
          ? m.assumedRealtimeDepartureTime
          : null;

      return `${timeStr(sArr)} ${timeStr(sDep)}   ${timeStr(kArr)} ${timeStr(kDep)}   ${timeStr(aArr)} ${timeStr(aDep)}`;
    })
    .join("\n");

  expect(
    `\n\nS-ARR S-DEP   K-ARR K-DEP   A-ARR A-DEP\n${str}\n\n`,
  ).toMatchSnapshot();
}

function orig(
  _scheduledArrivalTime: NullTime,
  scheduledDepartureTime: string,
  _knownRealtimeArrivalTime: NullTime,
  knownRealtimeDepartureTime: string,
) {
  return new GtfsUpdatedTripOriginatingMovement({
    stopId: 1,
    originalPositionId: null,
    updatedPositionId: null,

    scheduledDepartureTime: time(scheduledDepartureTime),
    knownRealtimeDepartureTime: optionalTime(knownRealtimeDepartureTime),
    assumedRealtimeDepartureTime: null,

    originalGtfsIdMetadata: {
      type: "general",
      id: "stop-1",
      stopId: 1,
    },
    updatedGtfsIdMetadata: {
      type: "general",
      id: "stop-1",
      stopId: 1,
    },
    gtfsStopSequence: 1,
  });
}

function rglr(
  scheduledArrivalTime: string,
  scheduledDepartureTime: string,
  knownRealtimeArrivalTime: string,
  knownRealtimeDepartureTime: string,
) {
  return new GtfsUpdatedTripRegularMovement({
    stopId: 1,
    originalPositionId: null,
    updatedPositionId: null,

    scheduledArrivalTime: time(scheduledArrivalTime),
    knownRealtimeArrivalTime: optionalTime(knownRealtimeArrivalTime),
    assumedRealtimeArrivalTime: null,

    scheduledDepartureTime: time(scheduledDepartureTime),
    knownRealtimeDepartureTime: optionalTime(knownRealtimeDepartureTime),
    assumedRealtimeDepartureTime: null,

    picksUp: true,
    dropsOff: true,

    originalGtfsIdMetadata: {
      type: "general",
      id: "stop-1",
      stopId: 1,
    },
    updatedGtfsIdMetadata: {
      type: "general",
      id: "stop-1",
      stopId: 1,
    },
    gtfsStopSequence: 1,
  });
}

function term(
  scheduledArrivalTime: string,
  _scheduledDepartureTime: NullTime,
  knownRealtimeArrivalTime: string,
  _knownRealtimeDepartureTime: NullTime,
) {
  return new GtfsUpdatedTripTerminatingMovement({
    stopId: 1,
    originalPositionId: null,
    updatedPositionId: null,

    scheduledArrivalTime: time(scheduledArrivalTime),
    knownRealtimeArrivalTime: optionalTime(knownRealtimeArrivalTime),
    assumedRealtimeArrivalTime: null,

    originalGtfsIdMetadata: {
      type: "general",
      id: "stop-1",
      stopId: 1,
    },
    updatedGtfsIdMetadata: {
      type: "general",
      id: "stop-1",
      stopId: 1,
    },
    gtfsStopSequence: 1,
  });
}

function pass() {
  return new GtfsUpdatedTripPassingMovement({ stopId: 1 });
}

function time(hhmm: string) {
  return Temporal.Instant.from(`2026-11-19T${hhmm}:00Z`);
}

function optionalTime(hhmm: string) {
  return hhmm === nullTime ? null : time(hhmm);
}

function timeStr(instant: Temporal.Instant | null) {
  return instant == null ? nullTime : instant.toString().slice(11, 16);
}
