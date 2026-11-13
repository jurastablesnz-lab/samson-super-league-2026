import assert from "node:assert/strict";
import { test } from "node:test";
import { speechHash } from "./caller-speech.ts";
import { ensureCallerSpeech } from "./coach-speech.server.ts";
import { asSql, database } from "./test-database.ts";

const mp3 = new Uint8Array([0xff, 0xfb, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

test("speech is generated once, cached, and an unapproved rider gets none", async () => {
  const pg = await database();
  try {
    const sql = asSql(pg);
    await pg.query(
      `insert into "user" (id, name, email, "emailVerified") values ('rider', 'Susan', 'susan@example.com', true)`,
    );
    const calls: string[] = [];
    const synthesize = async (text: string) => {
      calls.push(text);
      return mp3;
    };
    const denied = await ensureCallerSpeech(
      sql,
      { userId: "rider", isAdmin: false, approved: false },
      ["Enter at A"],
      { apiKey: "key" },
      synthesize,
    );
    assert.equal(denied.ok, false);
    const first = await ensureCallerSpeech(
      sql,
      { userId: "rider", isAdmin: false, approved: true },
      ["Enter at A", "Enter at A"],
      { apiKey: "key", voice: "ara", charsPerDay: "20", day: "2026-11-13" },
      synthesize,
    );
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.mode, "xai");
    assert.equal(first.voice, "ara");
    assert.equal(first.clips.length, 1);
    assert.equal(first.clips[0].cached, false);
    assert.equal(typeof first.clips[0].audioBase64, "string");
    assert.deepEqual(calls, ["Enter at A"]);
    const again = await ensureCallerSpeech(
      sql,
      { userId: "rider", isAdmin: false, approved: true },
      ["Enter at A"],
      { apiKey: "key", voice: "ara", charsPerDay: "20", day: "2026-11-13" },
      synthesize,
    );
    assert.equal(again.ok && again.clips[0]?.cached, true);
    assert.deepEqual(calls, ["Enter at A"]);
    const hash = await speechHash("ara", "Enter at A");
    assert.equal(again.ok && again.clips[0]?.hash, hash);
    const browser = await ensureCallerSpeech(
      sql,
      { userId: "rider", isAdmin: false, approved: true },
      ["Hello"],
      { apiKey: "key", coachTts: "browser" },
      synthesize,
    );
    assert.equal(browser.ok && browser.mode, "browser");
    assert.equal(calls.length, 1);
  } finally {
    await pg.close();
  }
});

test("a rider's daily character budget stops new lines and an admin is exempt", async () => {
  const pg = await database();
  try {
    const sql = asSql(pg);
    await pg.query(
      `insert into "user" (id, name, email, "emailVerified") values ('rider', 'Susan', 'susan@example.com', true)`,
    );
    const synthesize = async () => mp3;
    const spent = await ensureCallerSpeech(
      sql,
      { userId: "rider", isAdmin: false, approved: true },
      ["One two three four five"],
      { apiKey: "key", charsPerDay: "4", day: "2026-11-13" },
      synthesize,
    );
    assert.equal(spent.ok && spent.budget, "spent");
    assert.equal(spent.ok && spent.clips[0]?.audioBase64, undefined);
    const admin = await ensureCallerSpeech(
      sql,
      { userId: "admin", isAdmin: true, approved: false },
      ["One two three four five"],
      { apiKey: "key", charsPerDay: "4", day: "2026-11-13" },
      synthesize,
    );
    assert.equal(admin.ok && admin.budget, "ok");
    assert.equal(typeof (admin.ok ? admin.clips[0]?.audioBase64 : ""), "string");
  } finally {
    await pg.close();
  }
});
