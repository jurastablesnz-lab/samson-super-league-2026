import type { Sql } from "./db";
import { evoDedupeKey, type EvoRow } from "./evo-csv.ts";
import type { RiderEvoImportResult } from "./rider-types";

function levelFrom(row: EvoRow): string {
  const text = `${row.level} ${row.className} ${row.test}`.toLowerCase();
  const match =
    text.match(/level\s*(\d)/) ??
    text.match(/\b(?:elementary|medium|advanced)\s*\(\s*l\s*(\d)\s*\)/) ??
    text.match(/\b(\d)[abc]\b/);
  return match ? `L${match[1]}` : row.level.slice(0, 20);
}

/** Insert the rider's parsed rows without matching any other user or horse.
 * Callers must first verify access and ownership. The unique horse/dedupe key
 * also protects pending, previously kept and previously rejected suggestions. */
export async function importOwnEvoRows(
  sql: Sql,
  userId: string,
  horseId: string,
  rows: EvoRow[],
  importId: number,
): Promise<RiderEvoImportResult> {
  if (rows.length > 500) throw new Error("Up to 500 rows at a time");
  let count = 0;
  let duplicates = 0;
  for (const row of rows.slice(0, 500)) {
    const clientId = `csv-${importId}-${row.line}`;
    const inserted = await sql<{ id: number }>`insert into results
      (user_id, horse_id, client_id, source, show_id, show_name, ride_date, test, level,
       percent, place, status, judges, notes, dedupe_key, import_id, raw, review_status, rider_name)
      values (${userId}, ${horseId}, ${clientId}, 'evo_csv', 'past', ${row.event.slice(0, 120)},
        ${row.date || null}, ${(row.test || row.className).slice(0, 80)}, ${levelFrom(row)}, ${row.percent},
        ${row.place.slice(0, 20)}, ${row.status}, ${row.judges.slice(0, 300)},
        ${row.className && row.className !== row.test ? row.className.slice(0, 200) : ""}, ${evoDedupeKey(row)},
        ${importId}, ${JSON.stringify(row.raw ?? {})}::jsonb, 'pending', ${row.rider.slice(0, 120)})
      on conflict do nothing returning id`;
    if (inserted.length) count += 1;
    else duplicates += 1;
  }
  await sql`update result_imports set matched_count = ${count}, inserted_count = ${count},
    summary = ${JSON.stringify({ duplicates, selfImport: true })}::jsonb where id = ${importId}`;
  return { count, duplicates };
}
