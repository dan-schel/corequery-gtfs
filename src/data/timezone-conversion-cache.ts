import { itsOk } from "@dan-schel/js-utils";

type TimezoneConversionData = {
  readonly midnightUtc: Temporal.Instant;
  readonly offsetSeconds: number;
};

// The number of timezones in use by a corequery-gtfs consumer will be finite
// (each GtfsSystem can only have one), but the number of service days can be
// infinite, at least, if the server is running long enough!
const MAX_CACHE_SIZE = 100;

export class TimezoneConversionCache {
  private readonly _cache: Map<string, Map<string, TimezoneConversionData>>;

  constructor() {
    this._cache = new Map();
  }

  get(
    serviceDay: Temporal.PlainDate,
    timezone: string,
  ): TimezoneConversionData {
    const serviceDayKey = serviceDay.toJSON();
    const cachedData = this._cache.get(timezone)?.get(serviceDayKey);
    if (cachedData != null) return cachedData;

    const data = TimezoneConversionCache._calculate(serviceDay, timezone);
    this._write(serviceDayKey, timezone, data);

    return data;
  }

  private _write(
    serviceDayKey: string,
    timezone: string,
    data: TimezoneConversionData,
  ) {
    let timezoneCache = this._cache.get(timezone);

    if (timezoneCache == null) {
      timezoneCache = new Map();
      this._cache.set(timezone, timezoneCache);
    }

    timezoneCache.set(serviceDayKey, data);

    if (timezoneCache.size > MAX_CACHE_SIZE) {
      // Delete the oldest value.
      const firstKey = itsOk(timezoneCache.keys().next().value);
      timezoneCache.delete(firstKey);
    }
  }

  private static _calculate(serviceDay: Temporal.PlainDate, timezone: string) {
    return {
      midnightUtc: this._calculateMidnightUtc(serviceDay),
      offsetSeconds: this._calculateOffsetSeconds(serviceDay, timezone),
    };
  }

  private static _calculateMidnightUtc(
    serviceDay: Temporal.PlainDate,
  ): Temporal.Instant {
    return serviceDay.toZonedDateTime("UTC").toInstant();
  }

  private static _calculateOffsetSeconds(
    date: Temporal.PlainDate,
    timezone: string,
  ): number {
    const nanoseconds = Temporal.ZonedDateTime.from(
      {
        timeZone: timezone,
        year: date.year,
        month: date.month,
        day: date.day,
        hour: 12,
        minute: 0,
      },
      {
        // Throws an error if this is ambiguous (just like 2:30am can be
        // ambiguous during DST changes in Melbourne). The GTFS spec operates on
        // the timezone as at 12pm that day, as do we, and so that should mean
        // it's never a problem (both for Melbourne, and elsewhere).
        disambiguation: "reject",
      },
    ).offsetNanoseconds;

    return nanoseconds / 1_000_000_000;
  }
}
