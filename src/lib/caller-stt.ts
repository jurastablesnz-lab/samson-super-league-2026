import type { Sql } from "./db.ts";

/** Ten minutes. At $0.10 per hour that is about two cents a day. */
export const DEFAULT_STT_SECONDS_PER_DAY = 600;

export function coachSttSecondsPerDay(raw: string | undefined): number {
  const value = Number(raw?.trim());
  if (!Number.isInteger(value) || value < 1) return DEFAULT_STT_SECONDS_PER_DAY;
  return value;
}

export function sttLimitMessage(limit: number): string {
  const minutes = Math.max(1, Math.round(limit / 60));
  return `You've used today's ${minutes} minutes of voice commands. The buttons still work, and you can say more tomorrow.`;
}

export function clipSeconds(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(8, Math.max(1, Math.round(value)));
}

export async function claimSttSeconds(
  sql: Sql,
  input: { userId: string; limit: number; day: string; seconds: number },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const seconds = clipSeconds(input.seconds);
  const rows = await sql<{ seconds: number }>`
    insert into coach_stt_days (user_id, read_on, seconds)
    select ${input.userId}, ${input.day}::date, ${seconds}::int
    where ${seconds}::int <= ${input.limit}::int
    on conflict (user_id, read_on) do update
      set seconds = coach_stt_days.seconds + ${seconds}::int, updated_at = now()
      where coach_stt_days.seconds + ${seconds}::int <= ${input.limit}::int
    returning seconds`;
  if (!rows.length) return { ok: false, error: sttLimitMessage(input.limit) };
  return { ok: true };
}

export async function releaseSttSeconds(
  sql: Sql,
  input: { userId: string; day: string; seconds: number },
): Promise<void> {
  const seconds = clipSeconds(input.seconds);
  await sql`update coach_stt_days
    set seconds = greatest(0, seconds - ${seconds}::int), updated_at = now()
    where user_id = ${input.userId} and read_on = ${input.day}::date`;
}

export function transcriptFromStt(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const text = (body as { text?: unknown }).text;
  return typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";
}
