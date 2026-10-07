import { expect } from "vitest";
import type {
  GtfsRealtimeDataParsingError,
  GtfsScheduleParsingError,
} from "../../../src/parser/error-types.js";
import type { GtfsSystem } from "../../../src/gtfs-system.js";

type ParsingError = GtfsScheduleParsingError | GtfsRealtimeDataParsingError;

export function expectParsingErrorsToMatchSnapshot(system: GtfsSystem) {
  const scheduleErrorList = formatErrorList(system.scheduleParsingErrors);
  const realtimeErrorList = formatErrorList(system.realtimeParsingErrors);

  const snapshot = `\nSchedule parsing errors:\n${scheduleErrorList}\n\nRealtime parsing errors:\n${realtimeErrorList}\n`;
  expect(snapshot).toMatchSnapshot();
}

function formatErrorList(error: ParsingError[]) {
  if (error.length === 0) return "<none>";

  return error.map((e) => `- ${formatParsingError(e)}`).join("\n");
}

function formatParsingError(error: ParsingError): string {
  return error.formatDebugMessage();
}
