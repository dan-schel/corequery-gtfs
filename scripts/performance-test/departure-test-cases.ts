import type { DeparturesIterationDirection } from "../../src/corequery-types.js";

const suburbanBusyStations = [
  "Flinders Street",
  "Southern Cross",
  "Richmond",
  "Town Hall",
  "North Melbourne",
  "Footscray",
  "Parliament",
  "Melbourne Central",
  "Flagstaff",
  "Caulfield",
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

const regionalBusyStations = [
  "Southern Cross",
  "Tarneit",
  "Footscray",
  "Sunshine",
  "Deer Park",
  "Geelong",
  "Melton",
  "Bendigo",
  "Seymour",
  "Traralgon",
];

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

const dates = [
  {
    name: "Today",
    times: ["2026-10-07T20:39:00+11:00", "2026-10-06T20:39:00+11:00"],
  },
  {
    name: "One year later",
    times: ["2027-10-07T20:39:00+11:00", "2027-10-06T20:39:00+11:00"],
  },
  {
    name: "One year earlier",
    times: ["2025-10-07T20:39:00+11:00", "2025-10-06T20:39:00+11:00"],
  },
];

const categories = [
  {
    subfeed: "suburban",
    category: "Busy",
    stations: suburbanBusyStations,
    dates: dates,
  },
  {
    subfeed: "suburban",
    category: "Normal",
    stations: suburbanNormalStations,
    dates: dates,
  },
  {
    subfeed: "regional",
    category: "Busy",
    stations: regionalBusyStations,
    dates: dates,
  },
  {
    subfeed: "regional",
    category: "Quiet",
    stations: regionalQuietStations,
    dates: dates,
  },
] as const;

const directions: readonly DeparturesIterationDirection[] = [
  "forwards",
  "backwards",
];

export const departureTestCases = categories.flatMap((category) =>
  directions.flatMap((direction) =>
    category.dates.map((date) => ({
      name: `${category.subfeed} (${category.category})`,
      group: `${date.name} (${direction})`,
      subfeed: category.subfeed,
      stations: category.stations,
      times: date.times,
      direction,
    })),
  ),
);
