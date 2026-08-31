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

type IntegrationTestTags = Set<number>;

type IntegrationTestServiceOriginatingMovement = {
  type: "originating";
} & ServiceOriginatingMovementFields;

type IntegrationTestServiceRegularMovement = {
  type: "regular";
} & ServiceRegularMovementFields;

type IntegrationTestServiceTerminatingMovement = {
  type: "terminating";
} & ServiceTerminatingMovementFields;

type IntegrationTestServicePassingMovement = {
  type: "passing";
} & ServicePassingMovementFields;

type IntegrationTestServiceConnection = ServiceConnectionFields;
