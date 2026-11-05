/**
 * Generated season plans for beta riders.
 *
 * Same week engine as Samson's plan (`buildWeeksFrom` in `season.ts`), same four
 * phases — Foundation, Consolidate, Prepare, Compete — but parameterised by the
 * horse, the level, the tests the rider loads and the shows they are aiming at.
 * Pure and deterministic: the same config always produces the same plan, so it
 * can run on the server (when the wizard saves) and in tests.
 *
 * Coaching language is gender-neutral: the horse is "your horse" / by name /
 * "they", never he or she.
 */
import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from "date-fns";
import {
  buildWeeksFrom,
  daysToNextShowIn,
  iso,
  session,
  type Phase,
  type PlanShow,
  type Session,
  type Week,
  type WeekContext,
} from "./season.ts";

export const PLAN_VERSION = 1;

export const GOALS = [
  { id: "qualify", label: "Qualify for a championship", hint: "Counting scores at the right shows" },
  { id: "learn_level", label: "Learn the level", hint: "Get confident with these tests" },
  { id: "move_up", label: "Move up a level", hint: "School the next level at home" },
  { id: "consistency", label: "Ride more consistent tests", hint: "Fewer expensive mistakes" },
  { id: "confidence", label: "Build confidence away from home", hint: "Calm outings and warm-ups" },
  { id: "freestyle", label: "Debut or polish a freestyle", hint: "Music, timing and floorplan" },
  { id: "personal_best", label: "Set a personal best", hint: "Chase a percentage" },
] as const;
export type GoalId = (typeof GOALS)[number]["id"];

/** Tests by level, as offered in the setup wizard. Riders can also type their own. */
export const TESTS_BY_LEVEL: Record<string, string[]> = {
  "Not competing yet": ["Training 1", "Training 2", "Training 3"],
  "Training / Preliminary": ["Training 1", "Training 2", "Training 3", "Preliminary 1A", "Preliminary 1B"],
  "Level 1": ["1A", "1B", "1C", "Level 1 musical freestyle"],
  "Level 2": ["2A", "2B", "2C", "2B Super 5", "Level 2 musical freestyle"],
  "Level 3": ["3A", "3B", "3C", "Level 3 musical freestyle"],
  "Level 4": ["4A", "4B", "4C", "Level 4 musical freestyle"],
  "Level 5": ["5A", "5B", "5C", "Level 5 musical freestyle"],
  "Level 6": ["6A", "6B", "6C", "Level 6 musical freestyle"],
  "Level 7 / FEI Small Tour": ["FEI Prix St-Georges", "FEI Intermediate I", "FEI Intermediate I Freestyle"],
  "Grand Prix": ["FEI Intermediate II", "FEI Grand Prix", "FEI Grand Prix Freestyle"],
};

const LEVEL_ORDER = Object.keys(TESTS_BY_LEVEL);

export function testsForLevel(level: string): string[] {
  return TESTS_BY_LEVEL[level] ?? TESTS_BY_LEVEL["Level 2"];
}

export function nextLevel(level: string): string | null {
  const i = LEVEL_ORDER.indexOf(level);
  if (i < 0 || i >= LEVEL_ORDER.length - 1) return null;
  return LEVEL_ORDER[i + 1];
}

export type TargetShow = {
  id: string;
  name: string;
  start: string;
  end: string;
  venue?: string;
  /** Tests to ride at this show (subset of the horse's tests). Empty = main test. */
  tests?: string[];
  /** Long haul: add a travel day before. */
  travel?: boolean;
  /** Where the show came from: the shared calendar or typed by the rider. */
  source?: "calendar" | "custom";
  entriesClose?: string;
};

export type FreestyleRef = {
  /** Key in this device's IndexedDB (media-db). The file itself never leaves the device. */
  mediaId: string;
  fileName: string;
  mime: string;
  size: number;
  durationSec?: number | null;
  storedOn: "device";
  uploadedAt: string;
};

export type PlanConfig = {
  horseName: string;
  level: string;
  tests: string[];
  shows: TargetShow[];
  goals: GoalId[];
  goalNote?: string;
  /** First day of the plan (defaults to today in NZ). */
  startDate?: string;
  freestyle?: FreestyleRef | null;
};

export type GeneratedPlan = {
  version: number;
  generatedAt: string;
  horseName: string;
  level: string;
  tests: string[];
  mainTest: string;
  homeworkTest: string;
  goals: GoalId[];
  phases: Phase[];
  shows: TargetShow[];
  weeks: Week[];
  principles: { title: string; body: string }[];
};

const isFreestyle = (t: string) => /freestyle|mfs/i.test(t);

function clampDay(d: Date, min: Date, max: Date) {
  if (d < min) return min;
  if (d > max) return max;
  return d;
}

/**
 * Split the season into the four phases.
 *
 * - No shows: a 16-week development block split 30/30/20/20.
 * - Shows: Compete covers the last 10 days before the final target show through
 *   to its end (or from the first show, if all shows sit close together);
 *   Prepare is the three weeks before Compete; Consolidate runs from the first
 *   target show (or four weeks out) up to Prepare; Foundation is everything
 *   before. When the runway is short each boundary is clamped so every phase
 *   keeps at least one day and they never overlap.
 */
export function phasesFor(startIso: string, shows: TargetShow[], level: string, goals: GoalId[]): Phase[] {
  const start = parseISO(startIso);
  const sorted = [...shows].sort((a, b) => a.start.localeCompare(b.start));
  let end: Date;
  let competeStart: Date;
  let prepareStart: Date;
  let consolidateStart: Date;
  if (sorted.length === 0) {
    end = addDays(start, 16 * 7 - 1);
    const span = differenceInCalendarDays(end, start) + 1;
    consolidateStart = addDays(start, Math.round(span * 0.3));
    prepareStart = addDays(start, Math.round(span * 0.6));
    competeStart = addDays(start, Math.round(span * 0.8));
  } else {
    const first = parseISO(sorted[0].start);
    const last = sorted[sorted.length - 1];
    end = parseISO(last.end || last.start);
    competeStart = addDays(parseISO(last.start), -10);
    prepareStart = addDays(competeStart, -21);
    consolidateStart = addDays(first, -28);
    if (consolidateStart > prepareStart) consolidateStart = prepareStart;
  }
  // Clamp: start < consolidate < prepare < compete <= end, each phase >= 1 day.
  const span = differenceInCalendarDays(end, start) + 1;
  if (span < 8) {
    // Very short runway: everything is Compete except a one-day Foundation etc.
    consolidateStart = addDays(start, 1);
    prepareStart = addDays(start, 2);
    competeStart = addDays(start, 3);
  } else {
    const minC = addDays(start, 1);
    consolidateStart = clampDay(consolidateStart, minC, addDays(end, -2));
    prepareStart = clampDay(prepareStart, addDays(consolidateStart, 1), addDays(end, -1));
    competeStart = clampDay(competeStart, addDays(prepareStart, 1), end);
  }
  if (end < competeStart) end = competeStart;

  const up = nextLevel(level);
  const moveUp = goals.includes("move_up") && up;
  const learn = goals.includes("learn_level");
  const above = up ? `${up} work` : "the next level's work";
  return [
    {
      id: "foundation",
      name: "Foundation",
      start: iso(start),
      end: iso(addDays(consolidateStart, -1)),
      intent: learn
        ? "Learn the tests in pieces. Rhythm, contact and accurate figures before full run-throughs."
        : "Basics first: forward, straight, relaxed. The homework test from the sheet once a week.",
      schoolAbove: moveUp ? `introduce ${above} in small doses` : "transitions, accurate figures, stretch",
    },
    {
      id: "consolidate",
      name: "Consolidate",
      start: iso(consolidateStart),
      end: iso(addDays(prepareStart, -1)),
      intent: sorted.length
        ? "First outings. Same warm-up every time. Fix the expensive marks, not everything."
        : "Run the tests through, then the errors only. Build stamina for a full test.",
      schoolAbove: moveUp ? `${above} twice a week` : "a little above the level as the gymnastic",
    },
    {
      id: "strength",
      name: "Prepare",
      start: iso(prepareStart),
      end: iso(addDays(competeStart, -1)),
      intent: "Sharpen the main test. Ride from memory. Keep schooling fresh, not drilled.",
      schoolAbove: moveUp ? `maintain ${above}, no new movements` : "maintain, nothing new",
    },
    {
      id: "championship",
      name: "Compete",
      start: iso(competeStart),
      end: iso(end),
      intent: "Light work and the test from memory twice a week. Ride the test you have.",
      schoolAbove: "light schooling only",
    },
  ];
}

function howFor(mainTest: string, homeworkTest: string, freestyle: string | null) {
  return {
    rest: [
      "Paddock time. Hand-graze if the weather is ugly.",
      "Check legs and back. Soreness is a stop.",
      "No arena work today.",
    ],
    stretch: [
      "15 min walk, long and low",
      "10 min stretchy trot, both reins",
      "Walk on a long rein until your horse relaxes",
      "No full tests today",
    ],
    school: [
      "Walk until your horse is marching.",
      "Trot until they are in front of the leg.",
      "The exercise for this phase, both reins.",
      "Finish long and low. Quit while they are still willing.",
    ],
    homework: [
      `Ride ${homeworkTest} from the sheet once.`,
      "Then the errors only — letters, transitions, the stretch.",
      "Stop while your horse is still willing.",
    ],
    main: [
      `${mainTest} — ideally from memory, from A.`,
      "If you blank, keep riding. Memory is part of the test.",
      "Film if you can. One run-through, not three.",
    ],
    freestyle: freestyle
      ? [
          `Play the ${freestyle} music once while you walk the floorplan.`,
          "Ride the opening and the final halt on the music.",
          "Check the timing against the window for your level.",
        ]
      : [],
    coach: [
      "Arrive with time to walk.",
      "Film the whole lesson.",
      "Write the homework down before you leave.",
    ],
    show: [
      "Walk the arena the evening before if you can.",
      "Same warm-up every show.",
      "Ride the test you have. Then your horse is done.",
    ],
    travel: [
      "Hay in the truck. Water at every stop on the long hauls.",
      "Walk your horse on arrival. A pick of grass. No test off the ramp.",
    ],
  };
}

function principlesFor(goals: GoalId[], mainTest: string, level: string): GeneratedPlan["principles"] {
  const list = [
    { title: "One job per ride", body: `${mainTest} or schooling, not both. Short sessions that finish well.` },
    { title: "Accuracy is cheap points", body: "Letters, centre line, halt. Ride every figure to the marker." },
    { title: "Protect the horse", body: "Walk breaks are part of the work. Soreness is a stop, not a mood." },
  ];
  if (goals.includes("move_up")) {
    list.push({
      title: "School above the test",
      body: `${nextLevel(level) ?? "Next-level"} work makes ${level} feel ordinary. Park it ten days before a show.`,
    });
  }
  if (goals.includes("confidence")) {
    list.push({ title: "Outings are training", body: "A calm warm-up away from home counts as a good day." });
  }
  if (goals.includes("qualify")) {
    list.push({ title: "Count the scores", body: "Know which shows and tests count toward qualifying. Enter early." });
  }
  return list;
}

export function generatePlan(config: PlanConfig, now: Date = new Date()): GeneratedPlan {
  const level = config.level || "Level 2";
  const tests = config.tests.length ? config.tests : testsForLevel(level).slice(0, 2);
  const ridden = tests.filter((t) => !isFreestyle(t));
  const mainTest = ridden[0] ?? tests[0] ?? "your test";
  const homeworkTest = ridden[1] ?? mainTest;
  const freestyleTest = tests.find(isFreestyle) ?? (config.freestyle ? "freestyle" : null);
  const goals = config.goals;
  const horse = config.horseName.trim() || "your horse";

  const startIso = config.startDate || iso(startOfWeek(now, { weekStartsOn: 0 }));
  const shows = [...config.shows]
    .filter((s) => s.start)
    .map((s) => ({ ...s, end: s.end && s.end >= s.start ? s.end : s.start }))
    .sort((a, b) => a.start.localeCompare(b.start));
  const phases = phasesFor(startIso, shows, level, goals);
  const how = howFor(mainTest, homeworkTest, freestyleTest);
  const up = nextLevel(level);
  const moveUp = goals.includes("move_up") && !!up;
  const learn = goals.includes("learn_level");

  const planShows: PlanShow[] = shows.map((s) => ({
    id: s.id,
    short: s.name,
    start: s.start,
    end: s.end,
    travel: s.travel ? "Long trip — travel the day before." : "Leave time to settle before you warm up.",
    goal: goals.includes("personal_best")
      ? `Ride for marks. Aim for a personal best in ${s.tests?.[0] ?? mainTest}.`
      : goals.includes("confidence")
        ? "A calm, forward test. The result is a bonus."
        : `A clean ${s.tests?.[0] ?? mainTest}. Accuracy first.`,
    tests: s.tests?.length ? s.tests : [mainTest],
  }));

  const ctx: WeekContext = {
    start: startIso,
    end: phases[phases.length - 1].end,
    phases,
    shows: planShows,
    coach: [],
    travelBefore: (show) => !!shows.find((s) => s.id === show.id)?.travel,
    how: { show: how.show, travel: how.travel, rest: how.rest, coach: how.coach },
    restAfterShow: { title: "Rest after the show", focus: "Paddock. Check legs and back. No arena." },
    defaultFor: (dayDate, phase, c) => {
      const day = iso(dayDate);
      const dow = dayDate.getDay();
      const nearShow = daysToNextShowIn(c.shows, day) <= 10;
      if (dow === 0) return session(day, "rest", "Rest / paddock", `Let ${horse} be a horse.`, 0, how.rest);
      if (dow === 1) {
        return session(day, "test", `${homeworkTest} accuracy`, "Homework test from the sheet.", 40, how.homework);
      }
      if (dow === 2 || dow === 4) {
        if (nearShow || phase.id === "championship") {
          return session(day, "school", "Stretch & walk", "Keep it light this close to a show.", 40, how.stretch);
        }
        const focus =
          moveUp && phase.id !== "foundation"
            ? `${up} movements as the gymnastic.`
            : learn && phase.id === "foundation"
              ? `${mainTest} in pieces — one movement block at a time.`
              : phase.id === "foundation"
                ? "In front of the leg, then transitions within the gait."
                : "Transitions, accuracy and the high-coefficient movements.";
        return session(
          day,
          "school",
          moveUp && phase.id !== "foundation" ? "School above the level" : "Schooling",
          focus,
          45,
          how.school,
        );
      }
      if (dow === 3) {
        return session(day, "school", "Stretch & walk", `Long and low. No ${mainTest}.`, 40, how.stretch);
      }
      if (dow === 5) {
        if (freestyleTest && phase.id !== "foundation") {
          return session(day, "test", "Freestyle practice", "Music, timing and the floorplan.", 35, how.freestyle);
        }
        return session(day, "school", "Stretch & walk", `Long and low. No ${mainTest}.`, 40, how.stretch);
      }
      if (learn && phase.id === "foundation") {
        return session(day, "test", `${mainTest} from the sheet`, "Learn the pattern. Accuracy over expression.", 35, how.homework);
      }
      return session(day, "test", `${mainTest} from memory`, "The main test. One time through.", 35, how.main);
    },
    headlineFor: (phase, sessions: Session[]) => {
      const show = sessions.find((s) => s.kind === "show");
      const travel = sessions.find((s) => s.kind === "travel");
      if (show) return show.title;
      if (travel) return `Travel day. ${horse} walks on arrival.`;
      if (phase.id === "foundation") return `Foundation — ${homeworkTest} as homework, schooling twice`;
      if (phase.id === "consolidate") return "Consolidate — fix the expensive marks";
      if (phase.id === "strength") return `Prepare — ${mainTest} from memory, keep it fresh`;
      return `Compete — light work, ${mainTest} from memory twice`;
    },
    cautionFor: (sessions, weekStart, c) => {
      const nearest = daysToNextShowIn(c.shows, weekStart);
      if (sessions.some((s) => s.kind === "show")) return "One job: the test you came for. Then rest.";
      if (nearest <= 10 && nearest >= 0) return `Keep it light. Stretch, ${homeworkTest}, one ${mainTest} from memory.`;
      return undefined;
    },
  };

  return {
    version: PLAN_VERSION,
    generatedAt: now.toISOString(),
    horseName: horse,
    level,
    tests,
    mainTest,
    homeworkTest,
    goals,
    phases,
    shows,
    weeks: buildWeeksFrom(ctx),
    principles: principlesFor(goals, mainTest, level),
  };
}

export function describeWhen(s: { start: string; end: string }) {
  const a = parseISO(s.start);
  return s.end && s.end !== s.start ? `${format(a, "d")}–${format(parseISO(s.end), "d MMM yyyy")}` : format(a, "d MMM yyyy");
}

/** Normalise untrusted wizard input into a PlanConfig (server-side validation). */
export function sanitisePlanConfig(raw: unknown, fallback: { horseName: string; level: string }): PlanConfig {
  const r = (raw ?? {}) as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const day = (v: unknown) => {
    const s = str(v, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
  };
  const goalIds = new Set<string>(GOALS.map((g) => g.id));
  const tests = (Array.isArray(r.tests) ? r.tests : []).map((t) => str(t, 60)).filter(Boolean).slice(0, 12);
  const shows: TargetShow[] = (Array.isArray(r.shows) ? r.shows : [])
    .slice(0, 30)
    .map((s, i) => {
      const o = (s ?? {}) as Record<string, unknown>;
      const start = day(o.start);
      return {
        id: str(o.id, 60) || `show-${i + 1}`,
        name: str(o.name, 80),
        start,
        end: day(o.end) || start,
        venue: str(o.venue, 80) || undefined,
        tests: (Array.isArray(o.tests) ? o.tests : []).map((t) => str(t, 60)).filter(Boolean).slice(0, 6),
        travel: o.travel === true,
        source: o.source === "calendar" ? ("calendar" as const) : ("custom" as const),
        entriesClose: day(o.entriesClose) || undefined,
      };
    })
    .filter((s) => s.name && s.start);
  let freestyle: FreestyleRef | null = null;
  const f = r.freestyle as Record<string, unknown> | null | undefined;
  if (f && typeof f === "object" && str(f.mediaId, 120) && str(f.fileName, 200)) {
    freestyle = {
      mediaId: str(f.mediaId, 120),
      fileName: str(f.fileName, 200),
      mime: str(f.mime, 80) || "audio/mpeg",
      size: Math.max(0, Math.round(Number(f.size) || 0)),
      durationSec: Number.isFinite(Number(f.durationSec)) ? Number(f.durationSec) : null,
      storedOn: "device",
      uploadedAt: str(f.uploadedAt, 40) || new Date().toISOString(),
    };
  }
  return {
    horseName: str(r.horseName, 80) || fallback.horseName,
    level: str(r.level, 60) || fallback.level || "Level 2",
    tests,
    shows,
    goals: (Array.isArray(r.goals) ? r.goals : []).filter((g): g is GoalId => typeof g === "string" && goalIds.has(g)),
    goalNote: str(r.goalNote, 500) || undefined,
    startDate: day(r.startDate) || undefined,
    freestyle,
  };
}
