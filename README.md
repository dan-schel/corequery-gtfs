# CoreQuery GTFS

[![codecov](https://codecov.io/gh/dan-schel/corequery-gtfs/graph/badge.svg?token=y1KwQPfPen)](https://codecov.io/gh/dan-schel/corequery-gtfs)

Library for parsing services from GTFS feeds for [CoreQuery](https://github.com/dan-schel/corequery).

## Basic usage

Setting up CoreQuery GTFS looks something like this:

> [!NOTE]
> While CoreQuery GTFS will handle the trip parsing, you are required to write your own logic for fetching the schedule and reading the CSV files into JS objects, as well as fetching the realtime feed and converting it from Protobuf binary data into JSON form.

```ts
import {
  GtfsSystem,
  type GtfsConfig,
  type GtfsFeedCsv,
  type RealtimeDataJson,
} from "corequery-gtfs";

// Configure and construct a `GtfsSystem`, which is the primary interface for
// CoreQuery GTFS.
const config: GtfsConfig = {/* ... */};
const gtfsSystem = GtfsSystem.build(config);

async function fetchGtfsScheduleData(): Promise<GtfsFeedCsv> {
  // TODO: Download the schedule data zip, and read the CSV inside
  // (see GtfsFeedCsv for the required format).
}

async function fetchGtfsRealtimeData(): Promise<RealtimeDataJson> {
  // TODO: Fetch from the realtime feed and convert it into JSON form
  // (see RealtimeDataJson for the required format).
}

// Then, when an update to the GTFS schedule data is available, run:
const scheduleData = await fetchGtfsScheduleData();
const realtimeData = await fetchGtfsRealtimeData();
gtfsSystem.onNewScheduleData(scheduleData, realtimeData);

// And when an update to the GTFS realtime data is available, but the schedule
// data is still the same, run:
const realtimeData = await fetchGtfsRealtimeData();
gtfsSystem.onNewRealtimeData(realtimeData);
```

Once setup, you can pass a `GtfsServiceSource` instance to CoreQuery as a service source:

```ts
import {
  Corequery,
  Departure,
  Service,
  Tags,
  ServiceOriginatingMovement,
  ServiceRegularMovement,
  ServiceTerminatingMovement,
  ServicePassingMovement,
  EntireVehicleFormsServiceConnection,
  GenericConnection,
} from "corequery";
import { GtfsServiceSource } from "corequery-gtfs";

const serviceSource = new GtfsServiceSource<
  Departure,
  Service,
  Tags,
  ServiceOriginatingMovement,
  ServiceRegularMovement,
  ServiceTerminatingMovement,
  ServicePassingMovement,
  EntireVehicleFormsServiceConnection,
  GenericConnection
>({
  // If you use multiple service sources in your CoreQuery app (e.g. you have
  // multiple GTFS feeds from different operators to combine), each one needs a
  // unique ID.
  sourceId: "gtfs",

  // As built above.
  gtfsSystem: gtfsSystem,

  // GTFS data can be unbounded, so if you're querying for departures and
  // filtering the result, you could end up with an infinite loop. Set this to
  // `null` if you're brave, otherwise a reasonable limit (e.g. 14 days) can
  // prevent your server iterating for ages in the hopes of finding some
  // theoretical next future departure!
  departureIterationLimitHours: 14 * 24,

  // The corequery-gtfs package has no dependency on corequery itself, and
  // therefore cannot instantiate CoreQuery classes directly. This enables it
  // to, via dependency injection.
  buildDeparture: (x) => new Departure(x),
  buildService: (x) => new Service(x),
  buildTags: (x) => new Tags(x),
  buildServiceOriginatingMovement: (x) => new ServiceOriginatingMovement(x),
  buildServiceRegularMovement: (x) => new ServiceRegularMovement(x),
  buildServiceTerminatingMovement: (x) => new ServiceTerminatingMovement(x),
  buildServicePassingMovement: (x) => new ServicePassingMovement(x),
  buildServiceEntireVehicleFormsConnection: (x) =>
    new EntireVehicleFormsServiceConnection(x),
  buildServiceGenericConnection: (x) => new GenericConnection(x),
});

const app = new Corequery((app) => ({
  // See https://github.com/dan-schel/corequery for more information on
  // configuring CoreQuery.
  stops: [/* ... */],
  lines: [/* ... */],

  // ...

  serviceSources: [serviceSource],
}));

// Start the CoreQuery server.
await app.start();
```

## Config

A `GtfsSystem` is configured with 6 fields, 2 of which are optional:

```ts
const config: GtfsConfig = {
  // Maps GTFS route IDs to the line IDs used by your CoreQuery system, e.g.
  // "aus:vic:vic-01-TRN:" in GTFS means Gippsland line (CoreQuery ID #6).
  lineGtfsIds: {/* ... */},

  // Maps GTFS stop IDs to the stop IDs used by your CoreQuery system, e.g.
  // "nsw:rail:ABY" in GTFS means Albury station (CoreQuery ID #4).
  stopGtfsIds: {/* ... */},

  // A list of which stops can appear on each line, and in what order. Trips in
  // a GTFS schedule only list the served stops. With the concept of "routes",
  // every trip must match a route, and any stops which appear in the route
  // between stops listed in the GTFS trip will be added as "passing" (a.k.a.
  // express) movements.
  lineRoutesMapping: {/* ... */},

  // When a trip is matched to a route on a particular line, this mapping
  // specifies which other "bonus" lines the trip could also be on. (This field
  // is optional.)
  //
  // For example, a trip with a route ID of "aus:vic:vic-02-PKM:" will be parsed
  // against routes on the Pakenham line, but it might be the case that the trip
  // could also be considered a Cranbourne line service if it exclusively runs
  // on the section both lines share.
  //
  // Once a successful match is made on the primary line, this mapping tells
  // CoreQuery GTFS which other lines to try matching against. Depending on the
  // configuration, the bonus line ID will either replace or be appended to the
  // list of line IDs associated with the trip.
  bonusLinesMapping: {/* ... */},

  // Details about the timezone of the GTFS schedule data.
  timezoneConfig: {/* ... */},

  // Controls how realtime delays are interpolated between given updated times.
  // (This field is optional. If omitted, `follow-spec` is used by default.)
  interpolationMode: "follow-spec",
};
```

### `lineGtfsIds`

Maps GTFS route IDs to the line IDs used by your CoreQuery system, e.g. `aus:vic:vic-02-SHM:` in GTFS means Sandringham line (CoreQuery ID `#1`).

```ts
const config: GtfsConfig = {
  lineGtfsIds: {
    1: {
      general: ["aus:vic:vic-02-SHM:"],

      // Any trips using this GTFS route ID will be ignored, e.g. replacement buses.
      ignored: ["aus:vic:vic-02-SHM-R:"],
    },

    // ...
  },

  // ...
};
```

### `stopGtfsIds`

Maps GTFS stop IDs to the stop IDs used by your CoreQuery system, e.g. `vic:rail:ACF`, `13738`, and `13739` in GTFS all mean Aircraft station (CoreQuery ID `#1`).

```ts
const config: GtfsConfig = {
  stopGtfsIds: {
    1: {
      // Trips using GTFS stop ID "vic:rail:ACF" will still be associated with
      // Aircraft station, but will have no position ID at this stop, i.e. the
      // platform will be considered unknown.
      general: ["vic:rail:ACF"],

      positional: {
        // Trips using GTFS stop ID "13738" will be associated with position #51
        // ("Platform 1").
        51: ["13738"],

        // Trips using GTFS stop ID "13739" will be associated with position #52
        // ("Platform 2").
        52: ["13739"],
      },
    },

    // ...
  },

  // ...
};
```

### `lineRoutesMapping`

A list of which stops can appear on each line, and in what order. Trips in a GTFS schedule only list the served stops. With the concept of "routes", every trip must match a route, and any stops which appear in the route between stops listed in the GTFS trip will be added as "passing" (a.k.a. express) movements.

```ts
const config: GtfsConfig = {
  lineRoutesMapping: {
    1: [
      {
        // Note that `stopId` here is the CoreQuery ID, not the GTFS stop ID.
        //
        // Anything marked `collapseInStoppingPatterns: true` means services
        // on this route CAN include this stop, but if they don't, we won't
        // show it as an express movement, it'll be "collapsed" (hidden).
        //
        // For example, the Gippsland line doesn't really include East
        // Pakenham as a regular stop, so we don't want all normal services to
        // say "runs express through East Pakenham", but it's fairly common
        // that during disruptions, Gippsland line trains start and end at
        // East Pakenham, so we only show East Pakenham as a stop when it's
        // actually served.
        stops: [
          { stopId: 240, collapseInStoppingPatterns: false },
          { stopId: 123, collapseInStoppingPatterns: false },
          { stopId: 38, collapseInStoppingPatterns: false },
          { stopId: 178, collapseInStoppingPatterns: false },
          { stopId: 202, collapseInStoppingPatterns: false },
          { stopId: 107, collapseInStoppingPatterns: false },
          { stopId: 92, collapseInStoppingPatterns: false },
          { stopId: 228, collapseInStoppingPatterns: false },
          { stopId: 18, collapseInStoppingPatterns: false },
          { stopId: 307, collapseInStoppingPatterns: false },
          { stopId: 219, collapseInStoppingPatterns: false },
          { stopId: 252, collapseInStoppingPatterns: false },
          { stopId: 224, collapseInStoppingPatterns: false },
          { stopId: 104, collapseInStoppingPatterns: false },
        ],

        // Give metadata for any GTFS trips which match this route. Remember
        // that CoreQuery allows services to have colors, independently of the
        // line color, or line diagram color. We can use service tag #1 to mean
        // "Citybound", and then enable filtering by service tag in CoreQuery.
        color: "pink",
        serviceTags: [1],
      },

      // A route is not bidirectional. If services run in the other direction,
      // too, define a second route.
      {
        stops: [
          { stopId: 104, collapseInStoppingPatterns: false },
          { stopId: 224, collapseInStoppingPatterns: false },
          { stopId: 252, collapseInStoppingPatterns: false },
          { stopId: 219, collapseInStoppingPatterns: false },
          { stopId: 307, collapseInStoppingPatterns: false },
          { stopId: 18, collapseInStoppingPatterns: false },
          { stopId: 228, collapseInStoppingPatterns: false },
          { stopId: 92, collapseInStoppingPatterns: false },
          { stopId: 107, collapseInStoppingPatterns: false },
          { stopId: 202, collapseInStoppingPatterns: false },
          { stopId: 178, collapseInStoppingPatterns: false },
          { stopId: 38, collapseInStoppingPatterns: false },
          { stopId: 123, collapseInStoppingPatterns: false },
          { stopId: 240, collapseInStoppingPatterns: false },
        ],
        color: "pink",

        // We'll use service tag #2 to mean "Outbound".
        serviceTags: [2],
      },
    ],
  },

  // ...
};
```

### `bonusLinesMapping`

When a trip is matched to a route on a particular line, this mapping specifies which other "bonus" lines the trip could also be on. (This field is optional.)

For example, a trip with a route ID of "aus:vic:vic-02-PKM:" will be parsed against routes on the Pakenham line, but it might be the case that the trip could also be considered a Cranbourne line service if it exclusively runs on the section both lines share.

Once a successful match is made on the primary line, this mapping tells CoreQuery GTFS which other lines to try matching against. Depending on the configuration, the bonus line ID will either replace or be appended to the list of line IDs associated with the trip.

```ts
const config: GtfsConfig = {
  bonusLinesMapping: {
    // Add mode: Services designated as Cranbourne line (CoreQuery ID #4)
    // services are eligible to be considered Pakenham line (CoreQuery ID #5)
    // services if they also match a Pakenham line route.
    4: {
      mode: "add",
      lines: [5],
    },

    // Replace mode: Services designated as Flemington Racecourse line
    // (CoreQuery ID #16) services, but which also match Upfield line (CoreQuery
    // ID #13) and/or Craigieburn line (CoreQuery ID #14) routes will NOT be
    // considered Flemington Racecourse line services anymore, and will instead
    // be associated with the line/lines that matched.
    16: {
      mode: "replace",
      lines: [14, 13],
    },

    // ...
  },

  // ...
};
```

### `timezoneConfig`

Details about the timezone of the GTFS schedule data.

```ts
const config: GtfsConfig = {
  timezoneConfig: {
    // Which IANA timezone the GTFS schedule data is given in. As per the GTFS
    // spec, all trips listed for a particular "service day" will use the
    // timezone offset of this timezone as at 12 noon local time that day.
    timezone: "Australia/Melbourne",

    // The minimum and maximum viable timezone offsets that the above timezone
    // can be in. Consumer apps are asked to provide these to enable a small
    // optimization in the departure iteration code. Err on the side of caution,
    // as being too narrow could result in services being skipped during
    // iteration.
    //
    // E.g. Australia/Melbourne is +10 in AEST and +11 in AEDT, and is only ever
    // within that range.
    minimumViableOffsetSeconds: 10 * 60 * 60,
    maximumViableOffsetSeconds: 11 * 60 * 60,
  },

  // ...
};
```

### `interpolationMode`

Controls how realtime delays are interpolated between given updated times. (This field is optional. If omitted, `follow-spec` is used by default.)

- `follow-spec` carries known delays forward between updated stops.
- `lerp` linearly interpolates delays between known updates.

Both modes extrapolate the nearest known delay to stops before the first and after the last given updates.
