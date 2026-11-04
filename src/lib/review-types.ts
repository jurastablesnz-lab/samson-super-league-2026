export type SheetInput = {
  imageBase64: string;
  mime: string;
  testHint: string;
  showName: string;
};

export type ReviewKind = "video" | "sheet";

export type WorkOn = {
  title: string;
  why: string;
  how: string;
};

export type LowMark = {
  movement: string;
  mark: string;
  comment: string;
};

export type SheetRead = {
  readable: boolean;
  test: string;
  percent: number | null;
  place: string | null;
  judge: string | null;
  summary: string;
  lowMarks: LowMark[];
  strengths: string[];
  workOns: WorkOn[];
  collectives: string | null;
  caveat: string | null;
};

export type ReviewItem = {
  id: string;
  kind: ReviewKind;
  showId: string;
  date: string;
  test: string;
  note: string;
  mime: string;
  sheet?: SheetRead;
};

function asText(value: unknown, max = 400) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function asNum(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n) || n <= 0 || n > 100) return null;
  return Math.round(n * 100) / 100;
}

export function parseSheetRead(text: string): SheetRead | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const lowMarks = Array.isArray(row.lowMarks)
    ? row.lowMarks
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const m = item as Record<string, unknown>;
          const movement = asText(m.movement, 80);
          if (!movement) return null;
          return {
            movement,
            mark: asText(m.mark, 12),
            comment: asText(m.comment, 180),
          };
        })
        .filter((item): item is LowMark => item != null)
        .slice(0, 6)
    : [];
  const strengths = Array.isArray(row.strengths)
    ? row.strengths.map((item) => asText(item, 160)).filter(Boolean).slice(0, 3)
    : [];
  const workOns = Array.isArray(row.workOns)
    ? row.workOns
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const w = item as Record<string, unknown>;
          const title = asText(w.title, 80);
          const how = asText(w.how, 280);
          if (!title || !how) return null;
          return { title, why: asText(w.why, 180), how };
        })
        .filter((item): item is WorkOn => item != null)
        .slice(0, 3)
    : [];
  const summary = asText(row.summary, 600);
  if (!summary && workOns.length === 0) return null;
  return {
    readable: row.readable !== false,
    test: asText(row.test, 24) || "unknown",
    percent: asNum(row.percent),
    place: asText(row.place, 24) || null,
    judge: asText(row.judge, 80) || null,
    summary: summary || "The sheet was only partly readable.",
    lowMarks,
    strengths,
    workOns,
    collectives: asText(row.collectives, 240) || null,
    caveat: asText(row.caveat, 240) || null,
  };
}
