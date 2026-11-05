export const MAX_SHEET_PHOTOS = 6;
/** Per-image base64 cap. 6 x 650k keeps the request under Vercel's 4.5 MB function body limit. */
export const MAX_PHOTO_BASE64 = 650_000;
export const MAX_TOTAL_BASE64 = 4_000_000;

export type SheetImage = {
  imageBase64: string;
  mime: string;
  /** Optional judge position or label, e.g. "C", "E", "Judge 2". */
  label?: string;
};

export type SheetInput = {
  /** Legacy single-photo shape. */
  imageBase64?: string;
  mime?: string;
  images?: SheetImage[];
  testHint: string;
  showName: string;
  /** Optional horse + level hints (generated rider plans). Defaults to Samson. */
  horseName?: string;
  level?: string;
};

export type JudgeRead = {
  position: string;
  name: string | null;
  percent: number | null;
  remarks: string[];
};

export type SheetPhoto = {
  id: string;
  label?: string;
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
  /** Optional, multi-judge reads only. */
  judges?: JudgeRead[];
  agreement?: string | null;
  disagreement?: string | null;
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
  /** Sheet photos in IndexedDB. Missing on old single-photo entries, whose photo is stored under id. */
  photos?: SheetPhoto[];
};

export function sheetPhotoIds(item: Pick<ReviewItem, "id" | "photos">): SheetPhoto[] {
  return item.photos && item.photos.length > 0 ? item.photos : [{ id: item.id }];
}

function asText(value: unknown, max = 400) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function asNum(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n) || n <= 0 || n > 100) return null;
  return Math.round(n * 100) / 100;
}

/** Normalises legacy single-image input and multi-image input into one validated list. */
export function normaliseSheetImages(input: SheetInput | null | undefined): SheetImage[] {
  if (!input || typeof input !== "object") throw new Error("Photo missing");
  const list: SheetImage[] = Array.isArray(input.images)
    ? input.images
    : typeof input.imageBase64 === "string"
      ? [{ imageBase64: input.imageBase64, mime: input.mime ?? "image/jpeg" }]
      : [];
  if (list.length === 0) throw new Error("Photo missing");
  if (list.length > MAX_SHEET_PHOTOS) throw new Error(`Up to ${MAX_SHEET_PHOTOS} photos per test`);
  let total = 0;
  const out = list.map((img) => {
    if (!img || typeof img.imageBase64 !== "string" || img.imageBase64.length < 80)
      throw new Error("Photo missing");
    if (img.imageBase64.length > MAX_PHOTO_BASE64 + 50_000) throw new Error("Photo too large");
    total += img.imageBase64.length;
    return {
      imageBase64: img.imageBase64,
      mime: img.mime === "image/png" ? "image/png" : "image/jpeg",
      label: asText(img.label, 24) || undefined,
    };
  });
  if (total > MAX_TOTAL_BASE64 + 100_000) throw new Error("Photos too large together");
  return out;
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
    ? row.strengths
        .map((item) => asText(item, 160))
        .filter(Boolean)
        .slice(0, 3)
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
  const judges = Array.isArray(row.judges)
    ? row.judges
        .map((item, i) => {
          if (!item || typeof item !== "object") return null;
          const j = item as Record<string, unknown>;
          const remarks = Array.isArray(j.remarks)
            ? j.remarks
                .map((r) => asText(r, 180))
                .filter(Boolean)
                .slice(0, 4)
            : [];
          const percent = asNum(j.percent);
          const position = asText(j.position, 24) || `Judge ${i + 1}`;
          if (percent == null && remarks.length === 0) return null;
          return { position, name: asText(j.name, 80) || null, percent, remarks };
        })
        .filter((item): item is JudgeRead => item != null)
        .slice(0, 5)
    : [];
  const summary = asText(row.summary, 900);
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
    ...(judges.length > 0 ? { judges } : {}),
    ...(asText(row.agreement, 300) ? { agreement: asText(row.agreement, 300) } : {}),
    ...(asText(row.disagreement, 300) ? { disagreement: asText(row.disagreement, 300) } : {}),
  };
}
