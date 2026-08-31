import type {
  DepartureFields,
  ServiceConnectionFields,
  ServiceFields,
  ServiceOriginatingMovementFields,
  ServicePassingMovementFields,
  ServiceRegularMovementFields,
  ServiceTerminatingMovementFields,
} from "../../../../src/corequery-types.js";
import type { GtfsServiceSource } from "../../../../src/gtfs-service-source.js";

export type IntegrationTestServiceSource = GtfsServiceSource<
  IntegrationTestDeparture,
  IntegrationTestService,
  IntegrationTestTags,
  IntegrationTestServiceOriginatingMovement,
  IntegrationTestServiceRegularMovement,
  IntegrationTestServiceTerminatingMovement,
  IntegrationTestServicePassingMovement,
  IntegrationTestServiceConnection
>;

export type IntegrationTestDeparture = DepartureFields<IntegrationTestService>;

export type IntegrationTestService = ServiceFields<
  IntegrationTestTags,
  IntegrationTestServiceOriginatingMovement,
  IntegrationTestServiceRegularMovement,
  IntegrationTestServiceTerminatingMovement,
  IntegrationTestServicePassingMovement,
  IntegrationTestServiceConnection
>;

export type IntegrationTestTags = Set<number>;

export type IntegrationTestServiceOriginatingMovement = {
  type: "originating";
} & ServiceOriginatingMovementFields;

export type IntegrationTestServiceRegularMovement = {
  type: "regular";
} & ServiceRegularMovementFields;

export type IntegrationTestServiceTerminatingMovement = {
  type: "terminating";
} & ServiceTerminatingMovementFields;

export type IntegrationTestServicePassingMovement = {
  type: "passing";
} & ServicePassingMovementFields;

export type IntegrationTestServiceConnection = ServiceConnectionFields;
