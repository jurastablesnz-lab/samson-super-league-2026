import type { Sql } from "./db.ts";
import { isAdminIdentity } from "./beta-admin.ts";
import { adminEmails } from "./admin-emails.server.ts";

/** Allow-listed address with a Google account. Password sign-in is not admin. */
export async function isVerifiedAdmin(userId: string, sql: Sql): Promise<boolean> {
  const rows = await sql<{
    email: string;
  }>`select email from "user" where id = ${userId}`;
  const accounts = await sql<{
    providerId: string;
  }>`select "providerId" from account where "userId" = ${userId}`;
  return isAdminIdentity(
    rows[0]?.email?.toLowerCase() ?? null,
    adminEmails(),
    accounts.map((account) => account.providerId),
    process.env.BETA_ADMIN_TRUST_PASSWORD === "true",
  );
}

/** Shared allow-listed, verified-Google admin check used before privileged mutations. */
export async function requireVerifiedAdmin(
  userId: string,
  sql: Sql,
): Promise<{ id: string; email: string | null; name: string | null; isAdmin: true }> {
  const rows = await sql<{
    email: string;
    name: string;
  }>`select email, name from "user" where id = ${userId}`;
  if (!(await isVerifiedAdmin(userId, sql))) throw new Error("Admins only");
  return { id: userId, email: rows[0]?.email?.toLowerCase() ?? null, name: rows[0]?.name ?? null, isAdmin: true };
}
