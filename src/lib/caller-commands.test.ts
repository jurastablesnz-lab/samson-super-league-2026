import assert from "node:assert/strict";
import { test } from "node:test";
import {
  callerDevice,
  commandFromTranscript,
  commandMode,
  hearCommand,
  idleVad,
  micHelp,
  stepVad,
} from "./caller-commands.ts";
import { createCallerEar } from "./caller-ear.ts";
import { asSql, database } from "./test-database.ts";
import {
  beginPcm,
  claimSttSeconds,
  createPcmRing,
  encodeWavPcm,
  endPcm,
  peakPcm,
  pushPcm,
  sttLimitMessage,
} from "./caller-stt.ts";
import { hearClip, transcribeClip } from "./caller-stt.server.ts";

test("short riding words move the caller, and a long echo does not", () => {
  assert.equal(hearCommand("next"), "next");
  assert.equal(hearCommand("okay next"), "next");
  assert.equal(hearCommand("next one"), "next");
  assert.equal(hearCommand("go"), "next");
  assert.equal(hearCommand("go on"), "next");
  assert.equal(hearCommand("back"), "back");
  assert.equal(hearCommand("go back"), "back");
  assert.equal(hearCommand("previous"), "back");
  assert.equal(hearCommand("repeat"), "repeat");
  assert.equal(hearCommand("say again"), "repeat");
  assert.equal(hearCommand("again"), "repeat");
  assert.equal(hearCommand("halt at X"), null);
  assert.equal(hearCommand("the next movement is the circle left"), null);
  assert.equal(commandFromTranscript("next", true), null);
  assert.equal(commandFromTranscript("next", false), "next");
});

test("a clipped or misheard next still advances once", () => {
  for (const heard of [
    "Text.",
    "Fixed.",
    "text",
    "fixed",
    "necks",
    "nex",
    "nexus",
    "neck",
    "NEXT",
    "next one",
  ]) {
    assert.equal(hearCommand(heard), "next", heard);
  }
  assert.equal(hearCommand("next next next"), "next");
  assert.equal(hearCommand("next, next"), "next");
  assert.equal(hearCommand("bak"), "back");
  assert.equal(hearCommand("bark"), "back");
  assert.equal(hearCommand("agen"), "repeat");
  assert.equal(hearCommand("test"), null);
  assert.equal(hearCommand("test sound"), null);
  assert.equal(hearCommand("left"), null);
  assert.equal(hearCommand("rest"), null);
  assert.equal(hearCommand("pack"), null);
  assert.equal(hearCommand("bank"), null);
  assert.equal(hearCommand("the text of the movement please"), null);
});

test("an iPhone uses the microphone, and a home-screen app says how to listen", () => {
  assert.equal(commandMode({ ios: true, hasRecognition: true, hasMic: true }), "mic");
  assert.equal(commandMode({ ios: false, hasRecognition: true, hasMic: true }), "webkit");
  assert.equal(commandMode({ ios: true, hasRecognition: false, hasMic: false }), "none");
  assert.equal(callerDevice({ userAgent: "iPhone", standalone: true }).standalone, true);
  assert.equal(
    micHelp({ status: "unsupported", mode: "none", standalone: true }).includes("home-screen"),
    true,
  );
  assert.equal(
    micHelp({ status: "listening", mode: "mic", standalone: true }).startsWith("Listening"),
    true,
  );
  assert.equal(
    micHelp({ status: "permission", mode: "mic", standalone: false }).includes("Microphone"),
    true,
  );
  assert.equal(micHelp({ status: "closed", mode: "mic", standalone: true }), "Mic off — tap to enable");
});

test("a command is a short burst, and Ara speaking throws it away", () => {
  let state = idleVad();
  state = stepVad(state, 0.001, 500, false).next;
  assert.equal(state.recording, false);
  let stepped = stepVad(state, 0.05, 200, false);
  assert.equal(stepped.action, "start");
  stepped = stepVad(stepped.next, 0.04, 400, false);
  assert.equal(stepped.action, "none");
  stepped = stepVad(stepped.next, 0.001, 800, false);
  assert.equal(stepped.action, "stop");
  stepped = stepVad(stepped.next, 0.05, 200, true);
  assert.equal(stepped.action, "none");
  const recording = stepVad(idleVad(), 0.05, 200, false);
  assert.equal(stepVad(recording.next, 0.05, 100, true).action, "discard");
});

test("steady wind does not keep opening a clip", () => {
  let state = idleVad();
  for (let i = 0; i < 50; i += 1) state = stepVad(state, 0.05, 100, false).next;
  let starts = 0;
  for (let i = 0; i < 20; i += 1) {
    const stepped = stepVad(state, 0.05, 100, false);
    if (stepped.action === "start") starts += 1;
    state = stepped.next;
  }
  assert.equal(starts, 0);
});

test("recognition restarts after it ends, and ignores a word while Ara speaks", async () => {
  const commands: string[] = [];
  const logs: string[] = [];
  const recs: FakeRec[] = [];
  class FakeRec {
    continuous = false;
    interimResults = false;
    lang = "";
    onresult:
      | ((event: {
          resultIndex: number;
          results: { 0: { transcript: string }; isFinal?: boolean }[];
        }) => void)
      | null = null;
    onend: (() => void) | null = null;
    onerror: ((event: { error?: string }) => void) | null = null;
    started = 0;
    constructor() {
      recs.push(this);
    }
    start() {
      this.started += 1;
    }
    stop() {
      this.onend?.();
    }
    abort() {
      this.onend?.();
    }
  }
  const pending: (() => void)[] = [];
  const ear = createCallerEar({
    ios: false,
    hasRecognition: true,
    hasMic: false,
    Recognition: FakeRec as unknown as NonNullable<
      Parameters<typeof createCallerEar>[0]["Recognition"]
    >,
    onCommand: (command) => commands.push(command),
    onStatus: () => undefined,
    onLog: (line) => logs.push(line),
    schedule: (fn) => {
      pending.push(fn);
      return pending.length;
    },
    clear: () => undefined,
    now: () => 1_000,
  });
  assert.equal(ear.mode, "webkit");
  ear.arm();
  assert.equal(recs[0].started, 1);
  recs[0].onresult?.({
    resultIndex: 0,
    results: [{ 0: { transcript: "okay next" }, isFinal: true }],
  });
  assert.deepEqual(commands, ["next"]);
  recs[0].onresult?.({
    resultIndex: 0,
    results: [{ 0: { transcript: "next next" }, isFinal: true }],
  });
  assert.deepEqual(commands, ["next"]);
  recs[0].onend?.();
  assert.equal(pending.length > 0, true);
  pending[0]?.();
  assert.equal(recs[1]?.started, 1);
  ear.suspend();
  recs[1]?.onresult?.({ resultIndex: 0, results: [{ 0: { transcript: "next" }, isFinal: true }] });
  assert.deepEqual(commands, ["next"]);
  assert.equal(
    logs.some((line) => line.startsWith("mic: command")),
    true,
  );
});

test("a command clip keeps the audio from before the detector opens", () => {
  const ring = createPcmRing();
  pushPcm(ring, new Float32Array([1, 2]), 10);
  pushPcm(ring, new Float32Array([3]), 10);
  beginPcm(ring);
  pushPcm(ring, new Float32Array([4]), 10);
  const kept = endPcm(ring, false);
  assert.deepEqual(Array.from(kept ?? []), [1, 2, 3, 4]);
  pushPcm(ring, new Float32Array([9, 9, 9, 9, 9]), 10);
  beginPcm(ring);
  assert.equal(endPcm(ring, true), null);
});

test("a rider's command audio stops at the daily minutes, and a transcript is read", async () => {
  const pg = await database();
  try {
    const sql = asSql(pg);
    await pg.query(
      `insert into "user" (id, name, email, "emailVerified") values ('rider', 'Susan', 'susan@example.com', true)`,
    );
    assert.deepEqual(
      await claimSttSeconds(sql, { userId: "rider", limit: 4, day: "2026-11-13", seconds: 3 }),
      {
        ok: true,
      },
    );
    const blocked = await claimSttSeconds(sql, {
      userId: "rider",
      limit: 4,
      day: "2026-11-13",
      seconds: 2,
    });
    assert.deepEqual(blocked, { ok: false, error: sttLimitMessage(4) });
    const wav = new Uint8Array(800);
    const clip = encodeWavPcm(new Float32Array([0, 0.5, -0.5]), 16000);
    const header = new Uint8Array(await clip.arrayBuffer());
    assert.equal(String.fromCharCode(...header.slice(0, 4)), "RIFF");
    assert.equal(clip.type, "audio/wav");
    assert.equal(clip.size, 44 + 6);
    assert.equal(peakPcm(new Float32Array([0.25, -0.5, 0.125])), 0.5);
    const heard = await transcribeClip("key", wav, "audio/wav", async (_url, init) => {
      const form = init?.body as FormData;
      const keys = [...form.keys()];
      assert.equal(keys.at(-1), "file");
      assert.equal(form.get("language"), "en");
      assert.deepEqual(form.getAll("keyterm"), ["next", "back", "repeat", "again"]);
      return new Response(JSON.stringify({ text: "okay next" }), { status: 200 });
    });
    assert.equal(heard, "okay next");
    const via = await hearClip(
      sql,
      { userId: "admin", isAdmin: true, approved: false },
      { audioBase64: Buffer.from(wav).toString("base64"), mime: "audio/wav", seconds: 1 },
      { apiKey: "key", day: "2026-11-13" },
      async () => new Response(JSON.stringify({ text: "go back" }), { status: 200 }),
    );
    assert.deepEqual(via, { ok: true, text: "go back" });
  } finally {
    await pg.close();
  }
});
