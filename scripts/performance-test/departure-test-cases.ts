import type { DeparturesIterationDirection } from "../../src/corequery-types.js";

const suburbanBusyStations = [
  "Flinders Street",
  "Southern Cross",
  "Richmond",
  "North Melbourne",
  "Melbourne Central",
];

const suburbanNormalStations = [
  "Clayton",
  "Broadmeadows",
  "Box Hill",
  "Coburg",
  "Heidelberg",
  "Glen Waverley",
  "Frankston",
  "Werribee",
  "Brighton Beach",
  "Mernda",
];

const regionalBusyStations = ["Southern Cross", "Footscray"];

const regionalQuietStations = [
  "Bairnsdale",
  "Swan Hill",
  "Echuca",
  "Maryborough",
  "Albury",
  "Warrnambool",
  "Ararat",
  "Shepparton",
  "Kerang",
  "Talbot",
];

const standardDates = [
  {
    name: "Today",
    times: ["2026-10-06T20:39:00+11:00", "2026-10-07T20:39:00+11:00"],
  },
  {
    name: "One year later",
    times: ["2027-10-06T20:39:00+11:00"],
  },
  {
    name: "One year earlier",
    times: ["2025-10-06T20:39:00+11:00"],
  },
];

const categories = [
  {
    subfeed: "suburban",
    category: "Busy",
    stations: suburbanBusyStations,
    dates: [
      {
        name: "Today",
        times: [
          "2026-10-06T20:39:00+11:00",
          "2026-10-07T11:39:00+11:00",
          "2026-10-08T15:39:00+11:00",
          "2026-10-09T07:39:00+11:00",
        ],
      },
      ...standardDates.slice(1),
    ],
  },
  {
    subfeed: "regional",
    category: "Busy",
    stations: regionalBusyStations,
    dates: [
      {
        name: "Today",
        times: [
          "2026-10-06T11:39:00+11:00",
          "2026-10-06T20:39:00+11:00",
          "2026-10-07T06:39:00+11:00",
          "2026-10-07T16:39:00+11:00",
          "2026-10-08T13:39:00+11:00",
          "2026-10-08T22:39:00+11:00",
          "2026-10-09T02:39:00+11:00",
          "2026-10-09T12:39:00+11:00",
          "2026-10-10T16:39:00+11:00",
          "2026-10-10T18:39:00+11:00",
        ],
      },
      ...standardDates.slice(1),
    ],
  },
  {
    subfeed: "suburban",
    category: "Normal",
    stations: suburbanNormalStations,
    dates: standardDates,
  },
  {
    subfeed: "regional",
    category: "Quiet",
    stations: regionalQuietStations,
    dates: standardDates,
  },
] as const;

const directions: readonly DeparturesIterationDirection[] = [
  "forwards",
  "backwards",
];

export const departureTestCases = categories.flatMap((category) =>
  category.dates.flatMap((date) =>
    directions.map((direction) => ({
      name: `${category.subfeed} (${category.category})`,
      group: `${date.name} (${direction})`,
      subfeed: category.subfeed,
      stations: category.stations,
      times: date.times,
      direction,
    })),
  ),
);
