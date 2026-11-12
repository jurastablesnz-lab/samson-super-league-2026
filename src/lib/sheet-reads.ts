import type { Sql } from "./db.ts";

/** Used when SHEET_READS_PER_DAY is unset or not a positive number. */
export const DEFAULT_SHEET_READS_PER_DAY = 20;

export function sheetReadsPerDay(raw: string | undefined): number {
  const value = Number(raw?.trim());
  if (!Number.isInteger(value) || value < 1) return DEFAULT_SHEET_READS_PER_DAY;
  return value;
}

/** Calendar day in New Zealand, so a rider's allowance resets with their morning. */
export function aucklandDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function sheetReadLimitMessage(limit: number): string {
  const noun = limit === 1 ? "sheet read" : "sheet reads";
  return `You've used today's ${limit} ${noun}. You can send more tomorrow.`;
}

/** Admins may read without a cap. Everyone else needs an approved beta place. */
export function sheetReadGate(input: {
  approved: boolean;
  isAdmin: boolean;
}): { ok: true; limited: boolean } | { ok: false; error: string } {
  if (input.isAdmin) return { ok: true, limited: false };
  if (!input.approved) return { ok: false, error: "Your beta place is not approved yet." };
  return { ok: true, limited: true };
}

export async function takeSheetRead(
  sql: Sql,
  input: { userId: string; approved: boolean; isAdmin: boolean; limit: number; day: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = sheetReadGate(input);
  if (!gate.ok) return gate;
  if (!gate.limited) return { ok: true };
  return claimSheetRead(sql, input);
}

/**
 * Count one read for an approved rider. The update only lands while the day is
 * still under the limit, so two requests at once cannot both sneak past it.
 * Admins never call this.
 */
export async function claimSheetRead(
  sql: Sql,
  input: { userId: string; limit: number; day: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await sql<{ reads: number }>`
    insert into sheet_reads (user_id, read_on, reads)
    values (${input.userId}, ${input.day}::date, 1)
    on conflict (user_id, read_on) do update
      set reads = sheet_reads.reads + 1, updated_at = now()
      where sheet_reads.reads < ${input.limit}
    returning reads`;
  if (!rows.length) return { ok: false, error: sheetReadLimitMessage(input.limit) };
  return { ok: true };
}
