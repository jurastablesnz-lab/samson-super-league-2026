/**
 * XSalute beta access rules (server-only).
 *
 * Admins: emails in BETA_ADMIN_EMAILS (default Susan's two addresses). An admin
 * email only counts when the account has a linked GOOGLE sign-in (the broker's
 * `grok-google` or native `google` provider) — NOT a self-typed email/password
 * sign-up, X, or any other provider, so nobody can claim Susan's address by
 * registering it first.
 * BETA_ADMIN_TRUST_PASSWORD=true relaxes this for local testing only — never
 * set it on a deployed app.
 */
import { type Sql } from "./db";
import { env } from "./env.server";
import { authConfigured, DEV_USER_ID } from "./auth/verify.server";
import { gateIdentityEnabled } from "./auth/gate-identity.server";
import { isAdminIdentity } from "./beta-admin";

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

export async function loadUser(userId: string, providedSql?: Sql): Promise<UserInfo> {
  if (userId === DEV_USER_ID && authOff()) {
    return { id: userId, email: null, name: "Dev User", isAdmin: true };
  }
  const sql = providedSql ?? (await (await import("./db")).getSql());
  const rows = await sql<{ email: string; name: string }>`
    select email, name from "user" where id = ${userId}`;
  const email = rows[0]?.email?.toLowerCase() ?? null;
  let isAdmin = false;
  const accounts = await sql<{
    providerId: string;
  }>`select "providerId" from account where "userId" = ${userId}`;
  if (
    isAdminIdentity(
      email,
      adminEmails(),
      accounts.map((a) => a.providerId),
      env("BETA_ADMIN_TRUST_PASSWORD") === "true",
    )
  )
    isAdmin = true;
  // Normal rider access uses the same verified identity as workspace claiming.
  return { id: userId, email, name: rows[0]?.name ?? null, isAdmin };
}

export async function resolveRiderAccess(
  userId: string,
): Promise<{ user: UserInfo; approved: boolean }> {
  const sql = await (await import("./db")).getSql();
  const user = await loadUser(userId, sql);
  if (user.isAdmin || authOff()) {
    await sql`insert into riders (user_id, display_name, last_active_at) values (${userId}, ${user.name ?? ""}, now()) on conflict (user_id) do update set last_active_at = now(), updated_at = now()`;
    return { user, approved: true };
  }
  const { loadVerifiedIdentity, verifiedGoogle, claimInvitation, assertWorkspaceAccess } =
    await import("./rider-invites.server");
  const identity = await loadVerifiedIdentity(sql, userId);
  // One Google-linked account owns this claim. A same-email password account
  // cannot claim, grant or use a prepared workspace.
  const claimed = await claimInvitation(sql, identity);
  const rows = await sql<{
    status: string;
  }>`select status from beta_applications where user_id = ${userId}`;
  const approved = rows[0]?.status === "approved" || preApproved(user.email);
  const appScoredClaim = !!claimed && verifiedGoogle(identity);
  return {
    user,
    approved: await assertWorkspaceAccess(identity, approved || appScoredClaim, user.isAdmin),
  };
}

export function preApproved(email: string | null): boolean {
  return !!email && emailList("BETA_APPROVED_EMAILS").includes(email);
}
