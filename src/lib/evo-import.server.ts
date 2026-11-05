/**
 * Admin: save parsed EVO Events results against riders' horses (server-only).
 *
 * Matching, in order (first hit wins):
 *   1. ESNZ registration number (normalised: case, spaces, dashes, leading
 *      zeros and an "ESNZ" prefix ignored) — exact match on horses.esnz_number.
 *   2. Horse name + rider name — normalised (accents, punctuation, bracketed
 *      suffixes like "(NZ)" dropped). Rider name = application full name or
 *      account name; "First Last" and "Last, First" both match.
 *   3. Horse name alone, only when exactly one horse in the beta has it.
 * Ambiguous or unmatched rows are reported, never guessed.
 *
 * Re-importing the same file is safe: each row gets a dedupe key (event, date,
 * class/test, percent) and duplicates per horse are skipped.
 */
import { getSql } from "./db";
import { evoDedupeKey, normaliseEsnz, normaliseName, type EvoRow } from "./evo-csv";
import { requireAdminUser } from "./rider.server";
import type { EvoImportResult, EvoImportRowResult } from "./rider-types";

type Candidate = { horseId: string; userId: string; horseName: string; riderName: string; esnz: string; riderKeys: string[] };

function riderKeys(name: string): string[] {
  const n = normaliseName(name);
  if (!n) return [];
  const parts = n.split(" ");
  const keys = new Set([n, parts.slice().sort().join(" ")]);
  if (parts.length > 1) keys.add(`${parts[0]} ${parts[parts.length - 1]}`);
  return [...keys];
}

function riderMatches(c: Candidate, rider: string) {
  const r = riderKeys(rider.replace(/^(.*?),\s*(.*)$/, "$2 $1"));
  return r.some((k) => c.riderKeys.includes(k));
}

function levelFrom(row: EvoRow): string {
  const t = `${row.level} ${row.className} ${row.test}`.toLowerCase();
  const m = t.match(/level\s*(\d)/) ?? t.match(/\b(\d)[abc]\b/);
  return m ? `L${m[1]}` : row.level.slice(0, 20);
}

export async function importEvoRows(adminId: string, fileName: string, rows: EvoRow[], dryRun: boolean): Promise<EvoImportResult> {
  const admin = await requireAdminUser(adminId);
  if (!Array.isArray(rows)) throw new Error("No rows");
  if (rows.length > 5000) throw new Error("Up to 5000 rows per file");
  const sql = await getSql();
  const cands = (
    await sql<{ id: string; user_id: string; name: string; esnz_number: string | null; full_name: string | null; uname: string | null }>`
      select h.id, h.user_id, h.name, h.esnz_number, b.full_name, u.name as uname
      from horses h
      join "user" u on u.id = h.user_id
      left join beta_applications b on b.user_id = h.user_id
      where not h.archived`
  ).map<Candidate>((r) => ({
    horseId: r.id,
    userId: r.user_id,
    horseName: r.name,
    riderName: r.full_name || r.uname || "",
    esnz: normaliseEsnz(r.esnz_number ?? ""),
    riderKeys: [...riderKeys(r.full_name ?? ""), ...riderKeys(r.uname ?? "")],
  }));

  const out: EvoImportRowResult[] = [];
  let importId: number | null = null;
  if (!dryRun) {
    const ins = await sql<{ id: number }>`insert into result_imports (uploaded_by, file_name, row_count)
      values (${admin.email ?? admin.id}, ${String(fileName ?? "").slice(0, 200)}, ${rows.length}) returning id`;
    importId = Number(ins[0].id);
  }
  let matched = 0;
  let inserted = 0;
  let duplicates = 0;
  for (const row of rows) {
    const base: EvoImportRowResult = { line: row.line, rider: row.rider, horse: row.horse, esnz: row.esnz, percent: row.percent, match: null };
    const esnz = normaliseEsnz(row.esnz ?? "");
    const hn = normaliseName(row.horse ?? "");
    let hit: { c: Candidate; by: "esnz" | "horse+rider" | "horse" } | null = null;
    let reason = "";
    if (esnz) {
      const list = cands.filter((c) => c.esnz && c.esnz === esnz);
      if (list.length === 1) hit = { c: list[0], by: "esnz" };
      else if (list.length > 1) reason = "ESNZ number is on more than one horse";
    }
    if (!hit && hn) {
      const byName = cands.filter((c) => normaliseName(c.horseName) === hn);
      const both = row.rider ? byName.filter((c) => riderMatches(c, row.rider)) : [];
      if (both.length === 1) hit = { c: both[0], by: "horse+rider" };
      else if (both.length === 0 && byName.length === 1 && !row.rider) hit = { c: byName[0], by: "horse" };
      else if (both.length === 0 && byName.length === 1 && row.rider) {
        reason = `Horse found, but rider "${row.rider}" doesn't match ${byName[0].riderName || "the account"}`;
      } else if (byName.length > 1 || both.length > 1) reason = "More than one horse with this name — add the ESNZ number";
      else if (!reason) reason = "No horse with this name in the beta";
    }
    if (!hit && !reason) reason = "No horse name or ESNZ number on this row";
    if (!hit) {
      out.push({ ...base, reason });
      continue;
    }
    matched += 1;
    const res: EvoImportRowResult = {
      ...base,
      match: { horseId: hit.c.horseId, horseName: hit.c.horseName, riderName: hit.c.riderName, by: hit.by },
    };
    if (!dryRun) {
      const key = evoDedupeKey(row);
      const clientId = `csv-${importId}-${row.line}`;
      const r = await sql<{ id: number }>`insert into results (user_id, horse_id, client_id, source, show_id, show_name,
          ride_date, test, level, percent, place, status, judges, notes, dedupe_key, import_id, raw)
        values (${hit.c.userId}, ${hit.c.horseId}, ${clientId}, 'evo_csv', 'past', ${row.event.slice(0, 120)},
          ${row.date || null}, ${(row.test || row.className).slice(0, 80)}, ${levelFrom(row)}, ${row.percent},
          ${row.place.slice(0, 20)}, ${row.status}, ${row.judges.slice(0, 300)},
          ${row.className && row.className !== row.test ? row.className.slice(0, 200) : ""}, ${key}, ${importId},
          ${JSON.stringify(row.raw ?? {})}::jsonb)
        on conflict do nothing returning id`;
      if (r.length) {
        inserted += 1;
        res.inserted = true;
      } else {
        duplicates += 1;
        res.duplicate = true;
      }
    }
    out.push(res);
  }
  if (!dryRun && importId != null) {
    await sql`update result_imports set matched_count = ${matched}, inserted_count = ${inserted},
      summary = ${JSON.stringify({ duplicates, unmatched: rows.length - matched })}::jsonb where id = ${importId}`;
  }
  return { dryRun, importId, total: rows.length, matched, inserted, duplicates, rows: out };
}
