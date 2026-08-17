import { describe, expect, it } from "vitest";
import {
  GtfsTransferConnector,
  TransferCrossesCalendarsError,
  TransferIsNotInSeatTransferError,
  TransferIsNotSameStopAndPositionError,
  TransferRequiresTimeTravelError,
  type GtfsTransferConnectionError,
} from "../../../../../src/gtfs/corequery-gtfs/parser/schedule/gtfs-transfer-connector.js";
import {
  TransferIsNotFromTerminusError,
  TransferIsNotToOriginError,
  TransferReferencesNonExistentTrip,
  TransferReferencesTripAlreadyConnectedError,
} from "../../../../../src/gtfs/corequery-gtfs/parser/schedule/gtfs-transfer-connector.js";
import { itsOk } from "@dan-schel/js-utils";
import { GtfsScheduledTrip } from "../../../../../src/gtfs/corequery-gtfs/data/gtfs-scheduled-trip.js";
import { GtfsCalendar } from "../../../../../src/gtfs/corequery-gtfs/data/gtfs-calendar.js";
import { GtfsStopTime } from "../../../../../src/gtfs/corequery-gtfs/data/gtfs-stop-time.js";

describe("GtfsTransferConnector", () => {
  const TRIP_A = makeTripA("1", "2");
  const TRIP_B = makeTripB("2", "3");
  const TRANSFER = {
    from_stop_id: "2",
    to_stop_id: "2",
    from_trip_id: TRIP_A.gtfsTripId,
    to_trip_id: TRIP_B.gtfsTripId,
    transfer_type: 4,
    min_transfer_time: "0",
  };
  const TRIPS = [TRIP_A, TRIP_B];

  it("connects trips using in-seat transfers", () => {
    const errors: GtfsTransferConnectionError[] = [];
    const connector = new GtfsTransferConnector((e) => errors.push(e));

    const result = connector.connect(TRIPS, [TRANSFER]);

    expect(result).toHaveLength(2);
    expect(result[0]?.nextTrip?.gtfsTripId).toBe(TRIP_B.gtfsTripId);
    expect(result[1]?.previousTrip?.gtfsTripId).toBe(TRIP_A.gtfsTripId);
    expect(errors).toEqual([]);
  });

  it("reports non in-seat transfers and leaves the trips disconnected", () => {
    const errors: GtfsTransferConnectionError[] = [];
    const connector = new GtfsTransferConnector((e) => errors.push(e));

    const transfersCsv = [{ ...TRANSFER, transfer_type: 0 }];
    const result = connector.connect(TRIPS, transfersCsv);

    expect(result).toHaveLength(2);
    expect(itsOk(result[0]).nextTrip).toBeNull();
    expect(itsOk(result[1]).previousTrip).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(TransferIsNotInSeatTransferError);
  });

  it("reports transfers that reference a missing 'from' trip", () => {
    const errors: GtfsTransferConnectionError[] = [];
    const connector = new GtfsTransferConnector((e) => errors.push(e));

    const transfersCsv = [{ ...TRANSFER, from_trip_id: "missing" }];
    const result = connector.connect(TRIPS, transfersCsv);

    expect(result).toHaveLength(2);
    expect(itsOk(result[0]).nextTrip).toBeNull();
    expect(itsOk(result[1]).previousTrip).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(TransferReferencesNonExistentTrip);
  });

  it("reports transfers that reference a missing 'to' trip", () => {
    const errors: GtfsTransferConnectionError[] = [];
    const connector = new GtfsTransferConnector((e) => errors.push(e));

    const transfersCsv = [{ ...TRANSFER, to_trip_id: "missing" }];
    const result = connector.connect(TRIPS, transfersCsv);

    expect(result).toHaveLength(2);
    expect(itsOk(result[0]).nextTrip).toBeNull();
    expect(itsOk(result[1]).previousTrip).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(TransferReferencesNonExistentTrip);
  });

  it("reports transfers that do not start from the 'from' trip terminus", () => {
    const errors: GtfsTransferConnectionError[] = [];
    const connector = new GtfsTransferConnector((e) => errors.push(e));

    const trips = [makeTripA("1", "2"), makeTripB("1", "3")];
    const transfersCsv = [{ ...TRANSFER, from_stop_id: "1", to_stop_id: "1" }];
    const result = connector.connect(trips, transfersCsv);

    expect(result).toHaveLength(2);
    expect(itsOk(result[0]).nextTrip).toBeNull();
    expect(itsOk(result[1]).previousTrip).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(TransferIsNotFromTerminusError);
  });

  it("reports transfers that do not end at the 'to' trip origin", () => {
    const errors: GtfsTransferConnectionError[] = [];
    const connector = new GtfsTransferConnector((e) => errors.push(e));

    const trips = [makeTripA("1", "2"), makeTripB("3", "2")];
    const transfersCsv = [{ ...TRANSFER, to_stop_id: "2", from_stop_id: "2" }];
    const result = connector.connect(trips, transfersCsv);

    expect(result).toHaveLength(2);
    expect(itsOk(result[0]).nextTrip).toBeNull();
    expect(itsOk(result[1]).previousTrip).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(TransferIsNotToOriginError);
  });

  it("reports transfers involving trips that are already connected", () => {
    const errors: GtfsTransferConnectionError[] = [];
    const connector = new GtfsTransferConnector((e) => errors.push(e));

    const inputTrips = [
      makeTripA("1", "2").with({
        nextTrip: makeTrip({
          gtfsTripId: "trip-c",
          originGtfsStopId: "2",
          terminusGtfsStopId: "3",
          originDepartureTime: GtfsStopTime.parse("09:00:00"),
          terminusArrivalTime: GtfsStopTime.parse("10:00:00"),
        }),
      }),
      makeTripB("2", "3"),
    ];
    const transfersCsv = [TRANSFER];

    const result = connector.connect(inputTrips, transfersCsv);

    expect(result).toHaveLength(2);

    // First come, first serve I guess. Trip A & C remain connected, but Trip B is left unconnected.
    expect(result[0]?.nextTrip?.gtfsTripId).toBe("trip-c");
    expect(itsOk(result[1]).previousTrip).toBeNull();

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(
      TransferReferencesTripAlreadyConnectedError,
    );
  });

  it("reports transfers where the 'from' stop & position is different to the 'to' stop & position", () => {
    const errors: GtfsTransferConnectionError[] = [];
    const connector = new GtfsTransferConnector((e) => errors.push(e));

    const trips = [makeTripA("1", "2"), makeTripB("3", "4")];
    const transfersCsv = [{ ...TRANSFER, from_stop_id: "2", to_stop_id: "3" }];
    const result = connector.connect(trips, transfersCsv);

    expect(result).toHaveLength(2);
    expect(itsOk(result[0]).nextTrip).toBeNull();
    expect(itsOk(result[1]).previousTrip).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(TransferIsNotSameStopAndPositionError);
  });

  it("reports, but allows transfers that cross calendars", () => {
    const errors: GtfsTransferConnectionError[] = [];
    const connector = new GtfsTransferConnector((e) => errors.push(e));

    const trips = [
      makeTripA("1", "2").with({
        calendar: GtfsCalendar.everyday("calendar-a"),
      }),
      makeTripB("2", "3").with({
        calendar: GtfsCalendar.everyday("calendar-b"),
      }),
    ];
    const transfersCsv = [TRANSFER];
    const result = connector.connect(trips, transfersCsv);

    expect(result).toHaveLength(2);
    expect(itsOk(result[0]).nextTrip?.gtfsTripId).toBe("trip-b");
    expect(itsOk(result[1]).previousTrip?.gtfsTripId).toBe("trip-a");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(TransferCrossesCalendarsError);
  });

  it("reports transfers that require time travel", () => {
    const errors: GtfsTransferConnectionError[] = [];
    const connector = new GtfsTransferConnector((e) => errors.push(e));

    const tripA = makeTrip({
      gtfsTripId: "trip-a",
      originGtfsStopId: "1",
      terminusGtfsStopId: "2",
      originDepartureTime: GtfsStopTime.parse("08:00:00"),
      terminusArrivalTime: GtfsStopTime.parse("09:00:00"),
    });
    const tripB = makeTrip({
      gtfsTripId: "trip-b",
      originGtfsStopId: "2",
      terminusGtfsStopId: "3",
      originDepartureTime: GtfsStopTime.parse("08:30:00"),
      terminusArrivalTime: GtfsStopTime.parse("09:30:00"),
    });

    const trips = [tripA, tripB];
    const transfersCsv = [TRANSFER];
    const result = connector.connect(trips, transfersCsv);

    expect(result).toHaveLength(2);
    expect(itsOk(result[0]).nextTrip).toBeNull();
    expect(itsOk(result[1]).previousTrip).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(TransferRequiresTimeTravelError);
  });

  function makeTripA(originGtfsStopId: string, terminusGtfsStopId: string) {
    return makeTrip({
      gtfsTripId: "trip-a",
      originGtfsStopId,
      terminusGtfsStopId,
      originDepartureTime: GtfsStopTime.parse("08:00:00"),
      terminusArrivalTime: GtfsStopTime.parse("09:00:00"),
    });
  }

  function makeTripB(originGtfsStopId: string, terminusGtfsStopId: string) {
    return makeTrip({
      gtfsTripId: "trip-b",
      originGtfsStopId,
      terminusGtfsStopId,
      originDepartureTime: GtfsStopTime.parse("09:00:00"),
      terminusArrivalTime: GtfsStopTime.parse("10:00:00"),
    });
  }

  function makeTrip({
    gtfsTripId,
    originGtfsStopId,
    terminusGtfsStopId,
    originDepartureTime,
    terminusArrivalTime,
  }: {
    gtfsTripId: string;
    originGtfsStopId: string;
    terminusGtfsStopId: string;
    originDepartureTime: GtfsStopTime;
    terminusArrivalTime: GtfsStopTime;
  }) {
    return GtfsScheduledTrip.simple({
      gtfsTripId,
      originStopId: 1,
      originGtfsStopId,
      originationTime: originDepartureTime,
      terminusStopId: 2,
      terminusGtfsStopId,
      terminationTime: terminusArrivalTime,
    });
  }
});
