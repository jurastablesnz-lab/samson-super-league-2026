/**
 * Beta feedback server functions. Riders send a typed note and/or a voice note;
 * admins read, play and mark them handled. Voice notes live in the private R2
 * bucket and are only ever played through a short-lived signed link.
 */
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./auth/middleware";
import { MAX_VOICE_BYTES, cleanFeedback } from "./feedback-rules";
import type { FeedbackItem } from "./feedback-store";

export type { FeedbackItem };

/** Whether voice notes can be stored here. Text feedback always works. */
export const feedbackOptions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const { cloudConfigured } = await import("./media-r2.server");
    return { voice: cloudConfigured() };
  });

type SubmitInput = {
  kind: string;
  message: string;
  page: string;
  appVersion: string;
  userAgent: string;
  audioMs: string;
  audio: Blob | null;
};

export const submitFeedback = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: FormData): SubmitInput => {
    if (!(input instanceof FormData)) throw new Error("Feedback must be sent as a form.");
    const field = (name: string) => {
      const value = input.get(name);
      return typeof value === "string" ? value : "";
    };
    const audio = input.get("audio");
    const blob = audio && typeof audio !== "string" && audio.size > 0 ? audio : null;
    if (blob && blob.size > MAX_VOICE_BYTES)
      throw new Error("That voice note is too long. Keep it under two minutes.");
    return {
      kind: field("kind"),
      message: field("message"),
      page: field("page"),
      appVersion: field("appVersion"),
      userAgent: field("userAgent"),
      audioMs: field("audioMs"),
      audio: blob,
    };
  })
  .handler(async ({ context, data }) => {
    const { requireAccess } = await import("./rider.server");
    const user = await requireAccess(context.userId);
    const draft = cleanFeedback(data, !!data.audio);
    const { getSql } = await import("./db");
    const { feedbackAudioPort } = await import("./media-r2.server");
    const { createFeedback, markFeedbackEmailed } = await import("./feedback-store");
    const sql = await getSql();
    const audio = data.audio
      ? { bytes: new Uint8Array(await data.audio.arrayBuffer()), mime: data.audio.type }
      : null;
    const item = await createFeedback(sql, feedbackAudioPort(), user.id, draft, audio);

    // Tell Susan. Best effort: the rider's feedback is already saved.
    try {
      const { notifyFeedback, emailEnabled } = await import("./email.server");
      if (emailEnabled()) {
        const { adminNotifyEmails } = await import("./admin-emails.server");
        const { env } = await import("./env.server");
        const { FEEDBACK_KIND_LABELS, deviceLabel, formatDuration } =
          await import("./feedback-rules");
        const base = env("BETTER_AUTH_URL");
        const sent = await notifyFeedback(
          adminNotifyEmails(),
          {
            riderName: item.riderName,
            riderEmail: item.riderEmail,
            kindLabel: FEEDBACK_KIND_LABELS[item.kind],
            message: item.message,
            voiceLength: item.hasAudio ? formatDuration(item.audioMs) : null,
            page: item.page,
            device: deviceLabel(item.userAgent),
            appVersion: item.appVersion,
          },
          base ? `${base.replace(/\/+$/, "")}/admin#feedback` : null,
        );
        if (sent.ok) await markFeedbackEmailed(sql, item.id);
      }
    } catch (err) {
      console.error(
        "[feedback] admin notification failed:",
        err instanceof Error ? err.message : err,
      );
    }
    return { ok: true as const, id: item.id };
  });

async function admin(userId: string) {
  const { getSql } = await import("./db");
  const { requireAdminUser } = await import("./rider.server");
  const sql = await getSql();
  const user = await requireAdminUser(userId, sql);
  return { sql, user };
}

export const listFeedbackForAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<FeedbackItem[]> => {
    const { sql } = await admin(context.userId);
    const { listFeedback } = await import("./feedback-store");
    return listFeedback(sql, "all");
  });

export const feedbackPlaybackUrl = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: string }) => ({ id: String(input?.id ?? "").slice(0, 80) }))
  .handler(async ({ context, data }) => {
    const { sql } = await admin(context.userId);
    const { feedbackAudioPort } = await import("./media-r2.server");
    const { feedbackAudioUrl } = await import("./feedback-store");
    return { url: await feedbackAudioUrl(sql, feedbackAudioPort(), data.id) };
  });

export const setFeedbackHandled = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: string; handled?: boolean }) => ({
    id: String(input?.id ?? "").slice(0, 80),
    handled: input?.handled !== false,
  }))
  .handler(async ({ context, data }) => {
    const { sql, user } = await admin(context.userId);
    const { setFeedbackStatus } = await import("./feedback-store");
    await setFeedbackStatus(sql, data.id, data.handled ? "handled" : "open", user.email);
    return { ok: true as const };
  });
