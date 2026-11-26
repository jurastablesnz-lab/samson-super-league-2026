import assert from "node:assert/strict";
import { test } from "node:test";
import { asSql, database } from "./test-database.ts";
import { cleanFeedback } from "./feedback-rules.ts";
import {
  FEEDBACK_BURST,
  createFeedback,
  feedbackAudioKey,
  feedbackAudioUrl,
  listFeedback,
  setFeedbackStatus,
  type FeedbackAudioPort,
} from "./feedback-store.ts";
import { feedbackEmailContent } from "./email.server.ts";

function bucket(): FeedbackAudioPort & {
  objects: Map<string, { bytes: Uint8Array; mime: string }>;
} {
  const objects = new Map<string, { bytes: Uint8Array; mime: string }>();
  return {
    objects,
    async put(key, bytes, mime) {
      objects.set(key, { bytes, mime });
    },
    async readUrl(key, mime, fileName) {
      return `https://files.test/signed/${key}?type=${encodeURIComponent(mime)}&name=${fileName}`;
    },
    async remove(key) {
      objects.delete(key);
    },
  };
}

async function setup() {
  const pg = await database();
  const sql = asSql(pg);
  await pg.query(
    `insert into "user" (id, name, email, "emailVerified") values
      ('nicole', 'Nicole G', 'nicole@example.com', true),
      ('shelley', '', 'shelley@example.com', true)`,
  );
  await pg.query(
    `insert into beta_applications (user_id, email, full_name, region, rider_grade, competition_level,
      horses, goals, heard_from, consent) values
      ('nicole', 'nicole@example.com', 'Nicole Rider', 'Manawatū', 'Open', 'PSG', '', '', '', true)`,
  );
  return { pg, sql };
}

let n = 0;
const ids = () => `fb-test-${String(++n).padStart(4, "0")}`;

test("a typed note is saved with its context and shows up for the admin", async () => {
  const { pg, sql } = await setup();
  try {
    const draft = cleanFeedback(
      {
        kind: "bug",
        message: "The caller skipped C",
        page: "/ · Tests · Galileo",
        appVersion: "abc1234",
        userAgent: "iPhone",
      },
      false,
    );
    const item = await createFeedback(sql, bucket(), "nicole", draft, null, ids);
    assert.equal(item.riderName, "Nicole Rider");
    assert.equal(item.riderEmail, "nicole@example.com");
    assert.equal(item.kind, "bug");
    assert.equal(item.hasAudio, false);
    assert.equal(item.status, "open");
    assert.equal(item.page, "/ · Tests · Galileo");
    const list = await listFeedback(sql, "open");
    assert.deepEqual(
      list.map((i) => i.id),
      [item.id],
    );
    // No application name falls back to the email.
    const other = await createFeedback(
      sql,
      null,
      "shelley",
      cleanFeedback({ message: "Love it" }, false),
      null,
      ids,
    );
    assert.equal(other.riderName, "shelley@example.com");
  } finally {
    await pg.close();
  }
});

test("a voice note goes to the private bucket under the rider and plays back by signed link", async () => {
  const { pg, sql } = await setup();
  const files = bucket();
  try {
    const bytes = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]);
    const item = await createFeedback(
      sql,
      files,
      "nicole",
      cleanFeedback({ message: "", audioMs: "42000" }, true),
      { bytes, mime: "audio/mp4;codecs=mp4a.40.2" },
      ids,
    );
    assert.equal(item.hasAudio, true);
    assert.equal(item.audioMime, "audio/mp4");
    assert.equal(item.audioMs, 42000);
    const key = `feedback/nicole/${item.id}.m4a`;
    assert.deepEqual([...files.objects.keys()], [key]);
    assert.equal(files.objects.get(key)?.mime, "audio/mp4");
    const url = await feedbackAudioUrl(sql, files, item.id);
    assert.match(
      url,
      /^https:\/\/files\.test\/signed\/feedback\/nicole\/.+\.m4a\?type=audio%2Fmp4&name=xsalute-feedback-\d{4}-\d{2}-\d{2}\.m4a$/,
    );
    assert.equal(await feedbackAudioUrl(sql, null, item.id), "");
    assert.equal(await feedbackAudioUrl(sql, files, "../../etc"), "");
  } finally {
    await pg.close();
  }
});

test("voice notes are refused without storage, when too big, or in an odd format", async () => {
  const { pg, sql } = await setup();
  try {
    const draft = cleanFeedback({ message: "" }, true);
    const audio = { bytes: new Uint8Array(10), mime: "audio/mp4" };
    await assert.rejects(
      createFeedback(sql, null, "nicole", draft, audio, ids),
      /Voice notes are not switched on/,
    );
    await assert.rejects(
      createFeedback(
        sql,
        bucket(),
        "nicole",
        draft,
        { bytes: new Uint8Array(5 * 1024 * 1024), mime: "audio/mp4" },
        ids,
      ),
      /too long/,
    );
    await assert.rejects(
      createFeedback(
        sql,
        bucket(),
        "nicole",
        draft,
        { bytes: new Uint8Array(10), mime: "text/html" },
        ids,
      ),
      /not a format/,
    );
    assert.equal((await listFeedback(sql)).length, 0);
    assert.throws(() => feedbackAudioKey("../x", "fb-test-1234", "audio/mp4"), /cannot store/);
  } finally {
    await pg.close();
  }
});

test("an admin can mark feedback handled and reopen it", async () => {
  const { pg, sql } = await setup();
  try {
    const item = await createFeedback(
      sql,
      null,
      "nicole",
      cleanFeedback({ message: "Idea", kind: "idea" }, false),
      null,
      ids,
    );
    await setFeedbackStatus(sql, item.id, "handled", "susan@manawa.tech");
    let [row] = await listFeedback(sql, "handled");
    assert.equal(row.status, "handled");
    assert.equal(row.handledBy, "susan@manawa.tech");
    assert.ok(row.handledAt);
    assert.equal((await listFeedback(sql, "open")).length, 0);
    await setFeedbackStatus(sql, item.id, "open", "susan@manawa.tech");
    [row] = await listFeedback(sql, "open");
    assert.equal(row.handledBy, null);
  } finally {
    await pg.close();
  }
});

test("a stuck button cannot flood the inbox", async () => {
  const { pg, sql } = await setup();
  try {
    for (let i = 0; i < FEEDBACK_BURST; i++) {
      await createFeedback(
        sql,
        null,
        "shelley",
        cleanFeedback({ message: `note ${i}` }, false),
        null,
        ids,
      );
    }
    await assert.rejects(
      createFeedback(
        sql,
        null,
        "shelley",
        cleanFeedback({ message: "one more" }, false),
        null,
        ids,
      ),
      /a lot of feedback/,
    );
  } finally {
    await pg.close();
  }
});

test("the alert email has the text, the rider, and the admin link, and escapes HTML", () => {
  const out = feedbackEmailContent(
    {
      riderName: "Nicole Rider",
      riderEmail: "nicole@example.com",
      kindLabel: "Something's not working",
      message: "The caller <b>skipped</b> C",
      voiceLength: "0:42",
      page: "/ · Tests · Galileo",
      device: "iPhone (iOS 18.1) · Safari",
      appVersion: "abc1234",
    },
    "https://app.xsalute.co.nz/admin#feedback",
  );
  assert.equal(out.subject, "XSalute feedback from Nicole Rider (Something's not working)");
  assert.match(out.text, /The caller <b>skipped<\/b> C/);
  assert.match(out.text, /Voice note: 0:42/);
  assert.match(out.text, /https:\/\/app\.xsalute\.co\.nz\/admin#feedback/);
  assert.match(out.html, /The caller &lt;b&gt;skipped&lt;\/b&gt; C/);
  assert.equal(out.html.includes("<b>skipped</b>"), false);
  assert.match(out.html, /href="https:\/\/app\.xsalute\.co\.nz\/admin#feedback"/);
  assert.doesNotMatch(out.text + out.html, /Kia ora/);
});
