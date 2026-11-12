import assert from "node:assert/strict";
import { test } from "node:test";
import { asSql, database } from "./test-database.ts";
import {
  DEFAULT_SHEET_READS_PER_DAY,
  aucklandDay,
  claimSheetRead,
  sheetReadGate,
  sheetReadLimitMessage,
  sheetReadsPerDay,
  takeSheetRead,
} from "./sheet-reads.ts";

test("the daily allowance defaults to 20 and only accepts a positive whole number", () => {
  assert.equal(sheetReadsPerDay(undefined), DEFAULT_SHEET_READS_PER_DAY);
  assert.equal(sheetReadsPerDay(""), 20);
  assert.equal(sheetReadsPerDay("0"), 20);
  assert.equal(sheetReadsPerDay("nope"), 20);
  assert.equal(sheetReadsPerDay("20.5"), 20);
  assert.equal(sheetReadsPerDay("5"), 5);
});

test("the allowance day follows New Zealand, not UTC", () => {
  assert.equal(aucklandDay(new Date("2026-11-12T10:00:00Z")), "2026-11-12");
  assert.equal(aucklandDay(new Date("2026-11-12T14:00:00Z")), "2026-11-13");
});

test("only an approved rider spends the daily allowance", () => {
  assert.deepEqual(sheetReadGate({ approved: false, isAdmin: false }), {
    ok: false,
    error: "Your beta place is not approved yet.",
  });
  assert.deepEqual(sheetReadGate({ approved: true, isAdmin: false }), { ok: true, limited: true });
  assert.deepEqual(sheetReadGate({ approved: false, isAdmin: true }), { ok: true, limited: false });
});

test("an approved rider stops at the daily limit, and the count is per day", async () => {
  const pg = await database();
  try {
    const sql = asSql(pg);
    await pg.query(
      `insert into "user" (id, name, email, "emailVerified") values ('rider', 'Rider', 'rider@example.com', true)`,
    );
    const day = "2026-11-12";
    for (let n = 0; n < 3; n += 1) {
      assert.deepEqual(await claimSheetRead(sql, { userId: "rider", limit: 3, day }), { ok: true });
    }
    const blocked = await claimSheetRead(sql, { userId: "rider", limit: 3, day });
    assert.deepEqual(blocked, { ok: false, error: sheetReadLimitMessage(3) });
    assert.match(blocked.ok ? "" : blocked.error, /today's 3 sheet reads/);
    assert.deepEqual(await claimSheetRead(sql, { userId: "rider", limit: 3, day: "2026-11-13" }), {
      ok: true,
    });
    const counts = await sql<{ read_on: string; reads: number }>`
      select read_on::text as read_on, reads from sheet_reads where user_id = 'rider' order by read_on`;
    assert.deepEqual(counts, [
      { read_on: "2026-11-12", reads: 3 },
      { read_on: "2026-11-13", reads: 1 },
    ]);

    const refused = await takeSheetRead(sql, {
      userId: "rider",
      approved: false,
      isAdmin: false,
      limit: 3,
      day,
    });
    assert.equal(refused.ok, false);
    const admin = await takeSheetRead(sql, {
      userId: "rider",
      approved: true,
      isAdmin: true,
      limit: 3,
      day,
    });
    assert.deepEqual(admin, { ok: true });
    const after = await sql<{ reads: number }>`select reads from sheet_reads where user_id = 'rider' and read_on = '2026-11-12'`;
    assert.equal(after[0]?.reads, 3);
  } finally {
    await pg.close();
  }
});
