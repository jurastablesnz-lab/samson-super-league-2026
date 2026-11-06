import assert from "node:assert/strict";
import { test } from "node:test";
import { loadAdminRiders } from "./admin-riders.ts";
import { hasMovementData } from "./admin-rider-rules.ts";
import { asSql, database } from "./test-database.ts";
import { generatePlan, sanitisePlanConfig, testsForLevel } from "./plan-builder.ts";

test("name-only diagnostics agree with the shared test choices", () => {
  for (const names of Object.values([
    "2A",
    "2B",
    "2C",
    "2B Super 5",
    "Level 2 musical freestyle",
    "3A",
    "FEI Grand Prix",
  ])) {
    for (const name of Array.isArray(names) ? names : [names])
      assert.equal(
        hasMovementData(name),
        [
          "2A",
          "2B",
          "2C",
          "2B Super 5",
          "Level 2 musical freestyle",
          "Level 3 musical freestyle",
        ].includes(name),
      );
  }
});

test("admin rider summaries show score review counts, competitions, phases and setup problems", async () => {
  const pg = await database();
  try {
    const sql = asSql(pg);
    await pg.query(
      "insert into \"user\" (id, name, email, \"emailVerified\") values ('rider', 'A Rider', 'rider@example.com', true)",
    );
    await pg.query(
      "insert into beta_applications (user_id, email, full_name, region, rider_grade, competition_level, horses, goals, heard_from, consent, status) values ('rider', 'rider@example.com', 'A Rider', 'Canterbury', 'Non-graded', 'Level 2', '', 'Training', 'Admin', true, 'approved')",
    );
    await pg.query("insert into riders (user_id, display_name) values ('rider', 'A Rider')");
    await pg.query(
      "insert into horses (id, user_id, name, level) values ('horse', 'rider', 'Bella', 'Level 2')",
    );
    const config = sanitisePlanConfig(
      {
        horseName: "Bella",
        level: "Level 2",
        tests: ["2A", "3A"],
        shows: [{ id: "show", name: "Canterbury Champs", start: "2026-11-21", end: "2026-11-22" }],
        goals: [],
      },
      { horseName: "Bella", level: "Level 2" },
    );
    const plan = generatePlan(config);
    await pg.query(
      "insert into plans (horse_id, user_id, config, plan) values ('horse', 'rider', $1, $2)",
      [JSON.stringify(config), JSON.stringify(plan)],
    );
    for (const [id, source, review, percent] of [
      ["kept", "evo_csv", "kept", 65.4],
      ["pending", "evo_csv", "pending", 70],
      ["rejected", "evo_csv", "rejected", 73],
      ["other", "app", "kept", 68.2],
    ] as const) {
      await pg.query(
        "insert into results (user_id, horse_id, client_id, source, review_status, show_name, test, percent) values ('rider', 'horse', $1, $2, $3, 'Show', '2A', $4)",
        [id, source, review, percent],
      );
    }
    const [rider] = await loadAdminRiders(sql);
    assert.equal(rider.name, "A Rider");
    assert.equal(rider.applicationStatus, "approved");
    assert.equal(rider.horses.length, 1);
    const horse = rider.horses[0];
    assert.deepEqual(horse.tests, [
      { name: "2A", nameOnly: false },
      { name: "3A", nameOnly: true },
    ]);
    assert.equal(horse.shows[0]?.name, "Canterbury Champs");
    assert.deepEqual(
      [horse.keptEvo, horse.pendingEvo, horse.rejectedEvo, horse.otherScores, horse.bestPercent],
      [1, 1, 1, 1, 68.2],
    );
    assert.ok(horse.phase);
    assert.ok(horse.problems.some((p) => p.includes("ESNZ")));
    assert.ok(horse.problems.some((p) => p.includes("name only")));
    assert.ok(horse.problems.some((p) => p.includes("1 EVO score")));
    assert.ok(testsForLevel("Level 2").includes("2B Super 5"));
  } finally {
    await pg.close();
  }
});
