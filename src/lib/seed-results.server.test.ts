import assert from "node:assert/strict";
import { test } from "node:test";
import { evoDedupeKey, parseEvoResultsCsv } from "./evo-csv.ts";
import {
  importSeedResults,
  importSeedResultsForHorse,
  readShippedSeedCsv,
  seedTestLabel,
} from "./seed-results.server.ts";
import { asSql, database } from "./test-database.ts";

const ONE = `Horse,ESNZ,Rider,Event,Date,Class,Level,Percent,Place,Status,Judges
Galileo DHU,250297,Nicole Bours,Example Show,2026-01-10,701,Level 7,64.7,4,,J1:65.1/3
Mystery,999999,Nobody,Example Show,2026-01-10,701,Level 7,60,1,,
`;

async function users(pg: Awaited<ReturnType<typeof database>>) {
  await pg.query(
    `insert into "user" (id, name, email, "emailVerified") values
      ('susan', 'Susan', 'susan@example.com', true),
      ('nicole', 'Nicole', 'nicole@example.com', true),
      ('shelley', 'Shelley', 'shelley@example.com', true)`,
  );
}

test("the shipped file has the three beta horses and 101 results", async () => {
  const text = await readShippedSeedCsv();
  const parsed = parseEvoResultsCsv(text);
  assert.equal(parsed.rows.length, 101);
  const counts = new Map<string, number>();
  for (const row of parsed.rows) counts.set(row.esnz, (counts.get(row.esnz) ?? 0) + 1);
  assert.equal(counts.get("219700"), 24);
  assert.equal(counts.get("250297"), 18);
  assert.equal(counts.get("236353"), 59);
  const samson = parsed.rows.filter((row) => row.esnz === "219700");
  const bop = samson.filter((row) => row.date === "2026-10-24" && /bay of plenty/i.test(row.event));
  assert.deepEqual(bop.map((row) => row.className).sort(), ["201", "203", "204"]);
  assert.ok(bop.every((row) => row.level === "Novice (L2)" && row.horse === "Jura Samson"));
  const novice = samson.filter((row) => row.level === "Novice (L2)");
  assert.ok(novice.length > bop.length);
  assert.ok(novice.some((row) => row.date !== "2026-10-24"));
  assert.equal(seedTestLabel(parsed.rows[0]), "Level 7 · 701");
});

test("saving a horse with an ESNZ number loads its shipped rows, and a second save adds nothing", async () => {
  const pg = await database();
  try {
    const sql = asSql(pg);
    await users(pg);
    await pg.query(
      `insert into horses (id, user_id, name, esnz_number) values
        ('sammy', 'susan', 'Jura Samson', '219700'),
        ('blank', 'susan', 'No number', null),
        ('other', 'nicole', 'Other', '250297')`,
    );
    const first = await importSeedResultsForHorse(sql, "susan", "sammy");
    assert.equal(first.imported, 24);
    assert.equal(first.skipped, 0);
    const kept = await pg.query<{ n: number; test: string }>(
      `select count(*)::int as n, max(test) as test from results
       where horse_id = 'sammy' and review_status = 'kept' and ride_date = '2026-10-24' and test like '%201'`,
    );
    assert.equal(kept.rows[0].n, 1);
    assert.match(kept.rows[0].test, /201/);
    const again = await importSeedResultsForHorse(sql, "susan", "sammy");
    assert.equal(again.imported, 0);
    assert.equal(again.skipped, 24);
    assert.deepEqual(await importSeedResultsForHorse(sql, "susan", "blank"), {
      imported: 0,
      skipped: 0,
    });
    const nicole = await importSeedResultsForHorse(sql, "nicole", "other");
    assert.equal(nicole.imported, 18);
    const crossed = await pg.query<{ n: number }>(
      "select count(*)::int as n from results where horse_id = 'other' and test like '%201'",
    );
    assert.equal(crossed.rows[0].n, 0);
  } finally {
    await pg.close();
  }
});

test("import matches ESNZ only, skips duplicates and a pending review, and reports unmatched rows", async () => {
  const pg = await database();
  try {
    const sql = asSql(pg);
    await users(pg);
    await pg.query(
      `insert into horses (id, user_id, name, esnz_number) values
        ('sammy', 'susan', 'Sammy', 'ESNZ 219700'),
        ('galileo', 'nicole', 'Galileo DHU', '250297'),
        ('astek', 'shelley', 'Astek Rhapsody', '236353'),
        ('glamour', 'susan', 'Glamourbelle', null)`,
    );
    const shipped = await readShippedSeedCsv();
    const firstRow = parseEvoResultsCsv(shipped).rows.find((row) => row.esnz === "250297");
    assert.ok(firstRow);
    await pg.query(
      `insert into results (user_id, horse_id, client_id, source, dedupe_key, review_status, show_name, test)
       values ('nicole', 'galileo', 'already', 'evo_csv', $1, 'pending', 'Example', '701')`,
      [evoDedupeKey(firstRow)],
    );

    const first = await importSeedResults(sql, "susan@example.com", shipped);
    assert.equal(first.total, 101);
    assert.equal(first.imported, 100);
    assert.equal(first.skipped, 1);
    assert.equal(first.unmatched, 0);

    const pending = await pg.query<{ review_status: string }>(
      "select review_status from results where client_id = 'already'",
    );
    assert.equal(pending.rows[0].review_status, "pending");
    const kept = await pg.query<{ n: number; judges: string }>(
      "select count(*)::int as n, max(judges) as judges from results where horse_id = 'sammy' and review_status = 'kept'",
    );
    assert.equal(kept.rows[0].n, 24);
    assert.match(kept.rows[0].judges, /J1:/);

    const again = await importSeedResults(sql, "susan@example.com", shipped);
    assert.equal(again.imported, 0);
    assert.equal(again.skipped, 101);
    assert.equal(again.unmatched, 0);

    await pg.query("update horses set esnz_number = null where id = 'galileo'");
    const namedOnly = await importSeedResults(sql, "admin", ONE);
    assert.equal(namedOnly.imported, 0);
    assert.equal(namedOnly.skipped, 0);
    assert.equal(namedOnly.unmatched, 2);
    assert.ok(
      namedOnly.unmatchedRows.some(
        (row) => row.horse === "Galileo DHU" && /No horse/.test(row.reason),
      ),
    );

    await pg.query("update horses set esnz_number = '219700' where id = 'glamour'");
    const ambiguous = await importSeedResults(
      sql,
      "admin",
      "Horse,ESNZ,Rider,Event,Date,Class,Level,Percent,Place\nSammy,219700,Susan,Show,2026-02-01,201,Novice (L2),60,1\n",
    );
    assert.equal(ambiguous.imported, 0);
    assert.equal(ambiguous.unmatched, 1);
    assert.match(ambiguous.unmatchedRows[0].reason, /more than one/);
  } finally {
    await pg.close();
  }
});
