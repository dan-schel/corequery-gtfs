import { describe, expect, it } from "vitest";
import {
  GtfsTripUpdateTripIdentifier,
  NecessaryFieldNotInTripDescriptorError,
  TripDescriptorStartTimeDoesNotMatchTripOriginStopTimeError,
  TripDescriptorReferencesNonExistentTripIdError,
  TripDoesNotOccurOnStartDateError,
  type GtfsTripUpdateTripIdentificationError,
} from "../../../../../src/gtfs/corequery-gtfs/parser/realtime/gtfs-trip-update-trip-identifier.js";
import { GtfsCalendar } from "../../../../../src/gtfs/corequery-gtfs/data/gtfs-calendar.js";
import { GtfsScheduleData } from "../../../../../src/gtfs/corequery-gtfs/data/gtfs-schedule-data.js";
import { GtfsStopTime } from "../../../../../src/gtfs/corequery-gtfs/data/gtfs-stop-time.js";
import { PlainDateRange } from "../../../../../src/gtfs/corequery-gtfs/data/plain-date-range.js";
import { GtfsScheduledTrip } from "../../../../../src/gtfs/corequery-gtfs/data/gtfs-scheduled-trip.js";

const TRIP = GtfsScheduledTrip.simple({
  gtfsTripId: "trip-1",
  originStopId: 1,
  originationTime: GtfsStopTime.parse("00:01:00"),
  terminusStopId: 2,
  terminationTime: GtfsStopTime.parse("00:02:00"),
});

const SCHEDULE = new GtfsScheduleData([TRIP], [TRIP.calendar]);

const TRIP_DESCRIPTOR = {
  tripId: TRIP.gtfsTripId,
  routeId: TRIP.gtfsRouteId,
  startTime: TRIP.origination.departureTime,
  startDate: Temporal.PlainDate.from("2026-07-14"),
  scheduleRelationship: "SCHEDULED",
};

function expectEqualDates(
  date1: Temporal.PlainDate | null | undefined,
  date2: Temporal.PlainDate | null | undefined,
) {
  if (date1 == null || date2 == null) {
    expect(date1).toBe(date2);
  } else {
    expect(date1.equals(date2)).toBe(true);
  }
}

describe("GtfsTripUpdateTripIdentifier", () => {
  it("identifies a trip and service day from trip descriptor fields", () => {
    const errors: GtfsTripUpdateTripIdentificationError[] = [];
    const identifier = new GtfsTripUpdateTripIdentifier((e) => errors.push(e));

    const result = identifier.identify(TRIP_DESCRIPTOR, SCHEDULE);

    expect(errors).toEqual([]);
    if (result == null) throw new Error("Expected matching trip.");
    expect(result.trip.gtfsTripId).toBe(TRIP.gtfsTripId);
    expectEqualDates(result.serviceDay, TRIP_DESCRIPTOR.startDate);
  });

  it("reports missing tripId fields", () => {
    const errors: GtfsTripUpdateTripIdentificationError[] = [];
    const identifier = new GtfsTripUpdateTripIdentifier((e) => errors.push(e));

    const tripDescriptor = { ...TRIP_DESCRIPTOR, tripId: undefined };

    const result = identifier.identify(tripDescriptor, SCHEDULE);

    expect(result).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(NecessaryFieldNotInTripDescriptorError);
  });

  it("reports trip IDs that do not exist in the schedule", () => {
    const errors: GtfsTripUpdateTripIdentificationError[] = [];
    const identifier = new GtfsTripUpdateTripIdentifier((e) => errors.push(e));

    const tripDescriptor = { ...TRIP_DESCRIPTOR, tripId: "missing-trip" };
    const result = identifier.identify(tripDescriptor, SCHEDULE);

    expect(result).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(
      TripDescriptorReferencesNonExistentTripIdError,
    );
  });

  it("reports start dates where the trip does not occur", () => {
    const errors: GtfsTripUpdateTripIdentificationError[] = [];
    const identifier = new GtfsTripUpdateTripIdentifier((e) => errors.push(e));

    const neverOccurs = Temporal.PlainDate.from("2026-07-14");
    const tripOutsideDate = TRIP.with({
      calendar: new GtfsCalendar(
        "specific-date-calendar",
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        new PlainDateRange(
          Temporal.PlainDate.from("2026-07-15"),
          Temporal.PlainDate.from("2026-07-15"),
        ),
        [],
        [],
      ),
    });
    const schedule = new GtfsScheduleData(
      [tripOutsideDate],
      [tripOutsideDate.calendar],
    );

    const tripDescriptor = {
      ...TRIP_DESCRIPTOR,
      tripId: tripOutsideDate.gtfsTripId,
      startDate: neverOccurs,
    };

    const result = identifier.identify(tripDescriptor, schedule);

    expect(result).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(TripDoesNotOccurOnStartDateError);
  });

  it("identifies overnight trips where startTime is over 24:00:00", () => {
    const errors: GtfsTripUpdateTripIdentificationError[] = [];
    const identifier = new GtfsTripUpdateTripIdentifier((e) => errors.push(e));

    const overnightTrip = TRIP.with({
      movements: [
        TRIP.origination.with({
          departureTime: GtfsStopTime.parse("25:05:00"),
        }),
        TRIP.termination.with({
          arrivalTime: GtfsStopTime.parse("25:15:00"),
        }),
      ],
    });
    const schedule = new GtfsScheduleData(
      [overnightTrip],
      [overnightTrip.calendar],
    );

    const tripDescriptor = {
      ...TRIP_DESCRIPTOR,
      tripId: overnightTrip.gtfsTripId,
      startTime: GtfsStopTime.parse("25:05:00"),
    };

    const result = identifier.identify(tripDescriptor, schedule);

    expect(errors).toEqual([]);
    if (result == null) throw new Error("Expected matching trip.");
    expect(result.trip.gtfsTripId).toBe(overnightTrip.gtfsTripId);
    expect(result.serviceDay.equals(tripDescriptor.startDate)).toBe(true);
  });

  it("reports mismatching startTime values but still identifies the trip", () => {
    const errors: GtfsTripUpdateTripIdentificationError[] = [];
    const identifier = new GtfsTripUpdateTripIdentifier((e) => errors.push(e));

    const tripDescriptor = {
      ...TRIP_DESCRIPTOR,
      startTime: GtfsStopTime.parse("00:00:00"),
    };

    const result = identifier.identify(tripDescriptor, SCHEDULE);

    expect(result).not.toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(
      TripDescriptorStartTimeDoesNotMatchTripOriginStopTimeError,
    );
  });
});
