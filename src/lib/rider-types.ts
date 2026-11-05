/** Shared (client + server) shapes for the per-rider workspace. */
import type { HorseEntry } from "./beta";
import type { FreestyleRef, GeneratedPlan, PlanConfig } from "./plan-builder";
import type { ReviewItem, SheetRead } from "./review-types";

export type HorseRecord = {
  id: string;
  name: string;
  level: string;
  esnzNumber: string;
  notes: string;
  isLegacySamson: boolean;
  sortOrder: number;
};

export type Progress = { done: Record<string, boolean>; pack: Record<string, boolean> };

export type PlanRecord = {
  horseId: string;
  config: PlanConfig;
  plan: GeneratedPlan | null;
  progress: Progress;
  freestyle: FreestyleRef | null;
  updatedAt: string;
};

export type ResultSource = "app" | "legacy" | "evo_csv";

export type ResultRecord = {
  id: string;
  source: ResultSource;
  showId: string;
  showName: string;
  date: string;
  test: string;
  level: string;
  percent: number | null;
  place: string;
  status: string;
  judges: string;
  notes: string;
  eventUrl: string;
};

export type NoteRecord = { id: string; date: string; text: string };

export type SheetRecord = {
  id: string;
  kind: "sheet" | "video";
  showId: string;
  showName: string;
  date: string;
  test: string;
  note: string;
  mime: string;
  sheet: SheetRead | null;
  photos: { id: string; label?: string }[] | null;
};

export type HorseLog = {
  horseId: string;
  results: ResultRecord[];
  notes: NoteRecord[];
  sheets: SheetRecord[];
  progress: Progress;
};

export type RiderState = {
  setupCompletedAt: string | null;
  legacyImportedAt: string | null;
  legacySyncedAt: string | null;
};

export type Workspace = {
  userId: string;
  isOwner: boolean;
  displayName: string;
  rider: RiderState;
  horses: HorseRecord[];
  plans: Record<string, PlanRecord>;
  /** Horses from the beta application, to prefill the setup wizard. */
  applicationHorses: HorseEntry[];
  riderGrade: string;
};

/** What the owner's original single-rider app keeps in localStorage. */
export type LegacySnapshot = {
  done: Record<string, boolean>;
  pack: Record<string, boolean>;
  scores: {
    id: string;
    showId: string;
    showName?: string;
    date?: string;
    test: string;
    percent: number;
    notes: string;
    place?: string;
    official?: boolean;
    status?: string;
    level?: string;
    judges?: string;
    eventUrl?: string;
  }[];
  notes: { id: string; date: string; text: string }[];
  review: ReviewItem[];
};

export type SetupHorseInput = {
  id?: string;
  name: string;
  level: string;
  esnzNumber?: string;
  notes?: string;
  config: PlanConfig;
};

export type EvoImportRowResult = {
  line: number;
  rider: string;
  horse: string;
  esnz: string;
  percent: number | null;
  match: { horseId: string; horseName: string; riderName: string; by: "esnz" | "horse+rider" | "horse" } | null;
  reason?: string;
  inserted?: boolean;
  duplicate?: boolean;
};

export type EvoImportResult = {
  dryRun: boolean;
  importId: number | null;
  total: number;
  matched: number;
  inserted: number;
  duplicates: number;
  rows: EvoImportRowResult[];
};

export function emptySnapshot(): LegacySnapshot {
  return { done: {}, pack: {}, scores: [], notes: [], review: [] };
}

/** Normalise whatever is in localStorage (zustand persist envelope or raw state). */
export function snapshotFromStorage(raw: string | null): LegacySnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { state?: unknown } | null;
    const s = ((parsed && typeof parsed === "object" && "state" in parsed ? parsed.state : parsed) ?? {}) as Record<
      string,
      unknown
    >;
    const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, boolean>) : {});
    const arr = <T,>(v: unknown) => (Array.isArray(v) ? (v as T[]) : []);
    return {
      done: obj(s.done),
      pack: obj(s.pack),
      scores: arr<LegacySnapshot["scores"][number]>(s.scores).filter(
        (x) => x && typeof x.id === "string" && !x.official && !x.id.startsWith("evo-"),
      ),
      notes: arr<LegacySnapshot["notes"][number]>(s.notes).filter((x) => x && typeof x.text === "string"),
      review: arr<ReviewItem>(s.review).filter((x) => x && typeof x.id === "string"),
    };
  } catch {
    return null;
  }
}

export function snapshotCounts(s: LegacySnapshot) {
  return {
    scores: s.scores.length,
    notes: s.notes.length,
    sheets: s.review.length,
    ticks: Object.values(s.done).filter(Boolean).length,
  };
}

export function snapshotIsEmpty(s: LegacySnapshot) {
  const c = snapshotCounts(s);
  return c.scores + c.notes + c.sheets + c.ticks + Object.values(s.pack).filter(Boolean).length === 0;
}

/** Union of two snapshots (by id). `a` wins on conflicts. Never drops anything. */
export function mergeSnapshots(a: LegacySnapshot, b: LegacySnapshot): LegacySnapshot {
  const byId = <T extends { id: string }>(x: T[], y: T[]) => {
    const seen = new Set(x.map((i) => i.id));
    return [...x, ...y.filter((i) => !seen.has(i.id))];
  };
  const or = (x: Record<string, boolean>, y: Record<string, boolean>) => {
    const out: Record<string, boolean> = { ...y };
    for (const [k, v] of Object.entries(x)) out[k] = v || !!y[k];
    return out;
  };
  return {
    done: or(a.done, b.done),
    pack: or(a.pack, b.pack),
    scores: byId(a.scores, b.scores),
    notes: byId(a.notes, b.notes),
    review: byId(a.review, b.review),
  };
}
