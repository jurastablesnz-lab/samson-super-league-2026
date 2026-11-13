import assert from "node:assert/strict";
import { test } from "node:test";
import {
  coachRefreshUsd,
  formatUsd,
  monthlyBudgetUsd,
  monthlyLimitMessage,
  nextMonthStart,
  reserveMonthlySpend,
  sheetReadUsd,
  sttUsd,
  typicalRiderMonthUsd,
  ttsUsd,
} from "./ai-cost.ts";
import { asSql, database } from "./test-database.ts";

test("unit costs match the published xAI rates", () => {
  assert.equal(ttsUsd(1_000_000), 15);
  assert.equal(ttsUsd(0), 0);
  assert.equal(sttUsd(3600), 0.1);
  assert.ok(sheetReadUsd(2) > sheetReadUsd(1));
  assert.ok(sheetReadUsd(1) < 0.02);
  assert.ok(coachRefreshUsd() > 0.005 && coachRefreshUsd() < 0.02);
  assert.equal(monthlyBudgetUsd(undefined), 3);
  assert.equal(monthlyBudgetUsd("2.5"), 2.5);
  assert.equal(nextMonthStart("2026-11-13"), "2026-12-01");
  assert.equal(monthlyLimitMessage("2026-12-01"), "Monthly limit reached, resets on 1 December 2026.");
  const month = typicalRiderMonthUsd();
  assert.ok(month > 0.4 && month < 1.5, `typical month ${month}`);
});

test("a non-admin stops at the monthly dollars, and a free call does not count", async () => {
  const pg = await database();
  try {
    const sql = asSql(pg);
    await pg.query(
      `insert into "user" (id, name, email, "emailVerified") values ('rider', 'Susan', 'susan@example.com', true)`,
    );
    const first = await reserveMonthlySpend(sql, {
      userId: "rider",
      limited: true,
      usd: 2,
      budgetUsd: "3",
      day: "2026-11-13",
    });
    assert.equal(first.ok, true);
    const free = await reserveMonthlySpend(sql, {
      userId: "rider",
      limited: true,
      usd: 0,
      budgetUsd: "3",
      day: "2026-11-13",
    });
    assert.equal(free.ok && free.micros, 0);
    const blocked = await reserveMonthlySpend(sql, {
      userId: "rider",
      limited: true,
      usd: 2,
      budgetUsd: "3",
      day: "2026-11-13",
    });
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.match(blocked.error, /Monthly limit reached, resets on 1 December 2026/);
    const admin = await reserveMonthlySpend(sql, {
      userId: "admin",
      limited: false,
      usd: 10,
      budgetUsd: "3",
      day: "2026-11-13",
    });
    assert.equal(admin.ok && admin.micros, 0);
    assert.equal(formatUsd(typicalRiderMonthUsd()).startsWith("US$"), true);
  } finally {
    await pg.close();
  }
});
