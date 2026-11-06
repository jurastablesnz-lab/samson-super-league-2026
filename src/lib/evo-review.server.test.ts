import assert from "node:assert/strict";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";
import type { Sql } from "./db.ts";
import { reviewEvoResultsForOwner } from "./evo-review.server.ts";
import { importOwnEvoRows } from "./evo-self-import.server.ts";

function asSql(pg: PGlite): Sql {
  const sql = (async <T>(strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0];
    for (let i = 0; i < values.length; i++) text += `$${i + 1}${strings[i + 1]}`;
    return (await pg.query<T>(text, values)).rows;
  }) as Sql;
  sql.query = async <T>(text: string, params: unknown[] = []) =>
    (await pg.query<T>(text, params)).rows;
  return sql;
}

async function database(): Promise<PGlite> {
  const pg = new PGlite();
  await pg.waitReady;
  const files = (await readdir(new URL("../../migrations", import.meta.url)))
    .filter((name) => /\.sql$/.test(name))
    .sort();
  for (const name of files) {
    await pg.exec(await readFile(new URL(`../../migrations/${name}`, import.meta.url), "utf8"));
  }
  return pg;
}

test("keep/reject is owner-scoped, pending-only, and rejected rows still dedupe", async () => {
  const pg = await database();
  try {
    const sql = asSql(pg);
    await pg.query(
      'insert into "user" (id, name, email, "emailVerified") values ($1, $2, $3, true), ($4, $5, $6, true)',
      ["owner", "Owner", "owner@example.com", "intruder", "Intruder", "intruder@example.com"],
    );
    await pg.query(
      "insert into horses (id, user_id, name) values ('horse', 'owner', 'Bella'), ('other_horse', 'intruder', 'Bella')",
    );
    const add = (clientId: string, horseId = "horse", userId = "owner", status?: string) =>
      pg.query(
        `insert into results (user_id, horse_id, client_id, source, show_name, test, percent, dedupe_key${status ? ", review_status" : ""})
       values ($1, $2, $3, 'evo_csv', 'Spring Champs', '2B', 65, 'spring|2026-10-10|2b|65-${clientId}'${status ? ", $4" : ""})`,
        status ? [userId, horseId, clientId, status] : [userId, horseId, clientId],
      );
    await add("old-import");
    await add("pending", "horse", "owner", "pending");
    await add("app-score");
    await pg.query("update results set source = 'app' where client_id = 'app-score'");

    // Existing imports have no explicit status, so the additive default keeps them.
    assert.equal(
      (
        await pg.query<{ review_status: string }>(
          "select review_status from results where client_id = 'old-import'",
        )
      ).rows[0].review_status,
      "kept",
    );
    assert.deepEqual(
      await reviewEvoResultsForOwner(sql, "owner", "horse", ["pending", "pending"], "kept"),
      ["pending"],
    );
    await assert.rejects(
      reviewEvoResultsForOwner(sql, "owner", "horse", ["pending"], "rejected"),
      /already|not/,
    );
    assert.deepEqual(
      (
        await pg.query(
          "select client_id from results where horse_id = 'horse' and source = 'evo_csv' and review_status = 'kept' order by client_id",
        )
      ).rows,
      [{ client_id: "old-import" }, { client_id: "pending" }],
    );

    await add("reject-me", "horse", "owner", "pending");
    await assert.rejects(
      reviewEvoResultsForOwner(sql, "intruder", "horse", ["reject-me"], "rejected"),
      /Horse not found/,
    );
    await assert.rejects(
      reviewEvoResultsForOwner(sql, "intruder", "other_horse", ["reject-me"], "rejected"),
      /already|not/,
    );
    assert.deepEqual(
      await reviewEvoResultsForOwner(sql, "owner", "horse", ["reject-me"], "rejected"),
      ["reject-me"],
    );
    await assert.rejects(
      reviewEvoResultsForOwner(sql, "owner", "horse", ["reject-me"], "kept"),
      /already|not/,
    );

    await add("app-pending");
    await pg.query(
      "update results set source = 'app', review_status = 'pending' where client_id = 'app-pending'",
    );
    await assert.rejects(
      reviewEvoResultsForOwner(sql, "owner", "horse", ["app-pending"], "rejected"),
      /already|not/,
    );
    await assert.rejects(
      reviewEvoResultsForOwner(sql, "owner", "horse", [], "kept"),
      /Choose at least one/,
    );

    // Rejected suggestions remain on the same unique horse/dedupe key and are
    // neither listed for review nor inserted again on a later CSV import.
    assert.equal(
      (
        await pg.query<{ n: number }>(
          "select count(*)::int as n from results where horse_id = 'horse' and source = 'evo_csv' and review_status = 'pending'",
        )
      ).rows[0].n,
      0,
    );
    const dedupe = await pg.query(
      `insert into results (user_id, horse_id, client_id, source, dedupe_key, review_status)
       values ('owner', 'horse', 'csv-2-1', 'evo_csv', 'spring|2026-10-10|2b|65-reject-me', 'pending')
       on conflict do nothing returning client_id`,
    );
    assert.equal(dedupe.rows.length, 0);
    assert.equal(
      (
        await pg.query<{ n: number }>(
          "select count(*)::int as n from results where horse_id = 'horse'",
        )
      ).rows[0].n,
      5,
    );
  } finally {
    await pg.close();
  }
});

test("rider self-import is pending, owner-scoped and dedupes all review states", async () => {
  const pg = await database();
  try {
    const sql = asSql(pg);
    await pg.query(
      "insert into \"user\" (id, name, email, \"emailVerified\") values ('owner', 'Owner', 'owner@example.com', true)",
    );
    await pg.query("insert into horses (id, user_id, name) values ('horse', 'owner', 'Bella')");
    await pg.query(
      "insert into result_imports (uploaded_by, file_name, row_count) values ('rider:owner', 'Rider EVO paste', 1) returning id",
    );
    const audit = await pg.query<{ id: number }>(
      "select id from result_imports where file_name = 'Rider EVO paste'",
    );
    const row = {
      line: 1,
      rider: "Nicole Bours",
      horse: "",
      esnz: "",
      event: "Kiwi Arena",
      date: "2026-10-03",
      className: "Class 701",
      test: "701 — Level 7",
      level: "Level 7",
      percent: 64.7,
      place: "4",
      status: "ok" as const,
      judges: "J1:65.1/3",
      raw: { Rider: "Nicole Bours" },
    };
    assert.deepEqual(await importOwnEvoRows(sql, "owner", "horse", [row], audit.rows[0].id), {
      count: 1,
      duplicates: 0,
    });
    assert.deepEqual(await importOwnEvoRows(sql, "owner", "horse", [row], audit.rows[0].id), {
      count: 0,
      duplicates: 1,
    });
    const saved = (
      await pg.query("select user_id, horse_id, source, review_status, rider_name from results")
    ).rows;
    assert.deepEqual(saved, [
      {
        user_id: "owner",
        horse_id: "horse",
        source: "evo_csv",
        review_status: "pending",
        rider_name: "Nicole Bours",
      },
    ]);

    await reviewEvoResultsForOwner(
      sql,
      "owner",
      "horse",
      [`csv-${audit.rows[0].id}-1`],
      "rejected",
    );
    assert.deepEqual(await importOwnEvoRows(sql, "owner", "horse", [row], audit.rows[0].id), {
      count: 0,
      duplicates: 1,
    });
    assert.equal(
      (await pg.query<{ n: number }>("select count(*)::int as n from results")).rows[0].n,
      1,
    );
  } finally {
    await pg.close();
  }
});
