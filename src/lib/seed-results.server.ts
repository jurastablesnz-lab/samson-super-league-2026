/**
 * One-tap import of the beta results shipped in data/seed/master-results.csv.
 *
 * Horses are matched by ESNZ number only. The same dedupe key as the EVO CSV
 * import skips a row that is already pending, kept or rejected, so this never
 * overrides a rider's review. New rows are saved as kept results and show on
 * the horse's plan. This does not contact EVO Events.
 */
import type { Sql } from "./db.ts";
import { inferDressageTest } from "./dressage-test.ts";
import {
  evoDedupeKey,
  normaliseEsnz,
  normaliseHeader,
  parseEvoResultsCsv,
  type EvoRow,
} from "./evo-csv.ts";
import type { SeedImportReport, SeedUnmatchedRow } from "./seed-results.ts";

export type { SeedImportReport, SeedUnmatchedRow };

type HorseHit = { id: string; userId: string; name: string };

/** Level plus class number. The dressage test, when known, is stored separately. */
export function seedTestLabel(row: EvoRow): string {
  const level = row.level.trim();
  const klass = (row.className || row.test).trim();
  if (level && klass && level.toLowerCase() !== klass.toLowerCase()) {
    return `${level} · ${klass}`.slice(0, 80);
  }
  return (level || klass).slice(0, 80);
}

export function seedDressageTest(row: EvoRow): string {
  return (
    inferDressageTest({
      date: row.date,
      percent: row.percent,
      place: row.place,
      test: seedTestLabel(row),
    }) ?? ""
  );
}

function judgesOf(row: EvoRow): string {
  if (row.judges.trim()) return row.judges.slice(0, 300);
  const raw = row.raw ?? {};
  const hit = Object.entries(raw).find(([key]) => normaliseHeader(key) === "judges");
  return (hit?.[1] ?? "").slice(0, 300);
}

export async function readShippedSeedCsv(): Promise<string> {
  try {
    const mod = (await import("./seed-results-csv.ts")) as { default?: string };
    if (typeof mod.default === "string" && mod.default.includes("Horse,ESNZ")) return mod.default;
  } catch {
    // The Node test runner has no Vite ?raw loader.
  }
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  return readFile(
    fileURLToPath(new URL("../../data/seed/master-results.csv", import.meta.url)),
    "utf8",
  );
}

export async function importSeedResults(
  sql: Sql,
  uploadedBy: string,
  csvText: string,
): Promise<SeedImportReport> {
  const parsed = parseEvoResultsCsv(csvText);
  if (!parsed.rows.length) throw new Error(parsed.warnings[0] ?? "No result rows in the seed file");
  const horses = await sql<{
    id: string;
    user_id: string;
    name: string;
    esnz_number: string | null;
  }>`
    select id, user_id, name, esnz_number from horses where not archived`;
  const byEsnz = new Map<string, HorseHit[]>();
  for (const horse of horses) {
    const esnz = normaliseEsnz(horse.esnz_number ?? "");
    if (!esnz) continue;
    const list = byEsnz.get(esnz) ?? [];
    list.push({ id: horse.id, userId: horse.user_id, name: horse.name });
    byEsnz.set(esnz, list);
  }

  const audit = await sql<{ id: number }>`
    insert into result_imports (uploaded_by, file_name, row_count)
    values (${uploadedBy.slice(0, 200)}, 'master-results.csv', ${parsed.rows.length})
    returning id`;
  const importId = Number(audit[0].id);
  let imported = 0;
  let skipped = 0;
  let unmatched = 0;
  const unmatchedRows: SeedUnmatchedRow[] = [];

  for (const row of parsed.rows) {
    const esnz = normaliseEsnz(row.esnz ?? "");
    const base = { line: row.line, horse: row.horse, esnz: row.esnz, rider: row.rider };
    if (!esnz) {
      unmatched += 1;
      if (unmatchedRows.length < 200) unmatchedRows.push({ ...base, reason: "No ESNZ number" });
      continue;
    }
    const hits = byEsnz.get(esnz) ?? [];
    if (hits.length !== 1) {
      unmatched += 1;
      if (unmatchedRows.length < 200) {
        unmatchedRows.push({
          ...base,
          reason: hits.length
            ? "ESNZ number is on more than one horse"
            : "No horse with this ESNZ number",
        });
      }
      continue;
    }
    const hit = hits[0];
    const inserted = await sql<{ id: number }>`
      insert into results (
        user_id, horse_id, client_id, source, show_id, show_name, ride_date, test, dressage_test, level,
        percent, place, status, judges, notes, dedupe_key, import_id, raw, review_status, rider_name
      ) values (
        ${hit.userId}, ${hit.id}, ${`seed-${importId}-${row.line}`}, 'evo_csv', 'past',
        ${row.event.slice(0, 200)}, ${row.date || null}, ${seedTestLabel(row)}, ${seedDressageTest(row)}, ${row.level.slice(0, 40)},
        ${row.percent}, ${row.place.slice(0, 20)}, ${row.status}, ${judgesOf(row)}, '',
        ${evoDedupeKey(row)}, ${importId}, ${JSON.stringify(row.raw ?? {})}::jsonb, 'kept',
        ${row.rider.slice(0, 120)}
      )
      on conflict do nothing
      returning id`;
    if (inserted.length) imported += 1;
    else skipped += 1;
  }

  await sql`
    update result_imports
    set matched_count = ${imported + skipped}, inserted_count = ${imported},
      summary = ${JSON.stringify({ imported, skipped, unmatched, seed: true })}::jsonb
    where id = ${importId}`;

  return { imported, skipped, unmatched, total: parsed.rows.length, unmatchedRows };
}

export async function importShippedSeedResults(
  sql: Sql,
  uploadedBy: string,
): Promise<SeedImportReport> {
  return importSeedResults(sql, uploadedBy, await readShippedSeedCsv());
}

let shippedRows: EvoRow[] | null = null;

async function rowsInShippedFile(): Promise<EvoRow[]> {
  if (!shippedRows) shippedRows = parseEvoResultsCsv(await readShippedSeedCsv()).rows;
  return shippedRows;
}

/**
 * Copy shipped rows for this horse's ESNZ number onto that horse.
 * The same dedupe key as the admin import means a second save adds nothing.
 * This does not contact EVO Events.
 */
export async function importSeedResultsForHorse(
  sql: Sql,
  userId: string,
  horseId: string,
): Promise<{ imported: number; skipped: number }> {
  const [horse] = await sql<{ esnz_number: string | null }>`
    select esnz_number from horses
    where id = ${horseId} and user_id = ${userId} and not archived`;
  const esnz = normaliseEsnz(horse?.esnz_number ?? "");
  if (!esnz) return { imported: 0, skipped: 0 };
  const rows = (await rowsInShippedFile()).filter((row) => normaliseEsnz(row.esnz) === esnz);
  if (!rows.length) return { imported: 0, skipped: 0 };
  const existing = await sql<{ dedupe_key: string | null }>`
    select dedupe_key from results where horse_id = ${horseId} and dedupe_key is not null`;
  const have = new Set(existing.map((row) => row.dedupe_key));
  const missing = rows.filter((row) => !have.has(evoDedupeKey(row)));
  if (!missing.length) return { imported: 0, skipped: rows.length };

  const audit = await sql<{ id: number }>`
    insert into result_imports (uploaded_by, file_name, row_count)
    values (${userId.slice(0, 200)}, 'master-results.csv', ${missing.length})
    returning id`;
  const importId = Number(audit[0].id);
  let imported = 0;
  for (const row of missing) {
    const inserted = await sql<{ id: number }>`
      insert into results (
        user_id, horse_id, client_id, source, show_id, show_name, ride_date, test, dressage_test, level,
        percent, place, status, judges, notes, dedupe_key, import_id, raw, review_status, rider_name
      ) values (
        ${userId}, ${horseId}, ${`seed-${importId}-${row.line}`}, 'evo_csv', 'past',
        ${row.event.slice(0, 200)}, ${row.date || null}, ${seedTestLabel(row)}, ${seedDressageTest(row)}, ${row.level.slice(0, 40)},
        ${row.percent}, ${row.place.slice(0, 20)}, ${row.status}, ${judgesOf(row)}, '',
        ${evoDedupeKey(row)}, ${importId}, ${JSON.stringify(row.raw ?? {})}::jsonb, 'kept',
        ${row.rider.slice(0, 120)}
      )
      on conflict do nothing
      returning id`;
    if (inserted.length) imported += 1;
  }
  await sql`
    update result_imports
    set matched_count = ${missing.length}, inserted_count = ${imported},
      summary = ${JSON.stringify({ imported, skipped: missing.length - imported, horseId, auto: true })}::jsonb
    where id = ${importId}`;
  return { imported, skipped: rows.length - imported };
}

type BlankTestRow = {
  horse_id: string;
  client_id: string;
  test: string;
  place: string;
  percent: number | string | null;
  ride_date: string | Date | null;
};

function missingDressageColumn(err: unknown) {
  const code =
    err && typeof err === "object" && "code" in err ? String((err as { code: unknown }).code) : "";
  const message = err instanceof Error ? err.message : String(err);
  return code === "42703" || /dressage_test/i.test(message);
}

/**
 * Fill dressage_test where it is still blank. A value Susan already chose is
 * left alone. Safe to run again. If migration 0011 has not been applied yet,
 * this does nothing and the screen still infers the test while drawing.
 */
export async function backfillDressageTests(sql: Sql, horseId?: string): Promise<number> {
  let rows: BlankTestRow[];
  try {
    rows = horseId
      ? await sql<BlankTestRow>`
          select horse_id, client_id, test, place, percent, ride_date::text as ride_date
          from results
          where horse_id = ${horseId} and btrim(coalesce(dressage_test, '')) = ''`
      : await sql<BlankTestRow>`
          select horse_id, client_id, test, place, percent, ride_date::text as ride_date
          from results
          where btrim(coalesce(dressage_test, '')) = ''`;
  } catch (err) {
    if (missingDressageColumn(err)) return 0;
    throw err;
  }
  let filled = 0;
  for (const row of rows) {
    const test = inferDressageTest({
      date: row.ride_date,
      percent: row.percent,
      place: row.place,
      test: row.test,
    });
    if (!test) continue;
    try {
      const updated = await sql<{ client_id: string }>`
        update results set dressage_test = ${test}
        where horse_id = ${row.horse_id} and client_id = ${row.client_id}
          and btrim(coalesce(dressage_test, '')) = ''
        returning client_id`;
      if (updated.length) filled += 1;
    } catch (err) {
      if (missingDressageColumn(err)) return filled;
      throw err;
    }
  }
  return filled;
}
