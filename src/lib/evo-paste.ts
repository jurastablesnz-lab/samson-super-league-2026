import { parseDate, parseEvoResultsCsv, parsePercent, type EvoRow } from "./evo-csv.ts";

/** EVO's copied horse-results table has nine columns. Browsers put a newline
 * inside a wrapped cell, so a physical line is not necessarily a whole row. */
const COLUMN_COUNT = 9;

export type EvoPasteResult = {
  rows: EvoRow[];
  warnings: string[];
  skipped: number;
  format: "evo_table" | "csv";
};

function copiedRows(text: string): { cells: string[]; line: number }[] {
  const rows: { cells: string[]; line: number }[] = [];
  let cells: string[] = [];
  let firstLine = 0;
  const finish = () => {
    if (cells.length === COLUMN_COUNT) rows.push({ cells, line: firstLine });
    cells = [];
  };
  for (const [index, physicalLine] of text.replace(/\r\n?/g, "\n").split("\n").entries()) {
    if (!physicalLine.trim()) continue;
    const parts = physicalLine.split("\t").map((part) => part.trim());
    const beginsNextRow = !!parseDate(parts[0]);
    if (beginsNextRow && cells.length) finish();
    if (cells.length === COLUMN_COUNT) {
      // If a browser places a wrapped suffix after the ninth tab, its column
      // is not marked. Recognise common EVO suffixes; otherwise it belongs to
      // the rider name (names are the usual free-text wrapped field).
      for (const suffix of parts.filter(Boolean)) {
        if (/^date$|^event$|^discipline$|^rider$/i.test(suffix)) continue;
        if (/^\d{4}$/.test(suffix)) cells[1] = `${cells[1]} ${suffix}`;
        else if (/^\([^)]*(?:L\d|level)[^)]*\)$/i.test(suffix)) cells[5] = `${cells[5]} ${suffix}`;
        else if (/^(?:J[1-5]\s*:|cancelled|no score|information)/i.test(suffix))
          cells[8] = `${cells[8]} ${suffix}`.trim();
        else cells[3] = `${cells[3]} ${suffix}`;
      }
      continue;
    }
    if (!cells.length) {
      cells = [parts[0]];
      firstLine = index + 1;
    } else {
      // Still inside the first nine cells: the first fragment continues the
      // preceding cell, and subsequent tab-separated fragments are new cells.
      cells[cells.length - 1] = `${cells[cells.length - 1]} ${parts[0]}`.trim();
    }
    cells.push(...parts.slice(1));
    if (cells.length > COLUMN_COUNT) cells = cells.slice(0, COLUMN_COUNT);
  }
  finish();
  return rows;
}

function isDash(value: string): boolean {
  return /^[—–-]+$/.test(value.trim());
}

/** Parse a copied EVO results table, or an ordinary EVO CSV export. */
export function parseEvoResultsPaste(input: string): EvoPasteResult {
  if (!input.trim())
    return {
      rows: [],
      warnings: ["Paste your EVO results table first."],
      skipped: 0,
      format: "evo_table",
    };
  const copied = copiedRows(input);
  const looksLikeTable = copied.some(({ cells }) => parseDate(cells[0]));
  if (!looksLikeTable) {
    const csv = parseEvoResultsCsv(input);
    return { ...csv, skipped: 0, format: "csv" };
  }

  const rows: EvoRow[] = [];
  const warnings: string[] = [];
  let skipped = 0;
  for (const { cells, line } of copied) {
    const [date, event, discipline, rider, className, level, place, result, detail] = cells;
    if (/^date$/i.test(date.trim())) continue;
    if (!parseDate(date)) {
      if (rows.length || copied.length === 1)
        warnings.push(`Line ${line}: no valid DD/MM/YYYY date — row skipped.`);
      skipped += 1;
      continue;
    }
    const text = cells.join(" ");
    const cancelled = /cancelled/i.test(text);
    const emptyResult = !result.trim() || isDash(result);
    const parsed = parsePercent(result);
    const informational =
      /have a go|rider alphabetical/i.test(discipline) || /rider alphabetical/i.test(level);
    const dressageOrPara = /dressage|para(?:\s|-)?equestrian/i.test(discipline);
    // EVO mixes informational, non-dressage and cancelled entries into this
    // table. Keep scored rows and dressage/para results; drop the rest.
    if (
      /^e$/i.test(result.trim()) ||
      emptyResult ||
      cancelled ||
      informational ||
      (!dressageOrPara && parsed.percent == null)
    ) {
      skipped += 1;
      continue;
    }
    if (parsed.percent == null && !parsed.status) {
      skipped += 1;
      warnings.push(`Line ${line}: result “${result}” is not a score — row skipped.`);
      continue;
    }
    if (parsed.percent != null && (parsed.percent < 0 || parsed.percent > 100)) {
      skipped += 1;
      warnings.push(`Line ${line}: result “${result}” is not a percentage — row skipped.`);
      continue;
    }
    const raw: Record<string, string> = {
      Date: date,
      Event: event,
      Discipline: discipline,
      Rider: rider,
      Class: className,
      "Level/Type": level,
      Place: place,
      Result: result,
      Detail: detail,
    };
    const judges = [...detail.matchAll(/\b(J[1-5])\s*:\s*(\d+(?:[.,]\d+)?)(?:\s*\/\s*\S+)?/gi)]
      .map((match) => `${match[1].toUpperCase()}:${match[2].replace(",", ".")}`)
      .join(" ");
    const status = parsed.status ?? (parsed.percent == null ? "NS" : "ok");
    rows.push({
      line,
      rider,
      horse: "",
      esnz: "",
      event,
      date: parseDate(date),
      className: className ? `Class ${className}` : level,
      test: [className, level].filter(Boolean).join(" — "),
      level,
      percent: parsed.percent,
      place: isDash(place) ? "" : place,
      status,
      judges: judges || detail.slice(0, 300),
      raw,
    });
  }
  if (!rows.length) warnings.push("No dressage scores found in that paste.");
  return { rows, warnings, skipped, format: "evo_table" };
}
