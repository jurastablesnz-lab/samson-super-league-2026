import { create } from "zustand";
import { persist } from "zustand/middleware";
import { OFFICIAL_SCORES, type LevelId, type ResultStatus } from "./records";
import { type ReviewItem } from "./review-types";
import { pointsForPercent, SHOWS } from "./season";

export type TabId = "today" | "season" | "tests" | "coach" | "log";

export type Score = {
  id: string;
  showId: string;
  showName?: string;
  date?: string;
  test: string;
  percent: number;
  notes: string;
  place?: string;
  official?: boolean;
  status?: ResultStatus;
  level?: LevelId;
  judges?: string;
  eventUrl?: string;
};

export type RideNote = {
  id: string;
  date: string;
  text: string;
};

export type { ReviewItem, SheetRead, WorkOn } from "./review-types";

export type TestKey = "2A" | "2B" | "2C" | "MFS" | "Other";

type State = {
  tab: TabId;
  done: Record<string, boolean>;
  pack: Record<string, boolean>;
  scores: Score[];
  notes: RideNote[];
  review: ReviewItem[];
  weekIndex: number;
  setTab: (tab: TabId) => void;
  setWeekIndex: (i: number) => void;
  toggleDone: (id: string) => void;
  togglePack: (id: string) => void;
  addScore: (score: Omit<Score, "id">) => Score;
  removeScore: (id: string) => void;
  addNote: (date: string, text: string) => void;
  removeNote: (id: string) => void;
  addReview: (item: ReviewItem) => void;
  updateReview: (id: string, patch: Partial<Pick<ReviewItem, "note" | "test" | "sheet">>) => void;
  removeReview: (id: string) => void;
};

function mergeScores(user: Score[] | undefined): Score[] {
  const own = (user ?? []).filter((s) => !s.official && !s.id.startsWith("evo-"));
  return [...OFFICIAL_SCORES, ...own];
}

export const LEGACY_PLAN_KEY = "samson-super5-plan";

export const usePlan = create<State>()(
  persist(
    (set) => ({
      tab: "today",
      done: {},
      pack: {},
      scores: mergeScores([]),
      notes: [],
      review: [],
      weekIndex: 0,
      setTab: (tab) => set({ tab }),
      setWeekIndex: (weekIndex) => set({ weekIndex }),
      toggleDone: (id) => set((s) => ({ done: { ...s.done, [id]: !s.done[id] } })),
      togglePack: (id) => set((s) => ({ pack: { ...s.pack, [id]: !s.pack[id] } })),
      addScore: (score) => {
        const row: Score = {
          level: "L2",
          status: "ok",
          ...score,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        };
        set((s) => ({ scores: [...s.scores, row] }));
        return row;
      },
      removeScore: (id) =>
        set((s) => ({
          scores: s.scores.filter((x) => x.id !== id || x.official),
        })),
      addNote: (date, text) =>
        set((s) => ({
          notes: [{ id: `${Date.now()}`, date, text }, ...s.notes],
        })),
      removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
      addReview: (item) =>
        set((s) => ({ review: [item, ...s.review.filter((x) => x.id !== item.id)] })),
      updateReview: (id, patch) =>
        set((s) => ({
          review: s.review.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        })),
      removeReview: (id) => set((s) => ({ review: s.review.filter((item) => item.id !== id) })),
    }),
    {
      name: LEGACY_PLAN_KEY,
      // Hydrated by scopePlanStorage() once we know who is signed in.
      skipHydration: true,
      partialize: (s) => ({
        done: s.done,
        pack: s.pack,
        scores: s.scores.filter((x) => !x.official),
        notes: s.notes,
        review: s.review,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return {
          ...current,
          ...p,
          scores: mergeScores(p.scores),
          review: p.review ?? [],
        };
      },
    },
  ),
);

/**
 * Point the plan store at one user's localStorage key and load it. Admins keep
 * the original single-rider key; each beta rider gets `xsalute-plan:<userId>`.
 * A rider's first load on a device that already has the original plan copies it
 * across, so an existing device keeps its history after signing in.
 */
export async function scopePlanStorage(key: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (key !== LEGACY_PLAN_KEY && !localStorage.getItem(key)) {
      const legacy = localStorage.getItem(LEGACY_PLAN_KEY);
      if (legacy) localStorage.setItem(key, legacy);
    }
  } catch {
    /* storage unavailable */
  }
  // Switch the key BEFORE any state write, so nothing lands in another rider's
  // key. (Sign-out reloads the page, so in-memory state never crosses users.)
  usePlan.persist.setOptions({ name: key });
  await usePlan.persist.rehydrate();
}

export function testKey(test: string): TestKey {
  const t = test.toLowerCase();
  if (t.includes("mfs") || t.includes("freestyle")) return "MFS";
  if (t.includes("2a")) return "2A";
  if (t.includes("2c")) return "2C";
  if (t.includes("2b")) return "2B";
  return "Other";
}

function isLeagueTest(test: string) {
  const t = test.toLowerCase();
  if (t.includes("mfs") || t.includes("freestyle")) return false;
  return t.includes("2b") || t.includes("super");
}

export function isCountedScore(score: Score) {
  if (score.status && score.status !== "ok") return false;
  if (!Number.isFinite(score.percent) || score.percent <= 0) return false;
  return true;
}

export function isLevel2Score(score: Score) {
  if (!isCountedScore(score)) return false;
  if (score.level && score.level !== "L2") return false;
  return true;
}

export function leagueFromScores(scores: Score[]) {
  const super5 = scores
    .filter((s) => isLeagueTest(s.test) && s.showId !== "past" && isCountedScore(s))
    .map((s) => ({ ...s, pts: pointsForPercent(s.percent) }))
    .sort((a, b) => b.percent - a.percent);
  const counting = super5.slice(0, 5);
  const total = counting.reduce((n, s) => n + s.pts, 0);
  const avg =
    counting.length === 0 ? 0 : counting.reduce((n, s) => n + s.percent, 0) / counting.length;
  return { super5, counting, total, avg };
}

export function showLabel(score: Score) {
  if (score.showName?.trim()) return score.showName.trim();
  return SHOWS.find((x) => x.id === score.showId)?.short ?? score.showId;
}

export type TestRecord = {
  key: TestKey;
  count: number;
  best: Score | null;
  worst: Score | null;
};

export type Level2Record = {
  count: number;
  best: Score | null;
  worst: Score | null;
  latest: Score | null;
  avg: number;
  pbIds: Set<string>;
  testPbIds: Set<string>;
  byTest: TestRecord[];
};

export function recordFromScores(scores: Score[]): Level2Record {
  const emptyByTest: TestRecord[] = (["2A", "2B", "2C", "MFS"] as TestKey[]).map((key) => ({
    key,
    count: 0,
    best: null,
    worst: null,
  }));

  const level2 = scores.filter(isLevel2Score);

  if (level2.length === 0) {
    return {
      count: 0,
      best: null,
      worst: null,
      latest: null,
      avg: 0,
      pbIds: new Set(),
      testPbIds: new Set(),
      byTest: emptyByTest,
    };
  }

  const chronological = [...level2].sort((a, b) => {
    const da = a.date ?? "";
    const db = b.date ?? "";
    if (da !== db) return da.localeCompare(db);
    return a.id.localeCompare(b.id);
  });

  const pbIds = new Set<string>();
  const testPbIds = new Set<string>();
  let running = -Infinity;
  const runningTest: Partial<Record<TestKey, number>> = {};
  for (const s of chronological) {
    if (s.percent > running) {
      pbIds.add(s.id);
      running = s.percent;
    }
    const k = testKey(s.test);
    if (runningTest[k] == null || s.percent > runningTest[k]!) {
      testPbIds.add(s.id);
      runningTest[k] = s.percent;
    }
  }

  const best = level2.reduce((a, b) => (a.percent >= b.percent ? a : b));
  const worst = level2.reduce((a, b) => (a.percent <= b.percent ? a : b));
  const latest = [...level2].sort((a, b) => {
    const da = a.date ?? "";
    const db = b.date ?? "";
    if (da !== db) return db.localeCompare(da);
    return b.id.localeCompare(a.id);
  })[0];
  const avg = level2.reduce((n, s) => n + s.percent, 0) / level2.length;

  const byTest = emptyByTest.map((row) => {
    const list = level2.filter((s) => testKey(s.test) === row.key);
    if (list.length === 0) return row;
    return {
      ...row,
      count: list.length,
      best: list.reduce((a, b) => (a.percent >= b.percent ? a : b)),
      worst: list.reduce((a, b) => (a.percent <= b.percent ? a : b)),
    };
  });

  return { count: level2.length, best, worst, latest, avg, pbIds, testPbIds, byTest };
}
