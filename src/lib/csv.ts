function csvEscape(value: string | number | boolean | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(rows: (string | number | boolean | null | undefined)[][]): string {
  // Leading BOM so Excel opens UTF-8 CSVs (e.g. non-Latin names) correctly
  // instead of mangling them under its default system-locale encoding.
  return "﻿" + rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

export function csvResponseHeaders(filename: string) {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
  };
}
