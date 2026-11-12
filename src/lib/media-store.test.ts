import assert from "node:assert/strict";
import { test } from "node:test";
import { asSql, database } from "./test-database.ts";
import {
  beginMediaUpload,
  completeMediaUpload,
  deleteMediaObject,
  listMediaParts,
  playbackUrl,
  readyMediaIds,
  signMediaPart,
  type StoragePort,
} from "./media-store.ts";

function port(): StoragePort & { removed: string[] } {
  const parts = new Map<string, { partNumber: number; etag: string }[]>();
  return {
    removed: [],
    async start(key) {
      parts.set(key, []);
      return `upload-${key}`;
    },
    async signPart(key, uploadId, partNumber) {
      return `https://files.test/${uploadId}/${partNumber}?key=${encodeURIComponent(key)}`;
    },
    async parts(key) {
      return parts.get(key) ?? [];
    },
    async finish(key, _uploadId, uploaded) {
      parts.set(key, uploaded);
    },
    async cancel(key) {
      parts.delete(key);
    },
    async readUrl(key) {
      return `https://files.test/read/${key}`;
    },
    async remove(key) {
      this.removed.push(key);
      parts.delete(key);
    },
  };
}

async function users() {
  const pg = await database();
  const sql = asSql(pg);
  await pg.query(
    `insert into "user" (id, name, email, "emailVerified") values
      ('rider', 'Rider', 'rider@example.com', true),
      ('other', 'Other', 'other@example.com', true)`,
  );
  return { pg, sql };
}

test("a rider's upload is private, resumable, and readable by an admin", async () => {
  const { pg, sql } = await users();
  const files = port();
  try {
    assert.deepEqual(
      await beginMediaUpload(sql, null, "rider", {
        mediaId: "v-1",
        kind: "video",
        fileName: "test.mp4",
        mime: "video/mp4",
        size: 10,
      }),
      { mode: "local" },
    );
    const started = await beginMediaUpload(sql, files, "rider", {
      mediaId: "v-1",
      kind: "video",
      fileName: "test.mp4",
      mime: "video/mp4",
      size: 10,
    });
    assert.equal(started.mode, "upload");
    if (started.mode !== "upload") return;
    const again = await beginMediaUpload(sql, files, "rider", {
      mediaId: "v-1",
      kind: "video",
      fileName: "test.mp4",
      mime: "video/mp4",
      size: 10,
    });
    assert.equal(again.mode, "upload");
    if (again.mode === "upload") assert.equal(again.uploadId, started.uploadId);

    await assert.rejects(
      signMediaPart(sql, files, "other", "v-1", 1),
      /another account|not on your account/,
    );
    const url = await signMediaPart(sql, files, "rider", "v-1", 1);
    assert.match(url, /^https:\/\/files\.test\//);
    assert.deepEqual(await listMediaParts(sql, files, "other", "v-1"), []);

    await assert.rejects(completeMediaUpload(sql, files, "rider", "v-1", []), /missing a piece/);
    await completeMediaUpload(sql, files, "rider", "v-1", [{ partNumber: 1, etag: '"abc"' }]);
    assert.deepEqual(await readyMediaIds(sql, "rider", ["v-1", "missing"]), ["v-1"]);
    assert.equal(
      await playbackUrl(sql, files, { userId: "rider", isAdmin: false }, "v-1"),
      "https://files.test/read/users/rider/video/v-1",
    );
    await assert.rejects(
      playbackUrl(sql, files, { userId: "other", isAdmin: false }, "v-1"),
      /private/,
    );
    assert.match(
      await playbackUrl(sql, files, { userId: "other", isAdmin: true }, "v-1"),
      /users\/rider\/video\/v-1/,
    );
    await deleteMediaObject(sql, files, "other", "v-1");
    assert.equal(files.removed.length, 0);
    await deleteMediaObject(sql, files, "rider", "v-1");
    assert.equal(files.removed.length, 1);
    assert.equal(await playbackUrl(sql, files, { userId: "rider", isAdmin: false }, "v-1"), "");
  } finally {
    await pg.close();
  }
});

test("a floor plan that is not a PDF or photo is refused", async () => {
  const { pg, sql } = await users();
  try {
    await assert.rejects(
      beginMediaUpload(sql, port(), "rider", {
        mediaId: "floorplan-1",
        kind: "floorplan",
        fileName: "secret.mp3",
        mime: "audio/mpeg",
        size: 100,
      }),
      /not allowed/,
    );
  } finally {
    await pg.close();
  }
});
