// Because we don't want to depend on CoreQuery. (Just because I'm scared of
// npm's peer dependency system and don't understand how it works!)

export type Color =
  | "red"
  | "yellow"
  | "green"
  | "cyan"
  | "blue"
  | "pink"
  | "purple"
  | "gray";

export type DeparturesIterationDirection = "forwards" | "backwards";

export type DeparturesIterator<CorequeryDepartureClass> = {
  peek: () => Promise<CorequeryDepartureClass | null>;
  take: () => Promise<CorequeryDepartureClass>;
};

export type ServiceSource<CorequeryServiceClass, CorequeryDepartureClass> = {
  readonly sourceId: string;

  getService: (intrasourceId: string) => Promise<CorequeryServiceClass | null>;

  getDeparturesIterator: (
    stopId: number,
    instant: Temporal.Instant,
    direction: DeparturesIterationDirection,
  ) => DeparturesIterator<CorequeryDepartureClass>;
};

export type DepartureFields<CorequeryServiceClass> = {
  readonly service: CorequeryServiceClass;
  readonly movementIndex: number;
};

export type ServiceLiveDataType = "scheduled" | "updated" | "added";

export type ServiceFields<
  CorequeryTagsClass,
  CorequeryServiceOriginatingMovementClass,
  CorequeryServicePassingMovementClass,
  CorequeryServiceRegularMovementClass,
  CorequeryServiceTerminatingMovementClass,
  CorequeryServiceConnectionClass,
> = {
  readonly sourceId: string;
  readonly intrasourceId: string;

  readonly lineIds: readonly number[];
  readonly tags: CorequeryTagsClass;
  readonly color: Color | null;

  readonly liveDataType: ServiceLiveDataType;
  readonly movements: readonly CorequeryServiceMovementClasses<
    CorequeryServiceOriginatingMovementClass,
    CorequeryServicePassingMovementClass,
    CorequeryServiceRegularMovementClass,
    CorequeryServiceTerminatingMovementClass
  >[];
  readonly isCancelled: boolean;

  readonly connections: readonly CorequeryServiceConnectionClass[];
};

export type ServiceConnectionType = "entire-vehicle-forms-service" | "other";

export type ServiceConnectionDirection =
  | "from-other"
  | "to-other"
  | "bidirectional";

export type ServiceConnectionFields = {
  readonly type: ServiceConnectionType;
  readonly direction: ServiceConnectionDirection;
  readonly otherServiceSourceId: string;
  readonly otherServiceIntrasourceId: string;

  readonly movementIndex: number;
  readonly otherServiceMovementIndex: number;
};

// This is probably the dumbest code you've ever seen, but you've got to admire
// my commitment to the bit, surely.
export type CorequeryServiceMovementClasses<
  CorequeryServiceOriginatingMovementClass,
  CorequeryServicePassingMovementClass,
  CorequeryServiceRegularMovementClass,
  CorequeryServiceTerminatingMovementClass,
> =
  | CorequeryServiceOriginatingMovementClass
  | CorequeryServicePassingMovementClass
  | CorequeryServiceRegularMovementClass
  | CorequeryServiceTerminatingMovementClass;

export type ServiceTimeType =
  | "scheduled-time"
  | "provided-live-time"
  | "interpolated-live-time";

export type ServiceOriginatingMovementFields = {
  readonly stopId: number;
  readonly originalPositionId: number | null;
  readonly updatedPositionId: number | null;

  readonly departureTimeType: ServiceTimeType;
  readonly departureTime: Temporal.Instant;
  readonly formerDepartureTime: Temporal.Instant | null;
};

export type ServicePassingMovementFields = {
  readonly stopId: number;
};

export type ServiceRegularMovementFields = {
  readonly stopId: number;
  readonly originalPositionId: number | null;
  readonly updatedPositionId: number | null;

  readonly arrivalTimeType: ServiceTimeType;
  readonly arrivalTime: Temporal.Instant;
  readonly formerArrivalTime: Temporal.Instant | null;

  readonly departureTimeType: ServiceTimeType;
  readonly departureTime: Temporal.Instant;
  readonly formerDepartureTime: Temporal.Instant | null;

  readonly picksUp: boolean;
  readonly dropsOff: boolean;
};

export type ServiceTerminatingMovementFields = {
  readonly stopId: number;
  readonly originalPositionId: number | null;
  readonly updatedPositionId: number | null;

  readonly arrivalTimeType: ServiceTimeType;
  readonly arrivalTime: Temporal.Instant;
  readonly formerArrivalTime: Temporal.Instant | null;
};
