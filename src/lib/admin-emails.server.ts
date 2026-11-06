import { env } from "./env.server.ts";

export const DEFAULT_ADMIN_EMAILS = ["susan@manawa.tech", "virtualdressagenz@gmail.com"];
export function adminEmails(): string[] {
  const raw = env("BETA_ADMIN_EMAILS");
  return (raw ? raw.split(/[\s,]+/) : DEFAULT_ADMIN_EMAILS)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
