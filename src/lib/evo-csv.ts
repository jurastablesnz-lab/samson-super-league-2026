/**
 * Tolerant parser for results CSVs exported from EVO Events (evoevents.co.nz).
 *
 * We do not have a sample export yet, so this is deliberately forgiving. See
 * docs/evo-results-import.md for the full list of accepted headers. In short:
 *
 * - Delimiter: comma, semicolon or tab (auto-detected from the header line).
 * - Quotes: RFC 4180 double quotes, "" escapes, newlines inside quotes. A UTF-8
 *   BOM and blank/preamble lines before the header are skipped (the header is
 *   the first line that names a horse or rider column).
 * - Headers are matched case-insensitively, ignoring spaces, punctuation and
 *   accents, against a list of aliases per field (e.g. "Horse", "Horse Name",
 *   "Horse (Reg Name)").
 * - Rider name: one "Rider" column, or "First name" + "Surname" columns.
 * - Percent: "64.2", "64.2%", "64,2" (decimal comma). A score column above 100
 *   with a "max"/"possible" column is converted to a percentage. Values like
 *   "E", "Elim", "WD", "Ret", "NS", "DNS", "Scratched" set a status instead.
 * - Per-judge columns ("J1 %", "Judge C", "C %", "E", "B" …) are kept as a
 *   judges summary; when no overall percentage exists, their average is used.
 * - Unknown columns are preserved in `raw` so nothing in the file is lost.
 */

export type EvoStatus = "ok" | "E" | "WD" | "NS";

export type EvoRow = {
  /** 1-based line in the file (for error messages). */
  line: number;
  rider: string;
  horse: string;
  esnz: string;
  event: string;
  date: string;
  className: string;
  test: string;
  level: string;
  percent: number | null;
  place: string;
  status: EvoStatus;
  judges: string;
  raw: Record<string, string>;
};

export type EvoParseResult = {
  rows: EvoRow[];
  /** Header → field mapping we used (for the admin preview). */
  mapping: Record<string, string>;
  warnings: string[];
  delimiter: string;
};

type Field =
  | "rider" | "firstName" | "lastName" | "horse" | "esnz" | "event" | "date" | "className"
  | "test" | "level" | "percent" | "score" | "maxScore" | "place" | "status";

const ALIASES: Record<Field, string[]> = {
  rider: ["rider", "ridername", "competitor", "competitorname", "athlete", "athletename", "name", "person", "ridersname", "member", "membername"],
  firstName: ["firstname", "riderfirstname", "givenname", "forename", "first"],
  lastName: ["lastname", "surname", "riderlastname", "familyname", "ridersurname", "last"],
  horse: ["horse", "horsename", "horsenamereg", "horseregname", "horseregisteredname", "registeredname", "mount", "horsesname"],
  esnz: ["esnz", "esnzno", "esnznumber", "esnzid", "esnzreg", "esnzregno", "esnzregistration", "esnzhorse", "esnzhorseno", "horseesnz", "horseesnzno", "horseno", "horsenumber", "horseid", "horsereg", "horseregno", "horseregistration", "horseregistrationno", "registration", "registrationno", "registrationnumber", "regno", "reg", "fei", "feiid", "lifenumber"],
  event: ["event", "eventname", "show", "showname", "competition", "competitionname", "meeting", "venue"],
  date: ["date", "eventdate", "classdate", "competitiondate", "day", "ridedate", "showdate", "startdate"],
  className: ["class", "classname", "classno", "classnumber", "division", "section"],
  test: ["test", "testname", "testno", "dressagetest", "testridden"],
  level: ["level", "grade", "classlevel", "testlevel"],
  percent: ["percent", "percentage", "pct", "score", "result", "total", "totalpercent", "totalpercentage", "final", "finalpercent", "finalpercentage", "finalscore", "overall", "overallpercent", "averagepercent", "avg", "average", "mark", "totalpct"],
  score: ["points", "totalpoints", "marks", "totalmarks", "rawscore"],
  maxScore: ["max", "maxpoints", "maxmarks", "possible", "maximum", "outof", "totalpossible"],
  place: ["place", "placing", "position", "pos", "rank", "ranking", "placed", "plc"],
  status: ["status", "outcome", "eliminated", "withdrawn"],
};

const JUDGE_RE = /^(j[1-5]|judge[1-5a-z]?|judge[cehbmkf]|[cehbmkf]|at[cehbm])(pct|percent|percentage|score)?$/;

export function normaliseHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/%/g, "percent")
    .replace(/[^a-z0-9]/g, "");
}

export function normaliseName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normaliseEsnz(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^ESNZ/, "").replace(/^0+(?=\d)/, "");
}

function detectDelimiter(line: string): string {
  const counts = [",", ";", "\t"].map((d) => ({ d, n: splitLine(line, d).length }));
  counts.sort((a, b) => b.n - a.n);
  return counts[0].n > 1 ? counts[0].d : ",";
}

function splitLine(line: string, d: string): string[] {
  return parseCsv(line, d)[0] ?? [];
}

/** RFC 4180-ish CSV → rows of cells. Handles quotes, "" escapes and CRLF. */
export function parseCsv(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
      continue;
    }
    if (c === '"' && cell.trim() === "") {
      quoted = true;
      cell = "";
    } else if (c === delimiter) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function parsePercent(v: string): { percent: number | null; status: EvoStatus | null } {
  const s = v.trim();
  if (!s) return { percent: null, status: null };
  const u = s.toUpperCase().replace(/[^A-Z]/g, "");
  if (/^(E|EL|ELIM|ELIMINATED|DQ|DSQ|DISQ|DISQUALIFIED)$/.test(u)) return { percent: null, status: "E" };
  if (/^(WD|W|WITHDRAWN|RET|RT|RETIRED|R)$/.test(u)) return { percent: null, status: "WD" };
  if (/^(NS|DNS|NOSHOW|SCR|SCRATCHED|DNF|NC)$/.test(u)) return { percent: null, status: "NS" };
  let n = s.replace(/%/g, "").replace(/\s/g, "");
  if (/^\d+,\d+$/.test(n)) n = n.replace(",", ".");
  const num = Number(n);
  if (!Number.isFinite(num)) return { percent: null, status: null };
  return { percent: num, status: null };
}

/** Accepts ISO, d/m/yyyy (NZ order), d-m-yy, "12 Mar 2026", "Mar 12, 2026". Returns YYYY-MM-DD or "". */
export function parseDate(v: string): string {
  const s = v.trim();
  if (!s) return "";
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return ymd(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return ymd(y, +m[2], +m[1]); // NZ: day first
  }
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  m = s.toLowerCase().match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3})[a-z]*\.?,?\s+(\d{4})/);
  if (m && months.includes(m[2])) return ymd(+m[3], months.indexOf(m[2]) + 1, +m[1]);
  m = s.toLowerCase().match(/^([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (m && months.includes(m[1])) return ymd(+m[3], months.indexOf(m[1]) + 1, +m[2]);
  return "";
}

function ymd(y: number, mo: number, d: number) {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return "";
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function matchField(h: string, taken: Set<Field>): Field | null {
  const n = normaliseHeader(h);
  if (!n) return null;
  for (const f of Object.keys(ALIASES) as Field[]) {
    if (taken.has(f)) continue;
    if (ALIASES[f].includes(n)) return f;
  }
  // Fuzzy fallbacks
  if (!taken.has("esnz") && /esnz|regno|registration/.test(n)) return "esnz";
  if (!taken.has("horse") && n.startsWith("horse") && !/id|no|number|reg|age|sex|colou?r|breed|owner/.test(n)) return "horse";
  if (!taken.has("rider") && n.startsWith("rider") && !/id|no|number|grade/.test(n)) return "rider";
  if (!taken.has("percent") && /percent|pct/.test(n) && !JUDGE_RE.test(n)) return "percent";
  return null;
}

export function parseEvoResultsCsv(input: string): EvoParseResult {
  const text = input.replace(/^\uFEFF/, "");
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/);
  // Header = first non-empty line that names a horse or rider column.
  let headerIdx = lines.findIndex((l) => /horse|rider|competitor|athlete/i.test(l));
  if (headerIdx < 0) headerIdx = lines.findIndex((l) => l.trim() !== "");
  if (headerIdx < 0) return { rows: [], mapping: {}, warnings: ["The file is empty."], delimiter: "," };
  const delimiter = detectDelimiter(lines[headerIdx]);
  const body = lines.slice(headerIdx).join("\n");
  const table = parseCsv(body, delimiter);
  const header = (table[0] ?? []).map((h) => h.trim());
  const taken = new Set<Field>();
  const fieldAt: (Field | null)[] = header.map((h) => {
    const f = matchField(h, taken);
    if (f) taken.add(f);
    return f;
  });
  const judgeCols = header
    .map((h, i) => ({ h, i, n: normaliseHeader(h) }))
    .filter((c) => !fieldAt[c.i] && JUDGE_RE.test(c.n));
  const mapping: Record<string, string> = {};
  header.forEach((h, i) => {
    if (fieldAt[i]) mapping[h] = fieldAt[i]!;
  });
  judgeCols.forEach((c) => (mapping[c.h] = "judge"));
  if (!taken.has("horse") && !taken.has("esnz")) warnings.push("No horse or ESNZ number column found — rows cannot be matched.");
  if (!taken.has("percent") && !taken.has("score") && judgeCols.length === 0) warnings.push("No percentage/score column found.");

  // A shared event/date can sit in the preamble ("Event: Taupō Premier League").
  // Ignore "Exported on …" lines — that is the download date, not the show.
  const pre = lines.slice(0, headerIdx).filter((l) => !/export|download|printed|generated/i.test(l)).join(" ");
  const preDate = parseDate((pre.match(/\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}-\d{2}-\d{2}/) ?? [""])[0]);
  const preEvent =
    lines
      .slice(0, headerIdx)
      .map((l) => (l.match(/^\W*(?:event|show|competition)\s*(?:name)?\s*[:-]\s*([^,;\t]+)/i) ?? ["", ""])[1].trim())
      .find(Boolean) ?? "";

  const rows: EvoRow[] = [];
  for (let r = 1; r < table.length; r++) {
    const cells = table[r];
    if (!cells || cells.every((c) => !c.trim())) continue;
    const get = (f: Field) => {
      const i = fieldAt.indexOf(f);
      return i >= 0 ? (cells[i] ?? "").trim() : "";
    };
    const raw: Record<string, string> = {};
    header.forEach((h, i) => {
      if (h || cells[i]) raw[h || `col${i + 1}`] = (cells[i] ?? "").trim();
    });
    const rider = get("rider") || [get("firstName"), get("lastName")].filter(Boolean).join(" ");
    const horse = get("horse");
    const esnz = get("esnz");
    if (!rider && !horse && !esnz) continue;
    let { percent, status } = parsePercent(get("percent"));
    if (percent == null && !status && get("score")) {
      const sc = parsePercent(get("score"));
      const max = parsePercent(get("maxScore")).percent;
      status = sc.status;
      if (sc.percent != null) percent = max && max > 0 ? (sc.percent / max) * 100 : sc.percent <= 100 ? sc.percent : null;
    }
    const judgeVals = judgeCols
      .map((c) => ({ label: c.h, v: parsePercent(cells[c.i] ?? "").percent }))
      .filter((j) => j.v != null && j.v > 0 && j.v <= 100) as { label: string; v: number }[];
    if (percent == null && !status && judgeVals.length) {
      percent = judgeVals.reduce((n, j) => n + j.v, 0) / judgeVals.length;
    }
    if (percent != null && (percent < 0 || percent > 100)) {
      warnings.push(`Line ${headerIdx + r + 1}: ${percent} is not a percentage — ignored.`);
      percent = null;
    }
    const stat = parsePercent(get("status")).status;
    rows.push({
      line: headerIdx + r + 1,
      rider,
      horse,
      esnz,
      event: get("event") || preEvent,
      date: parseDate(get("date")) || preDate,
      className: get("className"),
      test: get("test") || get("className"),
      level: get("level"),
      percent: percent == null ? null : Math.round(percent * 1000) / 1000,
      place: get("place"),
      status: stat ?? status ?? (percent == null ? "NS" : "ok"),
      judges: judgeVals.map((j) => `${j.label}:${j.v}`).join(" "),
      raw,
    });
  }
  if (!rows.length) warnings.push("No result rows found under the header.");
  return { rows, mapping, warnings, delimiter };
}

/** Stable key so re-importing the same file does not duplicate results. */
export function evoDedupeKey(r: Pick<EvoRow, "event" | "date" | "className" | "test" | "percent" | "status">): string {
  return [normaliseName(r.event), r.date, normaliseName(r.className || r.test), r.percent ?? r.status].join("|");
}
