/**
 * Per-horse plan extras that used to exist only on Samson's hand-built plan:
 * the competition packing list, coach-visit days on the week plan, and which
 * freestyle file the pinned player is allowed to open.
 *
 * Nothing here reads another rider's data. Callers pass one horse's tests,
 * shows and visits.
 */
import { addDays, parseISO } from "date-fns";
import type { GeneratedPlan, TargetShow } from "./plan-builder.ts";
import { iso, session, type Session } from "./season.ts";

export type PackingItem = { id: string; label: string };
export type PackingGroup = { id: string; title: string; items: PackingItem[] };

const GROUPS: { id: string; title: string; items: readonly (readonly [string, string])[] }[] = [
  {
    id: "horse",
    title: "Horse",
    items: [
      ["bridle", "Bridle + spare snaffle"],
      ["saddle", "Saddle, two numnahs, girth"],
      ["boots", "Boots / bandages"],
      ["wash", "Fly spray, sponge, sweat scraper"],
      ["plaits", "Quarter markers, plaiting kit"],
      ["rugs", "Cooler and rug for the weather"],
    ],
  },
  {
    id: "rider",
    title: "Rider",
    items: [
      ["jacket", "Jacket, hat, gloves"],
      ["stock", "Stock or tie, hairnet"],
      ["breeches", "White breeches, boots"],
      ["shirt", "Spare shirt"],
      ["water", "Sunscreen, water, something to eat"],
    ],
  },
  {
    id: "truck",
    title: "Truck",
    items: [
      ["hay", "Hay and haynets"],
      ["water", "Water and buckets"],
      ["aid", "First aid"],
      ["tools", "Shovel, fork, manure bag"],
      ["lead", "Lead, spare halter"],
    ],
  },
];

/** Stable tick id. The label can change (printed tests follow the horse); the id does not. */
export function packKey(groupId: string, itemId: string) {
  return `${groupId}:${itemId}`;
}

const isFreestyle = (test: string) => /freestyle|mfs/i.test(test);

/** Competition packing list for one horse. Printed tests are that horse's tests. */
export function packingList(tests: string[]): PackingGroup[] {
  const printed = tests.map((t) => t.trim()).filter((t) => t && !isFreestyle(t));
  const label = printed.length ? `Printed ${printed.join(", ")}` : "Printed test sheets";
  return [
    ...GROUPS.map((g) => ({
      id: g.id,
      title: g.title,
      items: g.items.map(([id, itemLabel]) => ({ id, label: itemLabel })),
    })),
    {
      id: "paper",
      title: "Paper",
      items: [
        { id: "membership", label: "ESNZ membership + horse registration" },
        { id: "entry", label: "Entry confirmation" },
        { id: "tests", label },
        { id: "number", label: "Bridle number" },
        { id: "coach-notes", label: "Coach notes from the last visit" },
      ],
    },
  ];
}

export type CoachVisitDraft = {
  id?: string;
  date?: string;
  endDate?: string;
  title?: string;
  focus?: string;
  film?: string;
  homework?: string;
  leaveIt?: string;
};

const dayOnly = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 10) : "");

/** Inclusive calendar days, capped at 14. Empty when the range is unusable. */
export function coachVisitDates(start: string, end?: string, maxDays = 14): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return [];
  const finish = end && /^\d{4}-\d{2}-\d{2}$/.test(end) ? end : start;
  if (finish < start) return [];
  const span = Math.round(
    (Date.parse(`${finish}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000,
  );
  if (span < 0 || span >= maxDays) return [];
  const out: string[] = [];
  let cursor = parseISO(start);
  for (let i = 0; i <= span; i++) {
    out.push(iso(cursor));
    cursor = addDays(cursor, 1);
  }
  return out;
}

export function cleanCoachVisit(input: CoachVisitDraft) {
  const date = dayOnly(input?.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Choose a date");
  const endDate = dayOnly(input?.endDate) || date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) throw new Error("Choose a finish date");
  if (endDate < date) throw new Error("The finish date must be on or after the start date");
  if (coachVisitDates(date, endDate).length === 0) {
    throw new Error("A coach visit can cover up to 14 days");
  }
  const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  return {
    date,
    endDate,
    title: clip(input?.title, 80),
    focus: clip(input?.focus, 300),
    film: clip(input?.film, 300),
    homework: clip(input?.homework, 1000),
    leaveIt: clip(input?.leaveIt, 1000),
  };
}

function shift(day: string, n: number) {
  return iso(addDays(parseISO(day), n));
}

function isShowDay(shows: TargetShow[], day: string) {
  return shows.some((s) => s.start <= day && day <= (s.end && s.end >= s.start ? s.end : s.start));
}

/** Show, travel-in and the day after a show keep their own sessions. */
function coachBlocked(shows: TargetShow[], day: string) {
  if (isShowDay(shows, day)) return true;
  const tomorrow = shift(day, 1);
  if (shows.some((s) => s.travel && s.start === tomorrow)) return true;
  const yesterday = shift(day, -1);
  return isShowDay(shows, yesterday);
}

const COACH_HOW = [
  "Arrive with time to walk.",
  "Film the whole lesson.",
  "Write the homework down before you leave.",
];

type VisitDay = { date: string; endDate?: string; title: string; focus: string };

/**
 * Lay this horse's coach visits onto a copy of its week plan.
 * Show, travel and the day after a show stay as they are. Other horses' visits
 * are never consulted — pass only the visits for this horse.
 */
export function applyCoachVisits(plan: GeneratedPlan, visits: VisitDay[]): GeneratedPlan {
  const byDay = new Map<string, VisitDay>();
  for (const visit of visits) {
    for (const day of coachVisitDates(visit.date, visit.endDate)) {
      if (!byDay.has(day)) byDay.set(day, visit);
    }
  }
  if (byDay.size === 0) return plan;
  let any = false;
  const weeks = plan.weeks.map((week) => {
    let changed = false;
    const sessions: Session[] = week.sessions.map((s) => {
      const visit = byDay.get(s.day);
      if (!visit || coachBlocked(plan.shows, s.day)) return s;
      changed = true;
      return session(
        s.day,
        "coach",
        visit.title.trim() || "Coach",
        visit.focus.trim() || "Ride the lesson, then leave it.",
        60,
        COACH_HOW,
      );
    });
    if (!changed) return week;
    any = true;
    const headline =
      sessions.some((s) => s.kind === "show") || !sessions.some((s) => s.kind === "coach")
        ? week.headline
        : "Coach week — ride the plan, then leave it";
    return { ...week, sessions, headline };
  });
  return any ? { ...plan, weeks } : plan;
}

/**
 * The pinned player may open only this horse's uploaded file.
 * No upload means no player — never the bundled Samson track.
 */
export function playableFreestyle(
  ref: { mediaId?: string | null; fileName?: string | null } | null | undefined,
): { mediaId: string; title: string } | null {
  const mediaId = typeof ref?.mediaId === "string" ? ref.mediaId.trim() : "";
  if (!mediaId || mediaId.startsWith("/audio/")) return null;
  const title = typeof ref?.fileName === "string" ? ref.fileName.trim() : "";
  return { mediaId, title: title || "Freestyle" };
}
