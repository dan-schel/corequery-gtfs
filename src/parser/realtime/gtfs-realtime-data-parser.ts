import { GtfsRealtimeData } from "../../data/gtfs-realtime-data.js";
import { GtfsBrokenTransfer } from "../../data/gtfs-realtime-transfer.js";
import type { GtfsScheduleData } from "../../data/gtfs-schedule-data.js";
import { MutableGtfsTransferMapping } from "../../data/gtfs-transfer-mapping.js";
import { GtfsUpdatedTrip } from "../../data/trip/updated/gtfs-updated-trip.js";
import type { StopGtfsIdMapping } from "../../data/ids/stop-gtfs-id-mapping.js";
import type { RealtimeDataJson } from "../../data/raw/realtime-data-json.js";
import {
  GtfsTripUpdateParser,
  type GtfsTripUpdateParsingError,
} from "./gtfs-trip-update-parser.js";
import type { GtfsRealtimeTrip } from "../../data/trip/types.js";

export type GtfsRealtimeDataParserFields = {
  readonly timezone: string;
  readonly stopGtfsIdMapping: StopGtfsIdMapping;
  readonly onError: (error: GtfsRealtimeDataParsingError) => void;
};

export class GtfsRealtimeDataParser {
  private readonly _tripUpdateParser: GtfsTripUpdateParser;

  constructor(fields: GtfsRealtimeDataParserFields) {
    this._tripUpdateParser = new GtfsTripUpdateParser({
      timezone: fields.timezone,
      stopGtfsIdMapping: fields.stopGtfsIdMapping,
      onError: fields.onError,
    });
  }

  parse(
    realtimeData: RealtimeDataJson,
    scheduleData: GtfsScheduleData,
  ): GtfsRealtimeData {
    const realtimeTrips = this._parseTripUpdates(realtimeData, scheduleData);

    const brokenTransfers = this._breakTransfers(realtimeTrips, scheduleData);

    return new GtfsRealtimeData(realtimeTrips, brokenTransfers, []);
  }

  private _parseTripUpdates(
    realtimeData: RealtimeDataJson,
    scheduleData: GtfsScheduleData,
  ) {
    const realtimeTrips: GtfsRealtimeTrip[] = [];

    for (const tripUpdates of realtimeData.tripUpdates) {
      const result = this._tripUpdateParser.parse(tripUpdates, scheduleData);

      if (result != null) {
        realtimeTrips.push(result);
      }
    }

    return realtimeTrips;
  }

  private _breakTransfers(
    realtimeTrips: GtfsRealtimeTrip[],
    scheduleData: GtfsScheduleData,
  ) {
    const brokenTransfers = new MutableGtfsTransferMapping<GtfsBrokenTransfer>(
      (x) => x.transfer.getInvolvedTripIds(),
    );

    for (const trip of realtimeTrips) {
      if (trip instanceof GtfsUpdatedTrip && trip.isCancelled) {
        const transfers = scheduleData.getTransfersForTrip(trip.gtfsTripId);

        for (const transfer of transfers) {
          const brokenTransfer = new GtfsBrokenTransfer(
            transfer,
            trip.serviceDay,
          );
          const existing = brokenTransfers.forTripId(trip.gtfsTripId);
          if (!existing.some((x) => x.equals(brokenTransfer))) {
            brokenTransfers.push(brokenTransfer);
          }
        }
      }
    }

    return brokenTransfers.toArray();
  }
}

export type GtfsRealtimeDataParsingError = GtfsTripUpdateParsingError;
