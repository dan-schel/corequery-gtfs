import type {
  TransfersCsv,
  TransfersCsvRow,
} from "../../data/raw/schedule-csvs.js";
import { GtfsScheduledTrip } from "../../data/gtfs-scheduled-trip.js";

const TRANSFER_TYPE_IN_SEAT_TRANSFER = 4;

export class GtfsTransferConnector {
  constructor(
    private readonly _onError: (error: GtfsTransferConnectionError) => void,
  ) {}

  connect(
    trips: readonly GtfsScheduledTrip[],
    transfers: TransfersCsv,
  ): readonly GtfsScheduledTrip[] {
    const tripMap = new Map<string, GtfsScheduledTrip>(
      trips.map((trip) => [trip.gtfsTripId, trip]),
    );

    for (const transfer of transfers) {
      const fromTrip = tripMap.get(transfer.from_trip_id);
      const toTrip = tripMap.get(transfer.to_trip_id);

      // TrainQuery only cares about "in-seat" transfers, because we're only
      // parsing these transfers to form trips into multiple "legs" of a
      // service, a.k.a. what I used to call continuations.
      //
      // We should ignore them, but it's not really an error. I'm just reporting
      // them because right now PTV only publishes in-seat transfers, and I'm
      // curious to see if that changes one day (e.g. with V/Line's guaranteed
      // coach connections, or coupling of trains at Ballarat).
      if (transfer.transfer_type !== TRANSFER_TYPE_IN_SEAT_TRANSFER) {
        this._onError(new TransferIsNotInSeatTransferError(transfer));
        continue;
      }

      if (fromTrip == null) {
        const Err = TransferReferencesNonExistentTrip;
        this._onError(new Err(transfer, "from_trip_id"));
        continue;
      }
      if (toTrip == null) {
        const Err = TransferReferencesNonExistentTrip;
        this._onError(new Err(transfer, "to_trip_id"));
        continue;
      }

      if (transfer.from_stop_id !== transfer.to_stop_id) {
        this._onError(new TransferIsNotSameStopAndPositionError(transfer));
        continue;
      }

      // As alluded to above, I suspect one day V/Line might make things
      // difficult if they start (accurately, to be fair) considering their
      // Maryborough shuttles as "in-seat" transfers because the trains couple
      // at Ballarat. No idea how we'd even want to _display_ those, let alone
      // model it!
      if (fromTrip.termination.gtfsIdMetadata.id !== transfer.from_stop_id) {
        this._onError(new TransferIsNotFromTerminusError(transfer, fromTrip));
        continue;
      }
      if (toTrip.origination.gtfsIdMetadata.id !== transfer.to_stop_id) {
        this._onError(new TransferIsNotToOriginError(transfer, toTrip));
        continue;
      }
      if (fromTrip.nextTrip != null) {
        const Err = TransferReferencesTripAlreadyConnectedError;
        this._onError(new Err(transfer, fromTrip));
        continue;
      }
      if (toTrip.previousTrip != null) {
        const Err = TransferReferencesTripAlreadyConnectedError;
        this._onError(new Err(transfer, toTrip));
        continue;
      }

      // TODO: I'm gonna let this one slide, so long as we remember to:
      // - When filtering out arrivals for trips which ultimately continue, make
      //   sure to check the next trip runs on that service day. ✅
      // - When building the services for corequery (either through the
      //   departures algorithm, or lookup by ID), only add the extra leg if the
      //   next trip runs on that service day.
      if (fromTrip.calendar.gtfsCalendarId !== toTrip.calendar.gtfsCalendarId) {
        this._onError(new TransferCrossesCalendarsError(transfer));
      }

      // I'm assuming transfers would only be made by trips running on the same
      // service day, not just "the next instance of this trip". If it were the
      // latter you could have a trip terminating at 24:30 connecting to a trip
      // originating at 00:32.
      //
      // (If that WERE to happen, it might be acceptable to just not connect
      // them (as we're doing now) as it'd surely only be a couple weird
      // overnight trips. Otherwise, would it be practical to shift the next
      // trip into the same service day retroactively by rewriting its departure
      // and arrival times and shifting its calendar by one day? Or would it be
      // less destructive to have some transfer metadata to say the next trip is
      // +1 day from this one.)
      const fromArrivalTime = fromTrip.termination.arrivalTime;
      const toDepartureTime = toTrip.origination.departureTime;
      if (fromArrivalTime.isAfter(toDepartureTime)) {
        this._onError(new TransferRequiresTimeTravelError(transfer));
        continue;
      }

      const [newFrom, newTo] = GtfsScheduledTrip.connectAsTransfer(
        fromTrip,
        toTrip,
      );
      tripMap.set(fromTrip.gtfsTripId, newFrom);
      tripMap.set(toTrip.gtfsTripId, newTo);
    }

    return Array.from(tripMap.values());
  }
}

export type GtfsTransferConnectionError =
  | TransferReferencesNonExistentTrip
  | TransferIsNotFromTerminusError
  | TransferIsNotToOriginError
  | TransferReferencesTripAlreadyConnectedError
  | TransferIsNotInSeatTransferError
  | TransferIsNotSameStopAndPositionError
  | TransferCrossesCalendarsError
  | TransferRequiresTimeTravelError;

export class TransferReferencesNonExistentTrip {
  readonly type = "transfer-references-non-existent-trip";
  constructor(
    readonly transfer: TransfersCsvRow,
    readonly field: "from_trip_id" | "to_trip_id",
  ) {}
}

export class TransferIsNotFromTerminusError {
  readonly type = "transfer-is-not-from-terminus";
  constructor(
    readonly transfer: TransfersCsvRow,
    readonly fromTrip: GtfsScheduledTrip,
  ) {}
}

export class TransferIsNotToOriginError {
  readonly type = "transfer-is-not-to-origin";
  constructor(
    readonly transfer: TransfersCsvRow,
    readonly toTrip: GtfsScheduledTrip,
  ) {}
}

export class TransferReferencesTripAlreadyConnectedError {
  readonly type = "transfer-references-trip-already-connected";
  constructor(
    readonly transfer: TransfersCsvRow,
    readonly tripWithExistingConnection: GtfsScheduledTrip,
  ) {}
}

export class TransferIsNotInSeatTransferError {
  readonly type = "transfer-is-not-in-seat-transfer";
  constructor(readonly transfer: TransfersCsvRow) {}
}

export class TransferIsNotSameStopAndPositionError {
  readonly type = "transfer-is-not-same-stop-and-position";
  constructor(readonly transfer: TransfersCsvRow) {}
}

export class TransferCrossesCalendarsError {
  readonly type = "transfer-crosses-calendars";
  constructor(readonly transfer: TransfersCsvRow) {}
}

export class TransferRequiresTimeTravelError {
  readonly type = "transfer-requires-time-travel";
  constructor(readonly transfer: TransfersCsvRow) {}
}
