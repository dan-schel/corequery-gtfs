import type { StopGtfsIdMetadata } from "./ids/stop-gtfs-id-metadata.js";

export type GtfsUpdatedTripMovement =
  | GtfsUpdatedTripOriginatingMovement
  | GtfsUpdatedTripRegularMovement
  | GtfsUpdatedTripTerminatingMovement
  | GtfsUpdatedTripPassingMovement;

export type GtfsUpdatedTripServicingMovement =
  | GtfsUpdatedTripOriginatingMovement
  | GtfsUpdatedTripRegularMovement
  | GtfsUpdatedTripTerminatingMovement;

// I don't normally use interfaces, but here they're just acting as a way to
// force the classes to conform to a particular consistent set of properties,
// while stilll allowing them to further narrow the type, e.g. the `type`
// property isn't generically typed as `string` as it would be if I used an
// abstract class.
interface IGtfsUpdatedTripMovement {
  readonly stopId: number;

  get type(): string;
  get isServicing(): boolean;
  get isNonTerminal(): boolean;
}
interface IGtfsUpdatedTripServicingMovement extends IGtfsUpdatedTripMovement {
  // Original & updated to support platform changes. Can be removed in favour of
  // just having `positionId` and `gtfsIdMetadata` like the scheduled movements
  // have if it turns out PTV don't actually do platform changes like this (e.g.
  // they just remove this trip and create a new "ADDED" one instead, idk).
  readonly originalPositionId: number | null;
  readonly updatedPositionId: number | null;
  readonly originalGtfsIdMetadata: StopGtfsIdMetadata;
  readonly updatedGtfsIdMetadata: StopGtfsIdMetadata;

  readonly gtfsStopSequence: number;

  // Note: This isn't really set up to support route changes, because surely in
  // that situation you'd provide a whole new movements array. If you didn't,
  // there wouldn't be anything reasonable to put in the scheduled/original
  // fields, as the movements list might not even be the same length, and even
  // if it was, there wouldn't really be any relationship between the original
  // movements and new ones if it's a different route. Come to think of it, the
  // line and service tags might change too (East Pakenham train diverted to
  // Cranbourne or terminating early at Dandenong), so lots of additional fields
  // required. Would we modify GtfsUpdatedTrip to support it, or create a new
  // GtfsReroutedTrip, so you could have movements without any
  // scheduled/original fields. (By the same argument, maybe we should have
  // GtfsCancelledTrip, instead of the `isCancelled` field.)

  get isServicing(): true;
  get timeRelevantToDeparturesAlgorithm(): Temporal.Instant;
  get realtimeTimeRelevantToDeparturesAlgorithm(): Temporal.Instant | null;
  get scheduledTimeRelevantToDeparturesAlgorithm(): Temporal.Instant;
}

type GtfsUpdatedTripOriginatingMovementFields = {
  readonly stopId: number;
  readonly originalPositionId: number | null;
  readonly updatedPositionId: number | null;
  readonly scheduledDepartureTime: Temporal.Instant;

  // TODO: We need to distinguish between knownRealtimeDepartureTime and
  // assumedRealtimeDepartureTime. Only the assumed time will be available when
  // incomplete realtime data is provided, and will be calculated based on the
  // delta between scheduled and realtime departure times of the nearest known
  // realtime departure time.
  readonly realtimeDepartureTime: Temporal.Instant | null;

  readonly originalGtfsIdMetadata: StopGtfsIdMetadata;
  readonly updatedGtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;
};

type GtfsUpdatedTripRegularMovementFields = {
  readonly stopId: number;
  readonly originalPositionId: number | null;
  readonly updatedPositionId: number | null;
  readonly scheduledArrivalTime: Temporal.Instant;
  readonly realtimeArrivalTime: Temporal.Instant | null;
  readonly scheduledDepartureTime: Temporal.Instant;
  readonly realtimeDepartureTime: Temporal.Instant | null;
  readonly picksUp: boolean;
  readonly dropsOff: boolean;
  readonly originalGtfsIdMetadata: StopGtfsIdMetadata;
  readonly updatedGtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;
};

type GtfsUpdatedTripTerminatingMovementFields = {
  readonly stopId: number;
  readonly originalPositionId: number | null;
  readonly updatedPositionId: number | null;
  readonly scheduledArrivalTime: Temporal.Instant;
  readonly realtimeArrivalTime: Temporal.Instant | null;
  readonly originalGtfsIdMetadata: StopGtfsIdMetadata;
  readonly updatedGtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;
};

type GtfsUpdatedTripPassingMovementFields = {
  readonly stopId: number;
};

export class GtfsUpdatedTripOriginatingMovement implements IGtfsUpdatedTripServicingMovement {
  readonly stopId: number;
  readonly originalPositionId: number | null;
  readonly updatedPositionId: number | null;
  readonly scheduledDepartureTime: Temporal.Instant;
  readonly realtimeDepartureTime: Temporal.Instant | null;
  readonly originalGtfsIdMetadata: StopGtfsIdMetadata;
  readonly updatedGtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;

  constructor(fields: GtfsUpdatedTripOriginatingMovementFields) {
    this.stopId = fields.stopId;
    this.originalPositionId = fields.originalPositionId;
    this.updatedPositionId = fields.updatedPositionId;
    this.scheduledDepartureTime = fields.scheduledDepartureTime;
    this.realtimeDepartureTime = fields.realtimeDepartureTime;
    this.originalGtfsIdMetadata = fields.originalGtfsIdMetadata;
    this.updatedGtfsIdMetadata = fields.updatedGtfsIdMetadata;
    this.gtfsStopSequence = fields.gtfsStopSequence;
  }

  with(
    newValues: Partial<GtfsUpdatedTripOriginatingMovementFields>,
  ): GtfsUpdatedTripOriginatingMovement {
    return new GtfsUpdatedTripOriginatingMovement({ ...this, ...newValues });
  }

  get type() {
    return "originating" as const;
  }
  get isServicing() {
    return true as const;
  }
  get isNonTerminal() {
    return false as const;
  }
  get timeRelevantToDeparturesAlgorithm() {
    return this.realtimeDepartureTime ?? this.scheduledDepartureTime;
  }
  get realtimeTimeRelevantToDeparturesAlgorithm() {
    return this.realtimeDepartureTime;
  }
  get scheduledTimeRelevantToDeparturesAlgorithm() {
    return this.scheduledDepartureTime;
  }
}

export class GtfsUpdatedTripRegularMovement implements IGtfsUpdatedTripServicingMovement {
  readonly stopId: number;
  readonly originalPositionId: number | null;
  readonly updatedPositionId: number | null;
  readonly scheduledArrivalTime: Temporal.Instant;
  readonly realtimeArrivalTime: Temporal.Instant | null;
  readonly scheduledDepartureTime: Temporal.Instant;
  readonly realtimeDepartureTime: Temporal.Instant | null;
  readonly picksUp: boolean;
  readonly dropsOff: boolean;
  readonly originalGtfsIdMetadata: StopGtfsIdMetadata;
  readonly updatedGtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;

  constructor(fields: GtfsUpdatedTripRegularMovementFields) {
    this.stopId = fields.stopId;
    this.originalPositionId = fields.originalPositionId;
    this.updatedPositionId = fields.updatedPositionId;
    this.scheduledArrivalTime = fields.scheduledArrivalTime;
    this.realtimeArrivalTime = fields.realtimeArrivalTime;
    this.scheduledDepartureTime = fields.scheduledDepartureTime;
    this.realtimeDepartureTime = fields.realtimeDepartureTime;
    this.picksUp = fields.picksUp;
    this.dropsOff = fields.dropsOff;
    this.originalGtfsIdMetadata = fields.originalGtfsIdMetadata;
    this.updatedGtfsIdMetadata = fields.updatedGtfsIdMetadata;
    this.gtfsStopSequence = fields.gtfsStopSequence;
  }

  with(
    newValues: Partial<GtfsUpdatedTripRegularMovementFields>,
  ): GtfsUpdatedTripRegularMovement {
    return new GtfsUpdatedTripRegularMovement({ ...this, ...newValues });
  }

  get type() {
    return "regular" as const;
  }
  get isServicing() {
    return true as const;
  }
  get isNonTerminal() {
    return true as const;
  }
  get timeRelevantToDeparturesAlgorithm() {
    return this.realtimeDepartureTime ?? this.scheduledDepartureTime;
  }
  get realtimeTimeRelevantToDeparturesAlgorithm() {
    return this.realtimeDepartureTime;
  }
  get scheduledTimeRelevantToDeparturesAlgorithm() {
    return this.scheduledDepartureTime;
  }
}

export class GtfsUpdatedTripTerminatingMovement implements IGtfsUpdatedTripServicingMovement {
  readonly stopId: number;
  readonly originalPositionId: number | null;
  readonly updatedPositionId: number | null;
  readonly scheduledArrivalTime: Temporal.Instant;
  readonly realtimeArrivalTime: Temporal.Instant | null;
  readonly originalGtfsIdMetadata: StopGtfsIdMetadata;
  readonly updatedGtfsIdMetadata: StopGtfsIdMetadata;
  readonly gtfsStopSequence: number;

  constructor(fields: GtfsUpdatedTripTerminatingMovementFields) {
    this.stopId = fields.stopId;
    this.originalPositionId = fields.originalPositionId;
    this.updatedPositionId = fields.updatedPositionId;
    this.scheduledArrivalTime = fields.scheduledArrivalTime;
    this.realtimeArrivalTime = fields.realtimeArrivalTime;
    this.originalGtfsIdMetadata = fields.originalGtfsIdMetadata;
    this.updatedGtfsIdMetadata = fields.updatedGtfsIdMetadata;
    this.gtfsStopSequence = fields.gtfsStopSequence;
  }

  with(
    newValues: Partial<GtfsUpdatedTripTerminatingMovementFields>,
  ): GtfsUpdatedTripTerminatingMovement {
    return new GtfsUpdatedTripTerminatingMovement({ ...this, ...newValues });
  }

  get type() {
    return "terminating" as const;
  }
  get isServicing() {
    return true as const;
  }
  get isNonTerminal() {
    return false as const;
  }
  get timeRelevantToDeparturesAlgorithm() {
    return this.realtimeArrivalTime ?? this.scheduledArrivalTime;
  }
  get realtimeTimeRelevantToDeparturesAlgorithm() {
    return this.realtimeArrivalTime;
  }
  get scheduledTimeRelevantToDeparturesAlgorithm() {
    return this.scheduledArrivalTime;
  }
}

export class GtfsUpdatedTripPassingMovement implements IGtfsUpdatedTripMovement {
  readonly stopId: number;

  constructor(fields: GtfsUpdatedTripPassingMovementFields) {
    this.stopId = fields.stopId;
  }

  with(
    newValues: Partial<GtfsUpdatedTripPassingMovementFields>,
  ): GtfsUpdatedTripPassingMovement {
    return new GtfsUpdatedTripPassingMovement({ ...this, ...newValues });
  }

  get type() {
    return "passing" as const;
  }
  get isServicing() {
    return false as const;
  }
  get isNonTerminal() {
    return true as const;
  }
}
