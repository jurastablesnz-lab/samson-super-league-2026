/**
 * Shared shapes for the competitions catalog and the countdown a rider sees
 * on a horse's plan. Pure: no database and no server functions.
 */
import { differenceInCalendarDays, parseISO } from "date-fns";

export type CompetitionInput = {
  id?: string;
  name: string;
  venue: string;
  region: string;
  start: string;
  end: string;
  entryOpen: string;
  entryClose: string;
  /** Levels or tests offered, as the admin typed them. */
  offered: string;
  scheduleUrl: string;
  notes: string;
};

export type CompetitionRecord = {
  id: string;
  name: string;
  venue: string;
  region: string;
  start: string;
  end: string;
  entryOpen: string;
  entryClose: string;
  offered: string;
  scheduleUrl: string;
  notes: string;
};

/** A catalog competition this horse is training towards, plus the tests chosen for it. */
export type TrainingTarget = CompetitionRecord & { tests: string[] };

export type TrainingBoard = {
  catalog: CompetitionRecord[];
  targets: TrainingTarget[];
};

export type CompetitionCountdown = {
  eventDays: number;
  eventLabel: string;
  closeDays: number | null;
  closeLabel: string;
  /** Entry close is today or within the next 7 days. */
  closeSoon: boolean;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function clip(v: unknown, max: number) {
  return (typeof v === "string" ? v : "").slice(0, max).trim();
}

export function cleanCompetition(
  input: Partial<CompetitionInput> | null | undefined,
): CompetitionInput {
  if (!input || typeof input !== "object") throw new Error("Competition missing");
  const name = clip(input.name, 160);
  if (!name) throw new Error("Name the competition");
  const start = clip(input.start, 10);
  const end = clip(input.end, 10) || start;
  if (!DATE.test(start)) throw new Error("Choose a start date");
  if (!DATE.test(end)) throw new Error("Choose an end date");
  if (end < start) throw new Error("The finish date must be on or after the start date");
  const entryOpen = clip(input.entryOpen, 10);
  const entryClose = clip(input.entryClose, 10);
  if (entryOpen && !DATE.test(entryOpen)) throw new Error("Entry open date is not a date");
  if (entryClose && !DATE.test(entryClose)) throw new Error("Entry close date is not a date");
  if (entryOpen && entryClose && entryClose < entryOpen) {
    throw new Error("Entries must close on or after they open");
  }
  let scheduleUrl = clip(input.scheduleUrl, 500);
  if (scheduleUrl) {
    let url: URL;
    try {
      url = new URL(scheduleUrl);
    } catch {
      throw new Error("Schedule link must be a full web address");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Schedule link must start with https://");
    }
    scheduleUrl = url.toString();
  }
  return {
    id: clip(input.id, 80),
    name,
    venue: clip(input.venue, 160),
    region: clip(input.region, 80),
    start,
    end,
    entryOpen,
    entryClose,
    offered: clip(input.offered, 400),
    scheduleUrl,
    notes: clip(input.notes, 2000),
  };
}

/** Keep only tests that are already on this horse's plan. */
export function cleanTargetTests(tests: unknown, allowed: string[]): string[] {
  const ok = new Set(allowed.map((t) => t.trim()).filter(Boolean));
  if (!Array.isArray(tests)) return [];
  const out: string[] = [];
  for (const test of tests) {
    if (typeof test !== "string") continue;
    const name = test.trim().slice(0, 80);
    if (!name || !ok.has(name) || out.includes(name)) continue;
    out.push(name);
    if (out.length >= 12) break;
  }
  return out;
}

/**
 * Countdown to the first day of the competition and to entry close.
 * `todayIso` is a YYYY-MM-DD calendar day (the app uses New Zealand's day).
 */
export function competitionCountdown(
  event: { start: string; end: string; entryClose?: string },
  todayIso: string,
): CompetitionCountdown {
  const today = parseISO(todayIso);
  const end = event.end || event.start;
  const eventDays = differenceInCalendarDays(parseISO(event.start), today);
  let eventLabel: string;
  if (todayIso > end) eventLabel = "Finished";
  else if (todayIso >= event.start) eventLabel = "On now";
  else if (eventDays === 1) eventLabel = "Starts tomorrow";
  else eventLabel = `Starts in ${eventDays} days`;

  const close = event.entryClose?.slice(0, 10) ?? "";
  if (!close) {
    return {
      eventDays,
      eventLabel,
      closeDays: null,
      closeLabel: "Entry close not set",
      closeSoon: false,
    };
  }
  const closeDays = differenceInCalendarDays(parseISO(close), today);
  const closeSoon = closeDays >= 0 && closeDays <= 7;
  let closeLabel: string;
  if (closeDays < 0) closeLabel = "Entries closed";
  else if (closeDays === 0) closeLabel = "Entries close today";
  else if (closeDays === 1) closeLabel = "Entries close tomorrow";
  else closeLabel = `Entries close in ${closeDays} days`;
  return { eventDays, eventLabel, closeDays, closeLabel, closeSoon };
}
