import assert from "node:assert/strict";
import { test } from "node:test";
import { asSql, database } from "./test-database.ts";
import { sheetReadGate } from "./sheet-reads.ts";
import {
  acceptCues,
  claimCoachGeneration,
  coachCueLimitMessage,
  coachCuesPerDay,
  coachTtsMode,
  cueIsGrounded,
  evidenceScript,
  mergeCoachCues,
  claimTtsChars,
  coachTtsCharsPerDay,
  coachTtsLimitMessage,
  coachTtsVoice,
  cueRiderName,
  releaseTtsChars,
  rewriteCueText,
  riderFirstName,
  sheetMatchesTest,
  spokenHorseName,
} from "./coach-cues.ts";

const evidence = evidenceScript({
  firstName: "Susan",
  horseName: "Jura Samson",
  testName: "Novice 2A",
  sheets: [
    {
      date: "2026-08-31",
      summary: "The stretch circle needs more stretch.",
      lowMarks: [{ movement: "stretch circle", mark: "6", comment: "show more stretch" }],
      remarks: ["nose above the knee"],
    },
  ],
  notes: [{ date: "2026-09-01", text: "Coach asked for a square halt at X." }],
  visits: [],
  results: [{ date: "2026-08-31", test: "2A", percent: 61, place: "4" }],
});

test("cues may quote a real mark and must drop an invented one", () => {
  assert.equal(cueIsGrounded("Susan, ask for more stretch.", evidence, [7]), true);
  assert.equal(cueIsGrounded("The stretch circle was a 6. Ask for more.", evidence, [7]), true);
  assert.equal(cueIsGrounded("That halt was a 4.5.", evidence, [7]), false);
  const accepted = acceptCues(
    JSON.stringify({
      cues: [
        { n: 1, text: "Susan, sit deep and go for a square halt." },
        { n: 7, text: "Your last 2A sheet said show more stretch. The mark was 6." },
        { n: 8, text: "You scored 9.5 there." },
      ],
    }),
    [{ n: 1 }, { n: 7 }, { n: 8 }],
    evidence,
  );
  assert.equal(accepted[0].text.includes("square halt"), true);
  assert.equal(accepted[1].text.includes("6"), true);
  assert.equal(accepted[2].text, "");
});

test("a coach edit survives a refresh, and a cleared line stays cleared", () => {
  const merged = mergeCoachCues(
    [
      { n: 1, text: "Susan, softer hand.", source: "edit" },
      { n: 2, text: "", source: "edit" },
    ],
    [
      { n: 1, text: "Generated halt cue." },
      { n: 2, text: "Generated stretch cue." },
    ],
  );
  assert.deepEqual(merged, [
    { n: 1, text: "Susan, softer hand.", source: "edit" },
    { n: 2, text: "", source: "edit" },
  ]);
});

test("coaching is only for an approved rider, and an admin is not limited", () => {
  assert.equal(sheetReadGate({ approved: false, isAdmin: false }).ok, false);
  assert.deepEqual(sheetReadGate({ approved: true, isAdmin: false }), { ok: true, limited: true });
  assert.deepEqual(sheetReadGate({ approved: false, isAdmin: true }), { ok: true, limited: false });
  assert.equal(coachCuesPerDay(undefined), 8);
  assert.equal(coachCuesPerDay("3"), 3);
  assert.equal(coachTtsMode(undefined), "browser");
  assert.equal(coachTtsMode(undefined, "xai-key"), "xai");
  assert.equal(coachTtsMode("browser", "xai-key"), "browser");
  assert.equal(coachTtsMode("xai"), "xai");
  assert.equal(riderFirstName("Susan Leach"), "Susan");
  assert.equal(
    cueRiderName({ applicationName: "Susan Leach", accountName: "Virtual Dressage" }),
    "Susan",
  );
  assert.equal(cueRiderName({ applicationName: "", profileName: "Virtual Dressage", accountName: "Virtual Dressage" }), "");
  assert.equal(spokenHorseName("Jura Samson", "Samson"), "Samson");
  assert.equal(spokenHorseName("Jura Samson", ""), "Jura Samson");
  assert.equal(
    rewriteCueText("Virtual, ride Jura Samson into a halt", {
      riderName: "Susan",
      dropNames: ["Virtual"],
      spokenHorse: "Samson",
      registeredName: "Jura Samson",
    }),
    "Susan, ride Samson into a halt",
  );
  assert.equal(
    rewriteCueText("Virtual, ride Jura Samson into a halt", {
      riderName: "",
      dropNames: ["Virtual"],
      spokenHorse: "Jura Samson",
      registeredName: "Jura Samson",
    }),
    "ride Jura Samson into a halt",
  );
  assert.equal(sheetMatchesTest("Novice 2A", "2a", "Novice 2A"), true);
  assert.equal(sheetMatchesTest("2B", "2a", "Novice 2A"), false);
});

test("a rider stops at the daily coaching refreshes", async () => {
  const pg = await database();
  try {
    const sql = asSql(pg);
    await pg.query(
      `insert into "user" (id, name, email, "emailVerified") values ('rider', 'Susan', 'susan@example.com', true)`,
    );
    assert.deepEqual(
      await claimCoachGeneration(sql, { userId: "rider", limit: 1, day: "2026-11-12" }),
      { ok: true },
    );
    const blocked = await claimCoachGeneration(sql, { userId: "rider", limit: 1, day: "2026-11-12" });
    assert.deepEqual(blocked, { ok: false, error: coachCueLimitMessage(1) });
    assert.equal(coachTtsCharsPerDay(undefined), 40_000);
    assert.equal(coachTtsCharsPerDay("8000"), 8000);
    assert.equal(coachTtsVoice(undefined), "ara");
    assert.equal(coachTtsVoice("Eve"), "eve");
    assert.equal(coachTtsVoice(undefined, ["eve", "leo"]), "eve");
    assert.deepEqual(await claimTtsChars(sql, { userId: "rider", limit: 20, day: "2026-11-13", chars: 12 }), {
      ok: true,
    });
    const over = await claimTtsChars(sql, { userId: "rider", limit: 20, day: "2026-11-13", chars: 9 });
    assert.deepEqual(over, { ok: false, error: coachTtsLimitMessage(20) });
    await releaseTtsChars(sql, { userId: "rider", day: "2026-11-13", chars: 12 });
    assert.deepEqual(await claimTtsChars(sql, { userId: "rider", limit: 20, day: "2026-11-13", chars: 9 }), {
      ok: true,
    });
  } finally {
    await pg.close();
  }
});
