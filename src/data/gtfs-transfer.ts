// Later if we want to support other transfer types, we can add them here!
export type GtfsTransfer = GtfsEntireVehicleFormsServiceTransfer;

type IGtfsTransfer = {
  getInvolvedTripIds(): readonly string[];
  equals(other: IGtfsTransfer): boolean;
};

type GtfsEntireVehicleFormsServiceTransferFields = {
  fromTripId: string;
  toTripId: string;
};

export class GtfsEntireVehicleFormsServiceTransfer implements IGtfsTransfer {
  readonly fromTripId: string;
  readonly toTripId: string;

  constructor(fields: GtfsEntireVehicleFormsServiceTransferFields) {
    this.fromTripId = fields.fromTripId;
    this.toTripId = fields.toTripId;
  }

  get type() {
    return "entire-vehicle-forms-service" as const;
  }

  getInvolvedTripIds(): readonly string[] {
    return [this.fromTripId, this.toTripId];
  }

  equals(other: IGtfsTransfer): boolean {
    if (!(other instanceof GtfsEntireVehicleFormsServiceTransfer)) return false;
    return (
      this.fromTripId === other.fromTripId && this.toTripId === other.toTripId
    );
  }
}
