import type { Sql } from "./db.ts";

/** One coaching refresh is the whole test, not each movement. */
export const DEFAULT_COACH_CUES_PER_DAY = 8;

export type CoachCue = {
  n: number;
  text: string;
  source: "ai" | "edit";
  /** How this movement is said, when the automatic reading is wrong. */
  spoken?: string;
};

export type CueEvidence = {
  firstName: string;
  horseName: string;
  /** Registered name, only so the model can be told not to say it. */
  registeredName?: string;
  testName: string;
  sheets: {
    date: string;
    summary: string;
    lowMarks: { movement: string; mark: string; comment: string }[];
    remarks: string[];
  }[];
  notes: { date: string; text: string }[];
  visits: { date: string; focus: string; homework: string; leaveIt: string }[];
  results: { date: string; test: string; percent: number | null; place: string }[];
};

export function coachCuesPerDay(raw: string | undefined): number {
  const value = Number(raw?.trim());
  if (!Number.isInteger(value) || value < 1) return DEFAULT_COACH_CUES_PER_DAY;
  return value;
}

export function coachCueLimitMessage(limit: number): string {
  const noun = limit === 1 ? "coaching refresh" : "coaching refreshes";
  return `You've used today's ${limit} ${noun}. You can refresh more tomorrow.`;
}

/** About ten Novice tests of instructions plus cues. xAI TTS is about $15 per million characters. */
export const DEFAULT_COACH_TTS_CHARS_PER_DAY = 40_000;

/** Warmer English voices than eve (energetic British). The first one present is used. */
export const WARMER_ENGLISH_VOICES = ["ara", "lumen", "ursa"] as const;

export function coachTtsMode(raw: string | undefined, apiKey?: string | null): "browser" | "xai" {
  const set = raw?.trim().toLowerCase();
  if (set === "browser") return "browser";
  if (set === "xai") return "xai";
  return apiKey?.trim() ? "xai" : "browser";
}

export function coachTtsCharsPerDay(raw: string | undefined): number {
  const value = Number(raw?.trim());
  if (!Number.isInteger(value) || value < 1) return DEFAULT_COACH_TTS_CHARS_PER_DAY;
  return value;
}

export function coachTtsLimitMessage(limit: number): string {
  return `You've used today's ${limit.toLocaleString("en-NZ")} voice characters. New lines use this phone's voice until tomorrow.`;
}

/** An explicit XAI_TTS_VOICE wins. Otherwise the warmest known English voice, or eve. */
export function coachTtsVoice(explicit?: string | null, known: readonly string[] = ["ara", "lumen", "ursa", "eve"]): string {
  const set = explicit?.trim().toLowerCase() ?? "";
  if (set) return set.slice(0, 32);
  const have = new Set(known.map((id) => id.toLowerCase()));
  return WARMER_ENGLISH_VOICES.find((id) => have.has(id)) ?? "eve";
}

export async function claimTtsChars(
  sql: Sql,
  input: { userId: string; limit: number; day: string; chars: number },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const chars = Math.max(0, Math.round(input.chars));
  if (chars < 1) return { ok: true };
  const rows = await sql<{ chars: number }>`
    insert into coach_tts_days (user_id, read_on, chars)
    select ${input.userId}, ${input.day}::date, ${chars}::int
    where ${chars}::int <= ${input.limit}::int
    on conflict (user_id, read_on) do update
      set chars = coach_tts_days.chars + ${chars}::int, updated_at = now()
      where coach_tts_days.chars + ${chars}::int <= ${input.limit}::int
    returning chars`;
  if (!rows.length) return { ok: false, error: coachTtsLimitMessage(input.limit) };
  return { ok: true };
}

export async function releaseTtsChars(
  sql: Sql,
  input: { userId: string; day: string; chars: number },
): Promise<void> {
  const chars = Math.max(0, Math.round(input.chars));
  if (chars < 1) return;
  await sql`update coach_tts_days
    set chars = greatest(0, chars - ${chars}::int), updated_at = now()
    where user_id = ${input.userId} and read_on = ${input.day}::date`;
}

export function riderFirstName(name: string | null | undefined): string {
  const word = (name ?? "").trim().split(/\s+/)[0] ?? "";
  return /^[A-Za-z][A-Za-z'’-]{0,30}$/.test(word) ? word : "";
}

/**
 * The name to speak. The application or rider profile wins. The sign-in account
 * name is never used, so a Google account called "Virtual Dressage" does not
 * become "Virtual".
 */
export function cueRiderName(input: {
  applicationName?: string | null;
  profileName?: string | null;
  accountName?: string | null;
}): string {
  const account = riderFirstName(input.accountName);
  const application = riderFirstName(input.applicationName);
  if (application && application.toLowerCase() !== account.toLowerCase()) return application;
  const profile = riderFirstName(input.profileName);
  if (profile && profile.toLowerCase() !== account.toLowerCase()) return profile;
  return "";
}

/** What the caller calls the horse. A paddock name wins; results keep the registered name. */
export function spokenHorseName(registered: string, paddock?: string | null): string {
  const barn = (paddock ?? "").trim();
  return barn || registered.trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Replace a wrong leading name, and the registered horse name once a paddock name is set. */
export function rewriteCueText(
  text: string,
  opts: { riderName: string; dropNames: string[]; spokenHorse: string; registeredName: string },
): string {
  let next = text.replace(/\s+/g, " ").trim();
  const drops = opts.dropNames.map((name) => name.trim()).filter((name) => name && name.toLowerCase() !== opts.riderName.toLowerCase());
  for (const drop of drops) {
    const lead = new RegExp(`^${escapeRegExp(drop)}\\b[,:]?\\s*`, "i");
    if (lead.test(next)) next = next.replace(lead, opts.riderName ? `${opts.riderName}, ` : "");
  }
  const registered = opts.registeredName.trim();
  const spoken = opts.spokenHorse.trim();
  if (registered && spoken && registered.toLowerCase() !== spoken.toLowerCase()) {
    next = next.replace(new RegExp(escapeRegExp(registered), "gi"), spoken);
  }
  return next.replace(/\s+/g, " ").trim();
}

/** A photographed sheet counts for this test when its name is the same test. */
export function sheetMatchesTest(sheetTest: string, testId: string, testName: string): boolean {
  const label = sheetTest.toLowerCase();
  const id = testId.toLowerCase();
  if (!label.trim()) return false;
  if (id === "mfs" || /freestyle/.test(testName.toLowerCase())) return /freestyle|\bmfs\b/.test(label);
  if (/^[1-7][a-d]$/.test(id)) {
    const spaced = new RegExp(`\\b${id[0]}\\s*${id[1]}\\b`, "i");
    if (spaced.test(sheetTest)) return true;
  }
  return testName.length > 2 && label.includes(testName.toLowerCase());
}

export function evidenceScript(evidence: CueEvidence): string {
  const lines: string[] = [
    evidence.firstName
      ? `Rider first name: ${evidence.firstName}`
      : "Rider first name: none. Do not address the rider by name.",
    `Horse: ${evidence.horseName}`,
    evidence.registeredName &&
    evidence.registeredName.toLowerCase() !== evidence.horseName.toLowerCase()
      ? `Do not call the horse ${evidence.registeredName}.`
      : "",
    `Test: ${evidence.testName}`,
  ];
  if (evidence.results.length === 0 && evidence.sheets.length === 0 && evidence.notes.length === 0 && evidence.visits.length === 0) {
    lines.push("Evidence: none.");
    return lines.filter(Boolean).join("\n");
  }
  for (const result of evidence.results) {
    const percent = result.percent == null ? "percent not recorded" : `${result.percent}%`;
    lines.push(
      `Result ${result.date} ${result.test}: ${percent}${result.place ? `, place ${result.place}` : ""}.`,
    );
  }
  for (const sheet of evidence.sheets) {
    lines.push(`Judge sheet ${sheet.date}: ${sheet.summary}`);
    for (const mark of sheet.lowMarks) {
      lines.push(
        `Movement mark: ${mark.movement} — ${mark.mark || "mark not recorded"}. ${mark.comment}`.trim(),
      );
    }
    for (const remark of sheet.remarks) lines.push(`Judge remark: ${remark}`);
  }
  for (const note of evidence.notes) lines.push(`Ride note ${note.date}: ${note.text}`);
  for (const visit of evidence.visits) {
    lines.push(
      `Coach ${visit.date}: ${[visit.focus, visit.homework, visit.leaveIt].filter(Boolean).join(" ")}`.trim(),
    );
  }
  return lines.filter(Boolean).join("\n");
}

function scoreTokens(text: string): string[] {
  return [...text.matchAll(/\b\d{1,3}(?:\.\d+)?\b/g)].map((match) => match[0]);
}

/** A cue may quote a number only when that exact number is in the evidence or is the movement number. */
export function cueIsGrounded(cue: string, evidence: string, movementNumbers: number[]): boolean {
  const allowed = new Set(scoreTokens(evidence));
  for (const n of movementNumbers) allowed.add(String(n));
  return scoreTokens(cue).every((token) => allowed.has(token));
}

export function acceptCues(
  raw: string,
  movements: { n: number }[],
  evidence: string,
): { n: number; text: string }[] {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  let parsed: { n?: unknown; text?: unknown }[] = [];
  if (start >= 0 && end > start) {
    try {
      const body = JSON.parse(raw.slice(start, end + 1)) as { cues?: unknown };
      if (Array.isArray(body.cues)) parsed = body.cues as { n?: unknown; text?: unknown }[];
    } catch {
      parsed = [];
    }
  }
  const numbers = movements.map((movement) => movement.n);
  return movements.map((movement) => {
    const hit = parsed.find((item) => Number(item?.n) === movement.n);
    const text = typeof hit?.text === "string" ? hit.text.replace(/\s+/g, " ").trim().slice(0, 320) : "";
    if (!text || !cueIsGrounded(text, evidence, numbers)) return { n: movement.n, text: "" };
    return { n: movement.n, text };
  });
}

function withSpoken(cue: CoachCue, spoken?: string): CoachCue {
  const words = (spoken ?? cue.spoken ?? "").trim();
  if (!words) {
    const { spoken: _omit, ...rest } = cue;
    return rest;
  }
  return { ...cue, spoken: words };
}

/** An edited line stays, including a blank a coach cleared. A spoken override stays too. */
export function mergeCoachCues(previous: CoachCue[], generated: { n: number; text: string }[]): CoachCue[] {
  const edits = new Map(previous.filter((cue) => cue.source === "edit").map((cue) => [cue.n, cue]));
  const spoken = new Map(previous.map((cue) => [cue.n, cue.spoken?.trim() ?? ""]));
  const seen = new Set<number>();
  const merged = generated.map((cue) => {
    seen.add(cue.n);
    const edit = edits.get(cue.n);
    if (edit) return withSpoken(edit);
    return withSpoken({ n: cue.n, text: cue.text, source: "ai" as const }, spoken.get(cue.n));
  });
  for (const edit of edits.values()) {
    if (!seen.has(edit.n)) merged.push(withSpoken(edit));
  }
  return merged.sort((a, b) => a.n - b.n);
}

export async function claimCoachGeneration(
  sql: Sql,
  input: { userId: string; limit: number; day: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await sql<{ reads: number }>`
    insert into coach_generations (user_id, read_on, reads)
    values (${input.userId}, ${input.day}::date, 1)
    on conflict (user_id, read_on) do update
      set reads = coach_generations.reads + 1, updated_at = now()
      where coach_generations.reads < ${input.limit}
    returning reads`;
  if (!rows.length) return { ok: false, error: coachCueLimitMessage(input.limit) };
  return { ok: true };
}
