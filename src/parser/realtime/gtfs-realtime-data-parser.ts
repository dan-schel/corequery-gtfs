import { GtfsRealtimeData } from "../../data/gtfs-realtime-data.js";
import { GtfsBrokenTransfer } from "../../data/gtfs-realtime-transfer.js";
import type { GtfsScheduleData } from "../../data/gtfs-schedule-data.js";
import { MutableGtfsTransferMapping } from "../../data/gtfs-transfer-mapping.js";
import type { GtfsUpdatedTrip } from "../../data/trip/updated/gtfs-updated-trip.js";
import type { StopGtfsIdMapping } from "../../data/ids/stop-gtfs-id-mapping.js";
import type { RealtimeDataJson } from "../../data/raw/realtime-data-json.js";
import {
  GtfsTripUpdateParser,
  type GtfsTripUpdateParsingError,
} from "./gtfs-trip-update-parser.js";

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
    const updatedTrips = this._parseTripUpdates(realtimeData, scheduleData);

    const brokenTransfers = this._breakTransfers(updatedTrips, scheduleData);

    return new GtfsRealtimeData(updatedTrips, brokenTransfers, []);
  }

  private _parseTripUpdates(
    realtimeData: RealtimeDataJson,
    scheduleData: GtfsScheduleData,
  ) {
    const updatedTrips: GtfsUpdatedTrip[] = [];

    for (const tripUpdates of realtimeData.tripUpdates) {
      const result = this._tripUpdateParser.parse(tripUpdates, scheduleData);

      if (result != null) {
        updatedTrips.push(result);
      }
    }

    return updatedTrips;
  }

  private _breakTransfers(
    updatedTrips: GtfsUpdatedTrip[],
    scheduleData: GtfsScheduleData,
  ) {
    const brokenTransfers = new MutableGtfsTransferMapping<GtfsBrokenTransfer>(
      (x) => x.transfer.getInvolvedTripIds(),
    );

    for (const updatedTrip of updatedTrips) {
      if (updatedTrip.isCancelled) {
        const transfers = scheduleData.getTransfersForTrip(
          updatedTrip.gtfsTripId,
        );

        for (const transfer of transfers) {
          const brokenTransfer = new GtfsBrokenTransfer(
            transfer,
            updatedTrip.serviceDay,
          );
          const existing = brokenTransfers.forTripId(updatedTrip.gtfsTripId);
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
