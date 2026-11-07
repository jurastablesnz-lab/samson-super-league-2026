import assert from "node:assert/strict";
import { test } from "node:test";
import {
  deleteCompetition,
  saveCompetition,
  setTrainingTarget,
  trainingBoard,
} from "./competitions.server.ts";
import { asSql, database } from "./test-database.ts";

test("admin can create, edit and delete a competition, and a rider attaches it to their horse", async () => {
  const pg = await database();
  try {
    const sql = asSql(pg);
    await pg.query(
      'insert into "user" (id, name, email, "emailVerified") values ($1, $1, $2, true), ($3, $3, $4, true)',
      ["rider", "rider@example.com", "other", "other@example.com"],
    );
    await pg.query(
      "insert into horses (id, user_id, name) values ('horse', 'rider', 'Sammy'), ('theirs', 'other', 'Other')",
    );
    await pg.query("insert into plans (horse_id, user_id, config) values ('horse', 'rider', $1)", [
      JSON.stringify({ tests: ["2A", "2B"] }),
    ]);

    const created = await saveCompetition(sql, {
      name: "Dressage Taupō",
      venue: "NEC",
      region: "Bay of Plenty",
      start: "2026-11-20",
      end: "2026-11-21",
      entryOpen: "2026-10-01",
      entryClose: "2026-11-10",
      offered: "Novice 2A, 2B",
      scheduleUrl: "https://example.com/taupo",
      notes: "Confirm yards",
    });
    assert.equal(created.length, 1);
    assert.equal(created[0].name, "Dressage Taupō");
    assert.equal(created[0].entryClose, "2026-11-10");

    const edited = await saveCompetition(sql, { ...created[0], name: "Taupō Premier League" });
    assert.equal(edited[0].name, "Taupō Premier League");
    assert.equal(edited[0].id, created[0].id);

    const board = await setTrainingTarget(
      sql,
      "rider",
      "horse",
      created[0].id,
      ["2B", "Grand Prix"],
      true,
    );
    assert.deepEqual(
      board.targets.map((target) => target.tests),
      [["2B"]],
    );
    assert.equal(board.targets[0].scheduleUrl, "https://example.com/taupo");

    await assert.rejects(trainingBoard(sql, "other", "horse"), /not found/);
    await assert.rejects(
      setTrainingTarget(sql, "other", "horse", created[0].id, ["2B"], true),
      /not found/,
    );

    const removed = await setTrainingTarget(sql, "rider", "horse", created[0].id, [], false);
    assert.equal(removed.targets.length, 0);

    await setTrainingTarget(sql, "rider", "horse", created[0].id, ["2A"], true);
    const afterDelete = await deleteCompetition(sql, created[0].id);
    assert.equal(afterDelete.length, 0);
    assert.equal((await trainingBoard(sql, "rider", "horse")).targets.length, 0);
    await assert.rejects(deleteCompetition(sql, created[0].id), /not found/);
  } finally {
    await pg.close();
  }
});
