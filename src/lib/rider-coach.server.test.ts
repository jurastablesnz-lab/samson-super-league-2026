import assert from "node:assert/strict";
import { test } from "node:test";
import type { PGlite } from "@electric-sql/pglite";
import { asSql, database } from "./test-database.ts";
import {
  deleteCoachVisitFor,
  readHorseLog,
  saveCoachVisitFor,
  upsertSheet,
  writeProgress,
} from "./rider-horse.server.ts";

async function person(pg: PGlite, id: string) {
  await pg.query('insert into "user" (id, name, email, "emailVerified") values ($1, $1, $2, true)', [
    id,
    `${id}@example.com`,
  ]);
}

async function horse(pg: PGlite, id: string, userId: string, name: string) {
  await pg.query("insert into horses (id, user_id, name, level) values ($1, $2, $3, 'Level 3')", [
    id,
    userId,
    name,
  ]);
  await pg.query("insert into plans (horse_id, user_id, config, progress) values ($1, $2, '{}', '{}')", [
    id,
    userId,
  ]);
}

test("videos, packing ticks and coach visits stay on the rider and horse they were saved to", async () => {
  const pg = await database();
  try {
    const sql = asSql(pg);
    await person(pg, "rider-a");
    await person(pg, "rider-b");
    await horse(pg, "kahu", "rider-a", "Kahu");
    await horse(pg, "pip", "rider-a", "Pip");
    await horse(pg, "secret", "rider-b", "Secret");

    const saved = await saveCoachVisitFor(sql, "rider-a", "kahu", {
      date: "2027-04-02",
      endDate: "2027-04-03",
      title: "Kahu lesson",
      focus: "The halt",
      film: "The whole test",
      homework: "One halt a day",
      leaveIt: "No new bit",
    });
    assert.equal(saved.coachVisits.length, 1);
    assert.equal(saved.coachVisits[0].title, "Kahu lesson");
    assert.equal(saved.horseId, "kahu");
    const visitId = saved.coachVisits[0].id;

    await assert.rejects(
      saveCoachVisitFor(sql, "rider-b", "kahu", { date: "2027-04-02", title: "Stolen" }),
      /Horse not found/,
    );
    await assert.rejects(
      saveCoachVisitFor(sql, "rider-a", "pip", { id: visitId, date: "2027-05-01", title: "Moved" }),
      /Visit not found/,
    );
    await assert.rejects(deleteCoachVisitFor(sql, "rider-b", "secret", visitId), /Visit not found/);

    await upsertSheet(sql, "rider-a", "kahu", {
      id: "clip-kahu",
      kind: "video",
      showName: "Taupo",
      date: "2027-04-04",
      test: "3A",
      note: "Left canter",
      mime: "video/mp4",
    });
    await assert.rejects(
      upsertSheet(sql, "rider-b", "kahu", {
        id: "clip-stolen",
        kind: "video",
        test: "3A",
        note: "nope",
        mime: "video/mp4",
      }),
      /Horse not found/,
    );

    await writeProgress(sql, "rider-a", "kahu", { done: { "2027-04-01-school": true }, pack: { "horse:bridle": true } });
    await writeProgress(sql, "rider-a", "pip", { done: {}, pack: { "paper:tests": true } });
    await assert.rejects(
      writeProgress(sql, "rider-b", "kahu", { done: {}, pack: { "horse:bridle": true } }),
      /Horse not found/,
    );

    const kahu = await readHorseLog(sql, "rider-a", "kahu");
    const pip = await readHorseLog(sql, "rider-a", "pip");
    const secret = await readHorseLog(sql, "rider-b", "secret");
    assert.deepEqual(kahu.coachVisits.map((v) => v.title), ["Kahu lesson"]);
    assert.equal(kahu.coachVisits[0].focus, "The halt");
    assert.deepEqual(
      kahu.sheets.filter((s) => s.kind === "video").map((s) => s.note),
      ["Left canter"],
    );
    assert.equal(kahu.progress.pack["horse:bridle"], true);
    assert.equal(kahu.progress.pack["paper:tests"], undefined);
    assert.equal(pip.coachVisits.length, 0);
    assert.equal(pip.sheets.length, 0);
    assert.equal(pip.progress.pack["paper:tests"], true);
    assert.equal(pip.progress.pack["horse:bridle"], undefined);
    assert.equal(pip.progress.done["2027-04-01-school"], undefined);
    assert.equal(secret.coachVisits.length, 0);
    assert.equal(secret.sheets.length, 0);
    assert.deepEqual(secret.progress, { done: {}, pack: {} });

    await deleteCoachVisitFor(sql, "rider-a", "kahu", visitId);
    assert.equal((await readHorseLog(sql, "rider-a", "kahu")).coachVisits.length, 0);
    assert.equal((await readHorseLog(sql, "rider-a", "kahu")).sheets.length, 1);
  } finally {
    await pg.close();
  }
});
