/**
 * Personal caller cues. The browser never sees the xAI key.
 * Approved riders and admins only. Admins are not counted against COACH_CUES_PER_DAY.
 * Spoken lines use xAI TTS when XAI_API_KEY is set. COACH_TTS=browser keeps the phone voice.
 * Optional XAI_TTS_VOICE (default ara, the warm English voice). COACH_TTS_CHARS_PER_DAY caps riders.
 */
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./auth/middleware";

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

async function actor(userId: string) {
  const { resolveRiderAccess } = await import("./beta.server");
  const { getSql } = await import("./db");
  const access = await resolveRiderAccess(userId);
  return { sql: await getSql(), ...access };
}

export const loadCoachCues = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { horseId?: string; testId?: string }) => ({
    horseId: text(input?.horseId, 80),
    testId: text(input?.testId, 40),
  }))
  .handler(async ({ context, data }) => {
    const { sql, user, approved } = await actor(context.userId);
    const { sheetReadGate } = await import("./sheet-reads");
    const gate = sheetReadGate({ approved, isAdmin: user.isAdmin });
    if (!gate.ok) return { ok: false as const, error: gate.error, cues: [] as { n: number; text: string; source: "ai" | "edit" }[] };
    const { loadStoredCues } = await import("./coach-cues.server");
    try {
      const cues = await loadStoredCues(sql, { userId: user.id, isAdmin: user.isAdmin }, data.horseId, data.testId);
      return { ok: true as const, cues, error: null };
    } catch (err) {
      return {
        ok: false as const,
        cues: [] as { n: number; text: string; source: "ai" | "edit" }[],
        error: err instanceof Error ? err.message : "Could not load coaching.",
      };
    }
  });

export const refreshCoachCues = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      horseId?: string;
      testId?: string;
      testName?: string;
      movements?: { n?: number; label?: string }[];
    }) => ({
      horseId: text(input?.horseId, 80),
      testId: text(input?.testId, 40),
      testName: text(input?.testName, 80),
      movements: (Array.isArray(input?.movements) ? input.movements : []).slice(0, 40).map((movement) => ({
        n: Number(movement?.n) || 0,
        label: text(movement?.label, 240),
      })),
    }),
  )
  .handler(async ({ context, data }) => {
    const { sql, user, approved } = await actor(context.userId);
    const { refreshCues } = await import("./coach-cues.server");
    try {
      return await refreshCues(sql, { userId: user.id, isAdmin: user.isAdmin, approved }, data);
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "The coaching could not be written." };
    }
  });

export const saveCoachCues = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { horseId?: string; testId?: string; cues?: { n?: number; text?: string; spoken?: string }[] }) => ({
    horseId: text(input?.horseId, 80),
    testId: text(input?.testId, 40),
    cues: (Array.isArray(input?.cues) ? input.cues : []).slice(0, 40).map((cue) => ({
      n: Number(cue?.n) || 0,
      text: text(cue?.text, 320),
      spoken: text(cue?.spoken, 400),
    })),
  }))
  .handler(async ({ context, data }) => {
    const { sql, user } = await actor(context.userId);
    const { saveEditedCues } = await import("./coach-cues.server");
    try {
      const cues = await saveEditedCues(
        sql,
        { userId: user.id, isAdmin: user.isAdmin },
        data.horseId,
        data.testId,
        data.cues,
      );
      return { ok: true as const, cues };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "Could not save the cues." };
    }
  });

export const speakCallerLines = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { lines?: string[] }) => ({
    lines: (Array.isArray(input?.lines) ? input.lines : []).slice(0, 8).map((line) => text(line, 500)),
  }))
  .handler(async ({ context, data }) => {
    const { sql, user, approved } = await actor(context.userId);
    const { ensureCallerSpeech, synthesizeXai } = await import("./coach-speech.server");
    const { readTtsObject, writeTtsObject } = await import("./media-r2.server");
    try {
      return await ensureCallerSpeech(
        sql,
        { userId: user.id, isAdmin: user.isAdmin, approved },
        data.lines,
        {
          coachTts: process.env.COACH_TTS,
          apiKey: process.env.XAI_API_KEY,
          voice: process.env.XAI_TTS_VOICE,
          charsPerDay: process.env.COACH_TTS_CHARS_PER_DAY,
          budgetUsd: process.env.AI_MONTHLY_BUDGET_USD,
        },
        (line, voice) => synthesizeXai(process.env.XAI_API_KEY ?? "", voice, line),
        writeTtsObject,
        readTtsObject,
      );
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "The voice could not be prepared." };
    }
  });

export const hearCallerClip = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { audio?: string; mime?: string; seconds?: number }) => ({
    audio: typeof input?.audio === "string" ? input.audio.slice(0, 200_000) : "",
    mime: text(input?.mime, 40),
    seconds: Number(input?.seconds) || 1,
  }))
  .handler(async ({ context, data }) => {
    const { sql, user, approved } = await actor(context.userId);
    const { hearClip } = await import("./caller-stt.server");
    try {
      return await hearClip(
        sql,
        { userId: user.id, isAdmin: user.isAdmin, approved },
        { audioBase64: data.audio, mime: data.mime, seconds: data.seconds },
        {
          apiKey: process.env.XAI_API_KEY,
          secondsPerDay: process.env.COACH_STT_SECONDS_PER_DAY,
          budgetUsd: process.env.AI_MONTHLY_BUDGET_USD,
        },
      );
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "That word could not be heard." };
    }
  });
