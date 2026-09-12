export class CorequeryIntrasourceId {
  constructor(
    readonly gtfsTripId: string,
    readonly serviceDay: Temporal.PlainDate,
  ) {}

  toString() {
    return `${this.serviceDay.toString()}|${this.gtfsTripId}`;
  }

  static parse(input: string) {
    const [serviceDayString, gtfsTripId] = input.split("|");
    if (serviceDayString == null || gtfsTripId == null) return null;

    try {
      const serviceDay = Temporal.PlainDate.from(serviceDayString);
      return new CorequeryIntrasourceId(gtfsTripId, serviceDay);
    } catch {
      return null;
    }
  }
}
