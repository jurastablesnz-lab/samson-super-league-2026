import type { Sql } from "./db.ts";

/** One coaching refresh is the whole test, not each movement. */
export const DEFAULT_COACH_CUES_PER_DAY = 8;

export type CoachCue = {
  n: number;
  text: string;
  source: "ai" | "edit";
};

export type CueEvidence = {
  firstName: string;
  horseName: string;
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

export function coachTtsMode(raw: string | undefined): "browser" | "xai" {
  return raw?.trim().toLowerCase() === "xai" ? "xai" : "browser";
}

export function riderFirstName(name: string | null | undefined): string {
  const word = (name ?? "").trim().split(/\s+/)[0] ?? "";
  return /^[A-Za-z][A-Za-z'’-]{0,30}$/.test(word) ? word : "";
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
    `Rider first name: ${evidence.firstName || "unknown"}`,
    `Horse: ${evidence.horseName}`,
    `Test: ${evidence.testName}`,
  ];
  if (evidence.results.length === 0 && evidence.sheets.length === 0 && evidence.notes.length === 0 && evidence.visits.length === 0) {
    lines.push("Evidence: none.");
    return lines.join("\n");
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
  return lines.join("\n");
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

/** An edited line stays, including a blank a coach cleared. */
export function mergeCoachCues(previous: CoachCue[], generated: { n: number; text: string }[]): CoachCue[] {
  const edits = new Map(previous.filter((cue) => cue.source === "edit").map((cue) => [cue.n, cue]));
  const seen = new Set<number>();
  const merged = generated.map((cue) => {
    seen.add(cue.n);
    return edits.get(cue.n) ?? { n: cue.n, text: cue.text, source: "ai" as const };
  });
  for (const edit of edits.values()) {
    if (!seen.has(edit.n)) merged.push(edit);
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
