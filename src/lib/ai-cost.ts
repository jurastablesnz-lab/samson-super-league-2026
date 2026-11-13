import type { Sql } from "./db.ts";
import { MEDIA_LIMITS } from "./media-object.ts";
import { aucklandDay } from "./sheet-reads.ts";

/**
 * What one unit of xAI work costs. Grok 4.5 is the chat model in the sheet reader
 * and the cue writer: US$2 per million input tokens and US$6 per million output
 * tokens under 200k context. Images are input tokens. TTS is US$15 per million
 * characters. Speech-to-text is US$0.10 per hour.
 */
export const AI_RATES = {
  model: "grok-4.5",
  chatInputUsdPerMillion: 2,
  chatOutputUsdPerMillion: 6,
  ttsUsdPerMillionChars: 15,
  sttUsdPerHour: 0.1,
  /** System prompt, horse line, and the short user prompt in summarise-sheet.server.ts. */
  sheetTextInputTokens: 900,
  /** One compressed sheet photo, about the size compressSheetPhoto keeps. */
  sheetImageTokens: 1_100,
  sheetOutputTokens: 900,
  sheetOutputTokensMulti: 1_400,
  /**
   * Cue refresh: the short system prompt, up to four sheets, eight notes, six
   * visits, six results, and the movement list. Output is one short cue each.
   */
  coachInputTokens: 2_200,
  coachOutputTokens: 800,
} as const;

/** Cloudflare R2 published rates. This app does not meter storage. */
export const R2_RATES = {
  storageUsdPerGbMonth: 0.015,
  classAUsdPerMillion: 4.5,
  classBUsdPerMillion: 0.36,
  egressUsd: 0,
  freeStorageGb: 10,
  videoCapBytes: MEDIA_LIMITS.video,
  musicCapBytes: MEDIA_LIMITS.music,
  floorplanCapBytes: MEDIA_LIMITS.floorplan,
} as const;

const MICROS = 1_000_000;
export const DEFAULT_MONTHLY_BUDGET_USD = 3;

export function monthlyBudgetUsd(raw: string | undefined): number {
  const value = Number(raw?.trim());
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_MONTHLY_BUDGET_USD;
  return Math.min(1000, value);
}

export function usdToMicros(usd: number): number {
  if (!Number.isFinite(usd) || usd <= 0) return 0;
  return Math.round(usd * MICROS);
}

export function microsToUsd(micros: number): number {
  return Math.max(0, micros) / MICROS;
}

export function ttsUsd(chars: number): number {
  return (Math.max(0, chars) / 1_000_000) * AI_RATES.ttsUsdPerMillionChars;
}

export function sttUsd(seconds: number): number {
  return (Math.max(0, seconds) / 3600) * AI_RATES.sttUsdPerHour;
}

function chatUsd(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * AI_RATES.chatInputUsdPerMillion +
    (outputTokens / 1_000_000) * AI_RATES.chatOutputUsdPerMillion
  );
}

/** One judge-sheet read. More photos cost more because each photo is input tokens. */
export function sheetReadUsd(images: number): number {
  const count = Math.min(6, Math.max(1, Math.round(images) || 1));
  const output = count > 1 ? AI_RATES.sheetOutputTokensMulti : AI_RATES.sheetOutputTokens;
  return chatUsd(AI_RATES.sheetTextInputTokens + count * AI_RATES.sheetImageTokens, output);
}

/** One coaching refresh for a test. */
export function coachRefreshUsd(): number {
  return chatUsd(AI_RATES.coachInputTokens, AI_RATES.coachOutputTokens);
}

/**
 * Eight two-photo sheet reads, four cue refreshes, four tests spoken once
 * (about 8,000 characters each), and twelve rides of twenty short commands.
 */
export function typicalRiderMonthUsd(): number {
  return sheetReadUsd(2) * 8 + coachRefreshUsd() * 4 + ttsUsd(8_000 * 4) + sttUsd(12 * 20 * 1.5);
}

export function aucklandMonthStart(day = aucklandDay()): string {
  return `${day.slice(0, 7)}-01`;
}

export function nextMonthStart(day = aucklandDay()): string {
  const [year, month] = day.split("-").map(Number);
  if (month === 12) return `${year + 1}-01-01`;
  return `${year}-${String(month + 1).padStart(2, "0")}-01`;
}

export function monthlyLimitMessage(resetsOn: string): string {
  const [year, month, date] = resetsOn.split("-").map(Number);
  const label = new Date(Date.UTC(year, month - 1, date)).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return `Monthly limit reached, resets on ${label}.`;
}

export function formatUsd(usd: number): string {
  return `US$${Math.max(0, usd).toFixed(2)}`;
}

export async function claimAiMicros(
  sql: Sql,
  input: { userId: string; month: string; micros: number; budgetMicros: number },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const micros = Math.round(input.micros);
  if (micros < 1) return { ok: true };
  const rows = await sql<{ micros: number }>`
    insert into ai_spend (user_id, month_on, micros)
    select ${input.userId}, ${input.month}::date, ${micros}::int
    where ${micros}::int <= ${input.budgetMicros}::int
    on conflict (user_id, month_on) do update
      set micros = ai_spend.micros + ${micros}::int, updated_at = now()
      where ai_spend.micros + ${micros}::int <= ${input.budgetMicros}::int
    returning micros`;
  if (!rows.length) return { ok: false, error: monthlyLimitMessage(nextMonthStart(input.month)) };
  return { ok: true };
}

export async function refundAiMicros(
  sql: Sql,
  input: { userId: string; month: string; micros: number },
): Promise<void> {
  const micros = Math.round(input.micros);
  if (micros < 1) return;
  await sql`update ai_spend
    set micros = greatest(0, micros - ${micros}::int), updated_at = now()
    where user_id = ${input.userId} and month_on = ${input.month}::date`;
}

/** Admins are not counted. A cached line should pass usd 0 and is not counted. */
export async function reserveMonthlySpend(
  sql: Sql,
  input: { userId: string; limited: boolean; usd: number; budgetUsd?: string; day?: string },
): Promise<{ ok: true; micros: number; month: string } | { ok: false; error: string }> {
  const day = input.day ?? aucklandDay();
  const month = aucklandMonthStart(day);
  const micros = usdToMicros(input.usd);
  if (!input.limited || micros < 1) return { ok: true, micros: 0, month };
  const claim = await claimAiMicros(sql, {
    userId: input.userId,
    month,
    micros,
    budgetMicros: usdToMicros(monthlyBudgetUsd(input.budgetUsd)),
  });
  if (!claim.ok) return { ok: false, error: monthlyLimitMessage(nextMonthStart(day)) };
  return { ok: true, micros, month };
}
