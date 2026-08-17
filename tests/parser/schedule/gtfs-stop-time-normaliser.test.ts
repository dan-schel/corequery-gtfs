import { describe, expect, it } from "vitest";
import { GtfsStopTime } from "../../../src/data/gtfs-stop-time.js";
import type { StopTimesCsvRow } from "../../../src/data/raw/schedule-csvs.js";
import {
  type GtfsStopTimeNormalisationError,
  GtfsStopTimeNormaliser,
  InvalidStopSequenceError,
  MultipleStopSequencesError,
} from "../../../src/parser/schedule/gtfs-stop-time-normaliser.js";

function stopTime(overrides: Partial<StopTimesCsvRow> = {}): StopTimesCsvRow {
  return {
    trip_id: "",
    stop_id: "",
    stop_sequence: 1,
    arrival_time: GtfsStopTime.parse("00:00:00"),
    departure_time: GtfsStopTime.parse("00:00:00"),
    pickup_type: 0,
    drop_off_type: 0,
    ...overrides,
  };
}

describe("GtfsStopTimeNormaliser", () => {
  it("returns already regular stop sequences unchanged", () => {
    const errors: GtfsStopTimeNormalisationError[] = [];
    const normaliser = new GtfsStopTimeNormaliser((e) => errors.push(e));

    const stopTimes = [
      stopTime({ stop_sequence: 1, stop_id: "1" }),
      stopTime({ stop_sequence: 2, stop_id: "2" }),
      stopTime({ stop_sequence: 3, stop_id: "3" }),
    ];

    expect(normaliser.normalise(stopTimes)).toEqual(stopTimes);
    expect(errors).toEqual([]);
  });

  it("sorts regular stop times by stop sequence number", () => {
    const errors: GtfsStopTimeNormalisationError[] = [];
    const normaliser = new GtfsStopTimeNormaliser((e) => errors.push(e));

    const stopTimes = [
      stopTime({ stop_sequence: 2, stop_id: "2" }),
      stopTime({ stop_sequence: 1, stop_id: "1" }),
      stopTime({ stop_sequence: 3, stop_id: "3" }),
    ];

    expect(
      normaliser.normalise(stopTimes)?.map((stopTime) => stopTime.stop_id),
    ).toEqual(["1", "2", "3"]);
    expect(errors).toEqual([]);
  });

  it("returns null for non-regular stop sequences", () => {
    const errors: GtfsStopTimeNormalisationError[] = [];
    const normaliser = new GtfsStopTimeNormaliser((e) => errors.push(e));

    const stopTimes = [
      stopTime({ stop_sequence: 1, stop_id: "1" }),
      stopTime({ stop_sequence: 3, stop_id: "3" }),
    ];

    expect(normaliser.normalise(stopTimes)).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(InvalidStopSequenceError);
  });

  it("returns the first regular sequence when multiple regular sequences are present", () => {
    const errors: GtfsStopTimeNormalisationError[] = [];
    const normaliser = new GtfsStopTimeNormaliser((e) => errors.push(e));

    const stopTimes = [
      stopTime({ stop_sequence: 1, stop_id: "1-a" }),
      stopTime({ stop_sequence: 2, stop_id: "2-a" }),
      stopTime({ stop_sequence: 1, stop_id: "1-b" }),
      stopTime({ stop_sequence: 2, stop_id: "2-b" }),
    ];

    expect(normaliser.normalise(stopTimes)).toEqual([
      stopTimes[0],
      stopTimes[1],
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(MultipleStopSequencesError);
  });

  it("returns null if the stopping sequence requires time travel", () => {
    const errors: GtfsStopTimeNormalisationError[] = [];
    const normaliser = new GtfsStopTimeNormaliser((e) => errors.push(e));

    const stopTimes = [
      stopTime({
        stop_sequence: 1,
        stop_id: "1",
        arrival_time: GtfsStopTime.parse("10:00:00"),
        departure_time: GtfsStopTime.parse("10:05:00"),
      }),
      stopTime({
        stop_sequence: 2,
        stop_id: "2",

        // 1 min before previous departure
        arrival_time: GtfsStopTime.parse("10:04:00"),

        departure_time: GtfsStopTime.parse("10:10:00"),
      }),
    ];

    expect(normaliser.normalise(stopTimes)).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(InvalidStopSequenceError);
  });
});
