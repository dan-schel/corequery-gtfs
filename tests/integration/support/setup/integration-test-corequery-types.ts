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

export type IntegrationTestServiceOriginatingMovement =
  ServiceOriginatingMovementFields;

export type IntegrationTestServiceRegularMovement =
  ServiceRegularMovementFields;

export type IntegrationTestServiceTerminatingMovement =
  ServiceTerminatingMovementFields;

export type IntegrationTestServicePassingMovement =
  ServicePassingMovementFields;

export type IntegrationTestServiceConnection = ServiceConnectionFields;
