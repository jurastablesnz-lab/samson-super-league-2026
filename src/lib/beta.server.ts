/**
 * XSalute beta access rules (server-only).
 *
 * Admins: emails in BETA_ADMIN_EMAILS (default Susan's two addresses). An admin
 * email only counts when the account has a linked GOOGLE sign-in (the broker's
 * `grok-google` provider) — NOT a self-typed email/password sign-up, X, or any
 * other provider, so nobody can claim Susan's address by registering it first.
 * BETA_ADMIN_TRUST_PASSWORD=true relaxes this for local testing only — never
 * set it on a deployed app.
 */
import { getSql } from "./db";
import { env } from "./env.server";
import { authConfigured, DEV_USER_ID } from "./auth/verify.server";
import { gateIdentityEnabled } from "./auth/gate-identity.server";

/** Only Google sign-in proves an admin address. */
export const ADMIN_PROVIDERS = ["grok-google", "google"];

export const DEFAULT_ADMIN_EMAILS = ["susan@manawa.tech", "virtualdressagenz@gmail.com"];

function emailList(key: string, fallback: string[] = []): string[] {
  const raw = env(key);
  const list = raw ? raw.split(/[,\s]+/) : fallback;
  return list.map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function adminEmails(): string[] {
  return emailList("BETA_ADMIN_EMAILS", DEFAULT_ADMIN_EMAILS);
}

/** True when auth is fully off (VITE_AUTH_ENABLED=false, no DB) — legacy single-user mode. */
export function authOff(): boolean {
  return !authConfigured && !gateIdentityEnabled();
}

export type UserInfo = { id: string; email: string | null; name: string | null; isAdmin: boolean };

export async function loadUser(userId: string): Promise<UserInfo> {
  if (userId === DEV_USER_ID && authOff()) {
    return { id: userId, email: null, name: "Dev User", isAdmin: true };
  }
  const sql = await getSql();
  const rows = await sql<{ email: string; name: string }>`
    select email, name from "user" where id = ${userId}`;
  const email = rows[0]?.email?.toLowerCase() ?? null;
  let isAdmin = false;
  if (email && adminEmails().includes(email)) {
    if (env("BETA_ADMIN_TRUST_PASSWORD") === "true") {
      isAdmin = true;
    } else {
      const accounts = await sql<{ providerId: string }>`
        select "providerId" from account where "userId" = ${userId}`;
      isAdmin = accounts.some((a) => ADMIN_PROVIDERS.includes(a.providerId));
    }
  }
  return { id: userId, email, name: rows[0]?.name ?? null, isAdmin };
}

export function preApproved(email: string | null): boolean {
  return !!email && emailList("BETA_APPROVED_EMAILS").includes(email);
}
