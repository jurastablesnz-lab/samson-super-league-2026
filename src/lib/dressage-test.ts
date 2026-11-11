import { OFFICIAL_SCORES } from "./records.ts";

/**
 * Class numbers are not test names. 201 is 2C at one show and would be 2A at
 * another, so a last-digit rule is not used. A row is named only when it
 * already says the test, or when date, percentage and placing match the
 * recorded EVO result in records.ts.
 */

export const TESTS_BY_SECTION: Record<string, string[]> = {
  "Level 1": ["1A", "1B", "1C", "1D"],
  Preliminary: ["1A", "1B", "1C", "1D"],
  "Level 2": ["2A", "2B", "2C", "MFS"],
  "Level 3": ["3A", "3B", "3C", "MFS"],
  Elementary: ["3A", "3B", "3C", "MFS"],
  "Level 4": ["4A", "4B", "4C", "MFS", "Medium TOC"],
  Medium: ["4A", "4B", "4C", "MFS", "Medium TOC"],
  "Level 5": ["5A", "5B", "5C", "MFS"],
  "Level 6": ["6A", "6B", "6C", "MFS"],
  "Level 7": ["PSG", "Inter I", "Inter I FS"],
};

const ALLOWED = new Set([...Object.values(TESTS_BY_SECTION).flat(), "2B Super 5"]);

export function placeNumber(place: string): string {
  const match = place.match(/\d+/);
  return match ? String(Number(match[0])) : "";
}

export function canonicalTest(raw: string): string | null {
  const text = raw.trim();
  if (!text || /·/.test(text)) return null;
  if (/^2B\s+super\s*5$/i.test(text)) return "2B Super 5";
  if (/^(novice\s+)?2[ABC]$/i.test(text)) return text.replace(/^novice\s+/i, "").toUpperCase();
  if (/^(?:preliminary|prelim)\s+1[ABCD]$/i.test(text))
    return text.replace(/^(?:preliminary|prelim)\s+/i, "").toUpperCase();
  if (/^[1-6][A-D]$/i.test(text)) return text.toUpperCase();
  if (/^(?:L2\s+)?MFS$/i.test(text) || /musical freestyle/i.test(text)) return "MFS";
  if (/medium\s*toc/i.test(text)) return "Medium TOC";
  if (/prix\s*st|^\s*psg\s*$/i.test(text)) return "PSG";
  if (/intermediate\s*i\s*freestyle|inter\s*i\s*fs/i.test(text)) return "Inter I FS";
  if (/intermediate\s*i\b|^\s*inter\s*i\s*$/i.test(text)) return "Inter I";
  return ALLOWED.has(text) ? text : null;
}

/** 2B Super 5 is still test 2B. */
export function testFamily(test: string): string {
  if (/^2B\b/i.test(test)) return "2B";
  return test;
}

export function sectionForLevel(level: string): string {
  if (/medium|\bl4\b|level\s*4/i.test(level)) return "Medium";
  if (/prelim|\bl1\b|level\s*1/i.test(level)) return "Preliminary";
  if (/elementary|\bl3\b|level\s*3/i.test(level)) return "Elementary";
  if (/novice|\bl2\b|level\s*2/i.test(level)) return "Level 2";
  if (/advanced medium|level\s*5/i.test(level)) return "Level 5";
  if (/\badvanced\b|\bl6\b|level\s*6/i.test(level)) return "Level 6";
  if (/small tour|level\s*7|prix|intermediate/i.test(level)) return "Level 7";
  return level.trim() || "Other";
}

export function horseSection(level: string): string {
  return sectionForLevel(level) === "Other" && /level\s*2/i.test(level)
    ? "Level 2"
    : sectionForLevel(level);
}

export function pickerTests(level: string): string[] {
  return TESTS_BY_SECTION[sectionForLevel(level)] ?? TESTS_BY_SECTION["Level 2"];
}

export function isAllowedTest(test: string): boolean {
  return ALLOWED.has(test);
}

function percentsClose(a: number, b: number) {
  return Math.abs(a - b) < 0.051;
}

function asPercent(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Calendar day. A DATE parsed as local midnight must not shift back via UTC. */
export function calendarDay(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${month}-${day}`;
  }
  const match = String(value ?? "").match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

/** Named test, or the one recorded result with the same date, percentage and placing. */
export function inferDressageTest(row: {
  date: unknown;
  percent: unknown;
  place: unknown;
  test: unknown;
}): string | null {
  const named = canonicalTest(String(row.test ?? ""));
  if (named) return named;
  const date = calendarDay(row.date);
  const percent = asPercent(row.percent);
  if (!date || percent == null) return null;
  const place = placeNumber(String(row.place ?? ""));
  const hits = OFFICIAL_SCORES.filter((score) => {
    if (score.date !== date) return false;
    if (!percentsClose(score.percent, percent)) return false;
    const officialPlace = placeNumber(score.place ?? "");
    if (place && officialPlace && place !== officialPlace) return false;
    return true;
  });
  if (hits.length !== 1) return null;
  return canonicalTest(hits[0].test) ?? hits[0].test;
}

export function classLabel(test: string): string {
  const match = test.match(/·\s*(\d+)\s*$/);
  return match ? match[1] : "";
}
