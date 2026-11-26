/**
 * Transactional email via Resend (server-only).
 *
 * Env:
 *   RESEND_API_KEY  — Resend API key. Unset => email is OFF: password reset is
 *                     hidden in the UI and admin notifications are skipped.
 *   EMAIL_FROM      — verified sender, e.g. "XSalute <hello@virtualdressage.co.nz>".
 *                     Defaults to hello@virtualdressage.co.nz (must be verified in Resend).
 *   BETA_NOTIFY_EMAILS — optional comma list for "new application" and beta feedback alerts;
 *                     defaults to the admin emails. Set to "off" to disable.
 *
 * Never throws: failures are logged and reported as { ok: false }.
 */
import { env } from "./env.server.ts";

export function emailEnabled(): boolean {
  return !!env("RESEND_API_KEY");
}

export function emailFrom(): string {
  return env("EMAIL_FROM") ?? "XSalute <hello@virtualdressage.co.nz>";
}

export type SendResult = { ok: true; id?: string } | { ok: false; error: string };

export async function sendEmail(msg: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}): Promise<SendResult> {
  const key = env("RESEND_API_KEY");
  if (!key) return { ok: false, error: "email not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: emailFrom(),
        to: Array.isArray(msg.to) ? msg.to : [msg.to],
        subject: msg.subject,
        text: msg.text,
        ...(msg.html ? { html: msg.html } : {}),
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[email] Resend ${res.status}: ${body.slice(0, 300)}`);
      return { ok: false, error: `Resend ${res.status}` };
    }
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: json.id };
  } catch (err) {
    console.error("[email] send failed:", err instanceof Error ? err.message : err);
    return { ok: false, error: "send failed" };
  }
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendPasswordResetEmail(to: string, name: string | null, url: string) {
  const hi = name ? `Kia ora ${name},` : "Kia ora,";
  const text = `${hi}\n\nSomeone asked to reset the password for your XSalute account. If it was you, open this link (it expires in an hour):\n\n${url}\n\nIf you didn't ask, you can ignore this email — your password stays the same.\n\nXSalute by Virtual Dressage NZ`;
  const html = `<p>${esc(hi)}</p><p>Someone asked to reset the password for your XSalute account. If it was you, use the button below (the link expires in an hour).</p><p><a href="${esc(url)}" style="display:inline-block;background:#2fd3a7;color:#0b1020;padding:10px 18px;border-radius:8px;font-weight:700;text-decoration:none">Reset my password</a></p><p style="color:#666;font-size:13px">If you didn't ask, ignore this email — your password stays the same.</p><p style="color:#666;font-size:13px">XSalute by Virtual Dressage NZ</p>`;
  return sendEmail({ to, subject: "Reset your XSalute password", text, html });
}

export async function notifyNewApplication(
  recipients: string[],
  app: { fullName: string; email: string; region: string; riderGrade: string; competitionLevel: string; horses: string },
  adminUrl: string | null,
) {
  if (!emailEnabled() || recipients.length === 0) return { ok: false as const, error: "skipped" };
  const lines = [
    `New XSalute beta application`,
    ``,
    `Name: ${app.fullName}`,
    `Email: ${app.email}`,
    `Region: ${app.region}`,
    `Grade: ${app.riderGrade}`,
    `Level: ${app.competitionLevel}`,
    `Horses: ${app.horses}`,
    ``,
    adminUrl ? `Review it: ${adminUrl}` : `Review it on the /admin page.`,
  ];
  return sendEmail({
    to: recipients,
    subject: `New beta application — ${app.fullName}`,
    text: lines.join("\n"),
    replyTo: app.email,
  });
}

export type FeedbackEmail = {
  riderName: string;
  riderEmail: string;
  kindLabel: string;
  message: string;
  voiceLength: string | null;
  page: string;
  device: string;
  appVersion: string;
};

/** Plain text and HTML for a beta feedback alert. Exported for tests. */
export function feedbackEmailContent(item: FeedbackEmail, adminUrl: string | null) {
  const subject = `XSalute feedback from ${item.riderName} (${item.kindLabel})`;
  const lines = [
    `New beta feedback from ${item.riderName}${item.riderEmail ? ` <${item.riderEmail}>` : ""}`,
    `Type: ${item.kindLabel}`,
    ``,
    item.message ? item.message : "(No typed message.)",
    ``,
    ...(item.voiceLength ? [`Voice note: ${item.voiceLength}. Play it in Admin → Feedback.`] : []),
    `Screen: ${item.page || "unknown"}`,
    `Device: ${item.device}`,
    `App version: ${item.appVersion || "unknown"}`,
    ``,
    adminUrl ? `Open it in Admin → Feedback: ${adminUrl}` : `Open it in Admin → Feedback on the /admin page.`,
  ];
  const html = [
    `<p><strong>New beta feedback from ${esc(item.riderName)}</strong>${item.riderEmail ? ` &lt;${esc(item.riderEmail)}&gt;` : ""}<br>Type: ${esc(item.kindLabel)}</p>`,
    item.message
      ? `<blockquote style="margin:0;padding:8px 12px;border-left:3px solid #2fd3a7;white-space:pre-wrap">${esc(item.message)}</blockquote>`
      : `<p style="color:#666">(No typed message.)</p>`,
    item.voiceLength ? `<p>🎙️ Voice note: ${esc(item.voiceLength)}. Play it in Admin → Feedback.</p>` : "",
    `<p style="color:#666;font-size:13px">Screen: ${esc(item.page || "unknown")}<br>Device: ${esc(item.device)}<br>App version: ${esc(item.appVersion || "unknown")}</p>`,
    adminUrl
      ? `<p><a href="${esc(adminUrl)}" style="display:inline-block;background:#2fd3a7;color:#0b1020;padding:10px 18px;border-radius:8px;font-weight:700;text-decoration:none">Open Admin → Feedback</a></p>`
      : `<p>Open it in Admin → Feedback on the /admin page.</p>`,
  ].join("");
  return { subject, text: lines.join("\n"), html };
}

export async function notifyFeedback(recipients: string[], item: FeedbackEmail, adminUrl: string | null) {
  if (!emailEnabled() || recipients.length === 0) return { ok: false as const, error: "skipped" };
  const { subject, text, html } = feedbackEmailContent(item, adminUrl);
  return sendEmail({
    to: recipients,
    subject,
    text,
    html,
    ...(item.riderEmail ? { replyTo: item.riderEmail } : {}),
  });
}
