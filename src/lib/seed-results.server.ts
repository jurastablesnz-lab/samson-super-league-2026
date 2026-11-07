/**
 * One-tap import of the beta results shipped in data/seed/master-results.csv.
 *
 * Horses are matched by ESNZ number only. The same dedupe key as the EVO CSV
 * import skips a row that is already pending, kept or rejected, so this never
 * overrides a rider's review. New rows are saved as kept results and show on
 * the horse's plan. This does not contact EVO Events.
 */
import type { Sql } from "./db.ts";
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

/** Level plus class number, so the plan can show the test without a separate column. */
export function seedTestLabel(row: EvoRow): string {
  const level = row.level.trim();
  const klass = (row.className || row.test).trim();
  if (level && klass && level.toLowerCase() !== klass.toLowerCase()) {
    return `${level} · ${klass}`.slice(0, 80);
  }
  return (level || klass).slice(0, 80);
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
        user_id, horse_id, client_id, source, show_id, show_name, ride_date, test, level,
        percent, place, status, judges, notes, dedupe_key, import_id, raw, review_status, rider_name
      ) values (
        ${hit.userId}, ${hit.id}, ${`seed-${importId}-${row.line}`}, 'evo_csv', 'past',
        ${row.event.slice(0, 200)}, ${row.date || null}, ${seedTestLabel(row)}, ${row.level.slice(0, 40)},
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
