import { itsOk } from "@dan-schel/js-utils";

export function formatTable(rows: string[][]) {
  if (rows.length === 0) return "<empty>";

  const columnWidths = itsOk(rows[0]).map((_, colIndex) =>
    Math.max(...rows.map((row) => itsOk(row[colIndex]).length)),
  );

  const formattedRows = rows.map((row) =>
    row.map((text, i) => text.padEnd(itsOk(columnWidths[i]), " ")).join("   "),
  );

  return formattedRows.join("\n");
}
