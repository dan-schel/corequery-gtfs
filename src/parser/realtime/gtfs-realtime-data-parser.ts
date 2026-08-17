import { GtfsRealtimeData } from "../../data/gtfs-realtime-data.js";
import type { GtfsScheduleData } from "../../data/gtfs-schedule-data.js";
import type { GtfsUpdatedTrip } from "../../data/gtfs-updated-trip.js";
import type { StopGtfsIdMapping } from "../../data/ids/stop-gtfs-id-mapping.js";
import type { RealtimeDataJson } from "../../data/raw/realtime-data-json.js";
import {
  GtfsTripUpdateParser,
  type GtfsTripUpdateParsingError,
} from "./gtfs-trip-update-parser.js";

export class GtfsRealtimeDataParser {
  private readonly _tripUpdateParser: GtfsTripUpdateParser;

  constructor(
    timezone: string,
    onError: (error: GtfsRealtimeDataParsingError) => void,
  ) {
    this._tripUpdateParser = new GtfsTripUpdateParser(timezone, onError);
  }

  parse(
    realtimeData: RealtimeDataJson,
    scheduleData: GtfsScheduleData,
    stopGtfsIdMapping: StopGtfsIdMapping,
  ): GtfsRealtimeData {
    const updatedTrips: GtfsUpdatedTrip[] = [];

    for (const tripUpdates of realtimeData.tripUpdates) {
      const result = this._tripUpdateParser.parse(
        tripUpdates,
        scheduleData,
        stopGtfsIdMapping,
      );

      if (result != null) {
        updatedTrips.push(result);
      }
    }

    return new GtfsRealtimeData(updatedTrips);
  }
}

export type GtfsRealtimeDataParsingError = GtfsTripUpdateParsingError;
