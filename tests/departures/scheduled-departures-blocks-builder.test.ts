import { describe, expect, it } from "vitest";
import { BoundedInstantRange } from "../../../../src/gtfs/corequery-gtfs/data/bounded-instant-range.js";
import { itsOk } from "@dan-schel/js-utils";
import { GtfsScheduledTrip } from "../../../../src/gtfs/corequery-gtfs/data/gtfs-scheduled-trip.js";
import { GtfsStopTime } from "../../../../src/gtfs/corequery-gtfs/data/gtfs-stop-time.js";
import { PlainDateRange } from "../../../../src/gtfs/corequery-gtfs/data/plain-date-range.js";
import type { GtfsScheduledMovementsIndexEntry } from "../../../../src/gtfs/corequery-gtfs/departures/gtfs-scheduled-movements-index.js";
import { ScheduledDeparturesBlocksBuilder } from "../../../../src/gtfs/corequery-gtfs/departures/scheduled-departures-blocks-builder.js";

const MELBOURNE_TIMEZONE_DATA = {
  timezone: "Australia/Melbourne",
  minimumViableOffsetSeconds: 10 * 60 * 60,
  maximumViableOffsetSeconds: 11 * 60 * 60,
};

describe("ScheduledDeparturesBlocksBuilder", () => {
  describe("constructor", () => {
    it("throws if no movements are given", () => {
      expect(() => {
        new ScheduledDeparturesBlocksBuilder(
          [],
          MELBOURNE_TIMEZONE_DATA,
          PlainDateRange.infinite,
        );
      }).toThrow();
    });
  });

  describe("#allBlocksWithinTimeRange", () => {
    const builder = new ScheduledDeparturesBlocksBuilder(
      createMovements({ earliest: "05:18:00", latest: "26:08:00" }),
      MELBOURNE_TIMEZONE_DATA,
      PlainDateRange.infinite,
    );

    it("returns all scheduled departures blocks within the time range", () => {
      expectBlocks({
        builder,
        queryStart: "2026-08-02T00:00:00+10:00",
        queryEnd: "2026-08-03T00:00:00+10:00",
        result: [
          {
            serviceDay: "2026-08-01",
            earliest: "2026-08-01T05:18:00+10:00",
            latest: "2026-08-02T02:08:00+10:00",
          },
          {
            serviceDay: "2026-08-02",
            earliest: "2026-08-02T05:18:00+10:00",
            latest: "2026-08-03T02:08:00+10:00",
          },
        ],
      });

      expectBlocks({
        builder,
        queryStart: "2026-08-02T00:00:00+10:00",
        queryEnd: "2026-08-05T00:00:00+10:00",
        result: [
          {
            serviceDay: "2026-08-01",
            earliest: "2026-08-01T05:18:00+10:00",
            latest: "2026-08-02T02:08:00+10:00",
          },
          {
            serviceDay: "2026-08-02",
            earliest: "2026-08-02T05:18:00+10:00",
            latest: "2026-08-03T02:08:00+10:00",
          },
          {
            serviceDay: "2026-08-03",
            earliest: "2026-08-03T05:18:00+10:00",
            latest: "2026-08-04T02:08:00+10:00",
          },
          {
            serviceDay: "2026-08-04",
            earliest: "2026-08-04T05:18:00+10:00",
            latest: "2026-08-05T02:08:00+10:00",
          },
        ],
      });
    });

    it("doesn't omit the last movement of the day if the query equals it's exact time", () => {
      expectBlocks({
        builder,
        queryStart: "2026-08-02T02:08:00+10:00",
        queryEnd: "2026-08-03T00:00:00+10:00",
        result: [
          {
            serviceDay: "2026-08-01",
            earliest: "2026-08-01T05:18:00+10:00",
            latest: "2026-08-02T02:08:00+10:00",
          },
          {
            serviceDay: "2026-08-02",
            earliest: "2026-08-02T05:18:00+10:00",
            latest: "2026-08-03T02:08:00+10:00",
          },
        ],
      });
    });

    it("doesn't omit the first movement of the day if the query equals it's exact time", () => {
      expectBlocks({
        builder,
        queryStart: "2026-08-02T00:00:00+10:00",
        queryEnd: "2026-08-02T05:18:00+10:00",
        result: [
          {
            serviceDay: "2026-08-01",
            earliest: "2026-08-01T05:18:00+10:00",
            latest: "2026-08-02T02:08:00+10:00",
          },
          {
            serviceDay: "2026-08-02",
            earliest: "2026-08-02T05:18:00+10:00",
            latest: "2026-08-03T02:08:00+10:00",
          },
        ],
      });
    });

    it("works correctly at the boundaries", () => {
      expectBlocks({
        builder,
        queryStart: "2026-08-02T05:18:00+10:00",
        queryEnd: "2026-08-02T05:18:00+10:00",
        result: [
          {
            serviceDay: "2026-08-02",
            earliest: "2026-08-02T05:18:00+10:00",
            latest: "2026-08-03T02:08:00+10:00",
          },
        ],
      });

      expectBlocks({
        builder,
        queryStart: "2026-08-02T05:17:00+10:00",
        queryEnd: "2026-08-02T05:17:00+10:00",
        result: [],
      });

      expectBlocks({
        builder,
        queryStart: "2026-08-02T02:08:00+10:00",
        queryEnd: "2026-08-02T02:08:00+10:00",
        result: [
          {
            serviceDay: "2026-08-01",
            earliest: "2026-08-01T05:18:00+10:00",
            latest: "2026-08-02T02:08:00+10:00",
          },
        ],
      });

      expectBlocks({
        builder,
        queryStart: "2026-08-02T02:09:00+10:00",
        queryEnd: "2026-08-02T02:09:00+10:00",
        result: [],
      });
    });

    it("handles transition out of DST correctly", () => {
      expectBlocks({
        builder,
        queryStart: "2026-04-05T01:00:00+11:00",
        queryEnd: "2026-04-05T05:30:00+10:00",
        result: [
          {
            serviceDay: "2026-04-04",
            earliest: "2026-04-04T05:18:00+11:00",
            latest: "2026-04-05T02:08:00+11:00",
          },
          {
            serviceDay: "2026-04-05",
            earliest: "2026-04-05T05:18:00+10:00",
            latest: "2026-04-06T02:08:00+10:00",
          },
        ],
      });

      expectBlocks({
        builder,
        queryStart: "2026-04-05T02:09:00+11:00",
        queryEnd: "2026-04-05T05:17:00+10:00",
        result: [],
      });
    });

    it("handles transition into DST correctly", () => {
      expectBlocks({
        builder,
        queryStart: "2026-10-04T01:00:00+10:00",
        queryEnd: "2026-10-04T05:30:00+11:00",
        result: [
          {
            serviceDay: "2026-10-03",
            earliest: "2026-10-03T05:18:00+10:00",
            latest: "2026-10-04T02:08:00+10:00",
          },
          {
            serviceDay: "2026-10-04",
            earliest: "2026-10-04T05:18:00+11:00",
            latest: "2026-10-05T02:08:00+11:00",
          },
        ],
      });

      expectBlocks({
        builder,
        queryStart: "2026-10-04T02:09:00+10:00",
        queryEnd: "2026-10-04T05:17:00+11:00",
        result: [],
      });
    });

    it("handles cases where the last movement is within the next service day", () => {
      const builder = new ScheduledDeparturesBlocksBuilder(
        createMovements({ earliest: "05:18:00", latest: "55:08:00" }),
        MELBOURNE_TIMEZONE_DATA,
        PlainDateRange.infinite,
      );

      expectBlocks({
        builder,
        queryStart: "2026-08-02T06:00:00+10:00",
        queryEnd: "2026-08-02T06:00:00+10:00",
        result: [
          {
            serviceDay: "2026-07-31",
            earliest: "2026-07-31T05:18:00+10:00",
            latest: "2026-08-02T07:08:00+10:00",
          },
          {
            serviceDay: "2026-08-01",
            earliest: "2026-08-01T05:18:00+10:00",
            latest: "2026-08-03T07:08:00+10:00",
          },
          {
            serviceDay: "2026-08-02",
            earliest: "2026-08-02T05:18:00+10:00",
            latest: "2026-08-04T07:08:00+10:00",
          },
        ],
      });

      expectBlocks({
        builder,
        queryStart: "2026-08-02T07:09:00+10:00",
        queryEnd: "2026-08-02T07:09:00+10:00",
        result: [
          {
            serviceDay: "2026-08-01",
            earliest: "2026-08-01T05:18:00+10:00",
            latest: "2026-08-03T07:08:00+10:00",
          },
          {
            serviceDay: "2026-08-02",
            earliest: "2026-08-02T05:18:00+10:00",
            latest: "2026-08-04T07:08:00+10:00",
          },
        ],
      });
    });
  });
});

function createMovements({
  earliest,
  latest,
}: {
  earliest: string;
  latest: string;
}): GtfsScheduledMovementsIndexEntry[] {
  const earliestTime = GtfsStopTime.parse(earliest);
  const latestTime = GtfsStopTime.parse(latest);

  const trip1 = createTrip({ tripId: "trip-1", originationTime: earliestTime });
  const trip2 = createTrip({ tripId: "trip-2", originationTime: latestTime });

  return [
    { trip: trip1, time: earliestTime, movement: trip1.origination },
    { trip: trip2, time: latestTime, movement: trip2.origination },
  ];
}

function createTrip({
  tripId,
  originationTime,
}: {
  tripId: string;
  originationTime: GtfsStopTime;
}) {
  return GtfsScheduledTrip.simple({
    gtfsTripId: tripId,
    originStopId: 1,
    originationTime,
    terminusStopId: 2,
    terminationTime: originationTime.plus({ minutes: 5 }),
  });
}

function expectBlocks({
  builder,
  queryStart,
  queryEnd,
  result,
}: {
  builder: ScheduledDeparturesBlocksBuilder;
  queryStart: string;
  queryEnd: string;
  result: {
    serviceDay: string;
    earliest: string;
    latest: string;
  }[];
}) {
  const queryStartInstant = Temporal.Instant.from(queryStart);
  const queryEndInstant = Temporal.Instant.from(queryEnd);
  const range = new BoundedInstantRange(queryStartInstant, queryEndInstant);

  const blocks = builder.allWithinTimeRange(range);

  expect(blocks).toHaveLength(result.length);

  for (let i = 0; i < result.length; i++) {
    const expected = itsOk(result[i]);
    const expectedServiceDay = Temporal.PlainDate.from(expected.serviceDay);
    const expectedEarliest = Temporal.Instant.from(expected.earliest);
    const expectedLatest = Temporal.Instant.from(expected.latest);

    const block = itsOk(blocks[i]);
    expect(block.serviceDay).toEqual(expectedServiceDay);
    expect(block.instantRange.start).toEqual(expectedEarliest);
    expect(block.instantRange.end).toEqual(expectedLatest);
  }
}
