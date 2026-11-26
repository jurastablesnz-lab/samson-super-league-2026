import { env } from "./env.server.ts";

export const DEFAULT_ADMIN_EMAILS = ["susan@manawa.tech", "virtualdressagenz@gmail.com"];
export function adminEmails(): string[] {
  const raw = env("BETA_ADMIN_EMAILS");
  return (raw ? raw.split(/[\s,]+/) : DEFAULT_ADMIN_EMAILS)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Who gets admin alerts (new applications, beta feedback): BETA_NOTIFY_EMAILS
 * when set ("off" turns alerts off), otherwise the admin emails above.
 */
export function adminNotifyEmails(): string[] {
  const raw = env("BETA_NOTIFY_EMAILS");
  if (raw === "off") return [];
  return raw ? raw.split(/[,\s]+/).filter(Boolean) : adminEmails();
}
