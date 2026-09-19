import { describe, expect, it } from "vitest";
import { GtfsUpdatedTripPassingMovement } from "../../../src/data/trip/updated/gtfs-updated-trip-passing-movement.js";
import { GtfsUpdatedTripOriginatingMovement } from "../../../src/data/trip/updated/gtfs-updated-trip-originating-movement.js";
import { GtfsUpdatedTripTerminatingMovement } from "../../../src/data/trip/updated/gtfs-updated-trip-terminating-movement.js";
import { GtfsUpdatedTripRegularMovement } from "../../../src/data/trip/updated/gtfs-updated-trip-regular-movement.js";
import type { GtfsUpdatedTripMovement } from "../../../src/data/trip/updated/types.js";
import { GtfsTripMovementsInterpolator } from "../../../src/parser/realtime/gtfs-trip-movements-interpolator.js";
import { itsOk } from "@dan-schel/js-utils";

const nullTime = "--:--" as const;
type NullTime = typeof nullTime;

describe("GtfsTripMovementsInterpolator", () => {
  it("01: works, when the delay increases over time", () => {
    const interpolator = new GtfsTripMovementsInterpolator();
    const interpolated = interpolator.interpolate([
      //   Scheduled:        Realtime:
      orig("--:--", "08:00", "--:--", "--:--"),
      rglr("08:05", "08:05", "--:--", "--:--"),
      rglr("08:10", "08:10", "08:22", "08:22"),
      rglr("08:15", "08:15", "--:--", "--:--"),
      rglr("08:20", "08:20", "--:--", "--:--"),
      rglr("08:25", "08:25", "--:--", "--:--"),
      rglr("08:30", "08:30", "08:54", "08:54"),
      rglr("08:35", "08:35", "--:--", "--:--"),
      term("08:40", "--:--", "--:--", "--:--"),
    ]);

    expectMovementsToMatchSnapshot(interpolated);
    ensureNoTimeTravel(interpolated);
  });

  it("02: works, when the delay decreases over time", () => {
    const interpolator = new GtfsTripMovementsInterpolator();
    const interpolated = interpolator.interpolate([
      //   Scheduled:        Realtime:
      orig("--:--", "08:00", "--:--", "--:--"),
      rglr("08:05", "08:05", "--:--", "--:--"),
      rglr("08:10", "08:10", "08:22", "08:22"),
      rglr("08:15", "08:15", "--:--", "--:--"),
      rglr("08:20", "08:20", "--:--", "--:--"),
      rglr("08:25", "08:25", "--:--", "--:--"),
      rglr("08:30", "08:30", "08:30", "08:30"),
      rglr("08:35", "08:35", "--:--", "--:--"),
      term("08:40", "--:--", "--:--", "--:--"),
    ]);

    expectMovementsToMatchSnapshot(interpolated);
    ensureNoTimeTravel(interpolated);
  });

  it("03: works, when the service goes from late to early", () => {
    const interpolator = new GtfsTripMovementsInterpolator();
    const interpolated = interpolator.interpolate([
      //   Scheduled:        Realtime:
      orig("--:--", "08:00", "--:--", "--:--"),
      rglr("08:05", "08:05", "--:--", "--:--"),
      rglr("08:10", "08:10", "08:16", "08:16"),
      rglr("08:15", "08:15", "--:--", "--:--"),
      rglr("08:20", "08:20", "--:--", "--:--"),
      rglr("08:25", "08:25", "--:--", "--:--"),
      rglr("08:30", "08:30", "08:24", "08:24"),
      rglr("08:35", "08:35", "--:--", "--:--"),
      term("08:40", "--:--", "--:--", "--:--"),
    ]);

    expectMovementsToMatchSnapshot(interpolated);
    ensureNoTimeTravel(interpolated);
  });

  it("04: works, when only the termination time is given", () => {
    const interpolator = new GtfsTripMovementsInterpolator();
    const interpolated = interpolator.interpolate([
      //   Scheduled:        Realtime:
      orig("--:--", "08:00", "--:--", "--:--"),
      rglr("08:05", "08:05", "--:--", "--:--"),
      rglr("08:10", "08:10", "--:--", "--:--"),
      rglr("08:15", "08:15", "--:--", "--:--"),
      rglr("08:20", "08:20", "--:--", "--:--"),
      rglr("08:25", "08:25", "--:--", "--:--"),
      rglr("08:30", "08:30", "--:--", "--:--"),
      rglr("08:35", "08:35", "--:--", "--:--"),
      term("08:40", "--:--", "08:45", "--:--"),
    ]);

    expectMovementsToMatchSnapshot(interpolated);
    ensureNoTimeTravel(interpolated);
  });

  it("05: works, when only the origination time is given", () => {
    const interpolator = new GtfsTripMovementsInterpolator();
    const interpolated = interpolator.interpolate([
      //   Scheduled:        Realtime:
      orig("--:--", "08:00", "--:--", "08:30"),
      rglr("08:05", "08:05", "--:--", "--:--"),
      rglr("08:10", "08:10", "--:--", "--:--"),
      rglr("08:15", "08:15", "--:--", "--:--"),
      rglr("08:20", "08:20", "--:--", "--:--"),
      rglr("08:25", "08:25", "--:--", "--:--"),
      rglr("08:30", "08:30", "--:--", "--:--"),
      rglr("08:35", "08:35", "--:--", "--:--"),
      term("08:40", "--:--", "--:--", "--:--"),
    ]);

    expectMovementsToMatchSnapshot(interpolated);
    ensureNoTimeTravel(interpolated);
  });

  it("06: works, when arrival times differ from departure times, and delay decreases over time", () => {
    const interpolator = new GtfsTripMovementsInterpolator();
    const interpolated = interpolator.interpolate([
      //   Scheduled:        Realtime:
      orig("--:--", "08:00", "--:--", "08:30"),
      rglr("08:10", "08:25", "--:--", "--:--"),
      rglr("08:30", "08:30", "--:--", "--:--"),
      rglr("08:35", "08:50", "--:--", "--:--"),
      term("09:00", "--:--", "09:00", "--:--"),
    ]);

    expectMovementsToMatchSnapshot(interpolated);
    ensureNoTimeTravel(interpolated);
  });

  it("07: works, when arrival times differ from departure times, and delay increases over time", () => {
    const interpolator = new GtfsTripMovementsInterpolator();
    const interpolated = interpolator.interpolate([
      //   Scheduled:        Realtime:
      orig("--:--", "08:00", "--:--", "08:00"),
      rglr("08:10", "08:25", "--:--", "--:--"),
      rglr("08:30", "08:30", "--:--", "--:--"),
      rglr("08:35", "08:50", "--:--", "--:--"),
      term("09:00", "--:--", "09:30", "--:--"),
    ]);

    expectMovementsToMatchSnapshot(interpolated);
    ensureNoTimeTravel(interpolated);
  });

  it("08: works, when passing movements are included", () => {
    const interpolator = new GtfsTripMovementsInterpolator();
    const interpolated = interpolator.interpolate([
      //   Scheduled:        Realtime:
      orig("--:--", "08:00", "--:--", "--:--"),
      rglr("08:05", "08:05", "--:--", "--:--"),
      pass(),
      rglr("08:10", "08:10", "08:22", "08:22"),
      pass(),
      rglr("08:15", "08:15", "--:--", "--:--"),
      rglr("08:20", "08:20", "--:--", "--:--"),
      rglr("08:25", "08:25", "--:--", "--:--"),
      pass(),
      pass(),
      pass(),
      rglr("08:30", "08:30", "08:54", "08:54"),
      rglr("08:35", "08:35", "--:--", "--:--"),
      pass(),
      term("08:40", "--:--", "--:--", "--:--"),
    ]);

    expectMovementsToMatchSnapshot(interpolated);
    ensureNoTimeTravel(interpolated);
  });
});

function expectMovementsToMatchSnapshot(movements: GtfsUpdatedTripMovement[]) {
  const str = movements.map((m) => {
    function getTime(obj: object, key: keyof GtfsUpdatedTripRegularMovement) {
      return (obj as Record<string, Temporal.Instant | null>)[key] ?? null;
    }

    const sArr = getTime(m, "scheduledArrivalTime");
    const sDep = getTime(m, "scheduledDepartureTime");
    const kArr = getTime(m, "knownRealtimeArrivalTime");
    const kDep = getTime(m, "knownRealtimeDepartureTime");
    const aArr = getTime(m, "assumedRealtimeArrivalTime");
    const aDep = getTime(m, "assumedRealtimeDepartureTime");

    return `${timeStr(sArr)} ${timeStr(sDep)} | ${timeStr(kArr, sArr)} ${timeStr(kDep, sDep)} | ${timeStr(aArr, sArr)} ${timeStr(aDep, sDep)}`;
  });

  expect(
    `\n\nS-ARR       S-DEP       | K-ARR       K-DEP       | A-ARR       A-DEP\n${str.join("\n")}\n\n`,
  ).toMatchSnapshot();
}

function ensureNoTimeTravel(movements: GtfsUpdatedTripMovement[]) {
  const times = movements.flatMap((m) => m.effectiveTimes);

  for (let i = 1; i < times.length; i++) {
    const me = itsOk(times[i]);
    const prev = itsOk(times[i - 1]);
    if (Temporal.Instant.compare(me, prev) < 0) {
      throw new Error(`Has time travel: ${timeStr(prev)} -> ${timeStr(me)}`);
    }
  }
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

function timeStr(
  instant: Temporal.Instant | null,
  comparisonInstant?: Temporal.Instant | null,
) {
  if (instant == null) return `${nullTime}      `;

  const str = instant.toString().slice(11, 16);
  const comparison =
    comparisonInstant != null
      ? `(${Math.floor(instant.since(comparisonInstant).total("minutes"))})`
      : "";
  return `${str} ${comparison.padEnd(5, " ")}`;
}
