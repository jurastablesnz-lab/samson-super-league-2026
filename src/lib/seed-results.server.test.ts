import assert from "node:assert/strict";
import { test } from "node:test";
import { evoDedupeKey, parseEvoResultsCsv } from "./evo-csv.ts";
import { readHorseLog } from "./rider-horse.server.ts";
import { inferDressageTest } from "./dressage-test.ts";
import {
  importSeedResults,
  importSeedResultsForHorse,
  readShippedSeedCsv,
  seedDressageTest,
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

test("the shipped Samson rows match the recorded tests, except four that stay blank", async () => {
  const text = await readShippedSeedCsv();
  const samson = parseEvoResultsCsv(text).rows.filter((row) => row.esnz === "219700");
  const named = samson.filter((row) => seedDressageTest(row));
  const blank = samson.filter((row) => !seedDressageTest(row));
  assert.equal(samson.length, 24);
  assert.equal(named.length, 20);
  assert.equal(blank.length, 4);
  assert.deepEqual(blank.map((row) => `${row.date} ${row.className}`).sort(), [
    "2023-05-07 11",
    "2026-10-24 201",
    "2026-10-24 203",
    "2026-10-24 204",
  ]);
  const twoC = named.find((row) => row.date === "2025-10-04" && row.className === "201");
  assert.equal(seedDressageTest(twoC!), "2C");
  assert.equal(
    inferDressageTest({
      date: "2025-10-04",
      percent: "65.5",
      place: "5",
      test: "Novice (L2) · 201",
    }),
    "2C",
  );
});

test("opening a horse names rows that were imported with a blank test and keeps a chosen one", async () => {
  const pg = await database();
  try {
    const sql = asSql(pg);
    await users(pg);
    await pg.query(
      "insert into horses (id, user_id, name, level, esnz_number) values ('sammy', 'susan', 'Jura Samson', 'Level 2', '219700')",
    );
    await pg.query(
      `insert into results (user_id, horse_id, client_id, source, show_name, ride_date, test, dressage_test, level, percent, place, status, review_status)
       values
        ('susan', 'sammy', 'old-2c', 'evo_csv', 'DCD 2025', '2025-10-04', 'Novice (L2) · 201', '', 'Novice (L2)', 65.5, '5', 'ok', 'kept'),
        ('susan', 'sammy', 'old-bop', 'evo_csv', 'Bay of Plenty', '2026-10-24', 'Novice (L2) · 201', '', 'Novice (L2)', 64.6, '3', 'ok', 'kept'),
        ('susan', 'sammy', 'chosen', 'evo_csv', 'Wairarapa', '2025-08-31', 'Novice (L2) · 203', 'MFS', 'Novice (L2)', 61, '4', 'ok', 'kept')`,
    );
    const log = await readHorseLog(sql, "susan", "sammy");
    const byId = new Map(log.results.map((row) => [row.id, row.dressageTest]));
    assert.equal(byId.get("old-2c"), "2C");
    assert.equal(byId.get("old-bop"), "");
    assert.equal(byId.get("chosen"), "MFS");
    const again = await readHorseLog(sql, "susan", "sammy");
    assert.equal(again.results.find((row) => row.id === "old-2c")?.dressageTest, "2C");
    assert.equal(again.results.find((row) => row.id === "chosen")?.dressageTest, "MFS");
  } finally {
    await pg.close();
  }
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
