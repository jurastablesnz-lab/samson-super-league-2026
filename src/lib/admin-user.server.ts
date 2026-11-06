import type { Sql } from "./db.ts";
import { isAdminIdentity } from "./beta-admin.ts";
import { adminEmails } from "./admin-emails.server.ts";

/** Shared allow-listed, verified-Google admin check used before privileged mutations. */
export async function requireVerifiedAdmin(
  userId: string,
  sql: Sql,
): Promise<{ id: string; email: string | null; name: string | null; isAdmin: true }> {
  const rows = await sql<{
    email: string;
    name: string;
  }>`select email, name from "user" where id = ${userId}`;
  const accounts = await sql<{
    providerId: string;
  }>`select "providerId" from account where "userId" = ${userId}`;
  const email = rows[0]?.email?.toLowerCase() ?? null;
  if (
    !isAdminIdentity(
      email,
      adminEmails(),
      accounts.map((a) => a.providerId),
      process.env.BETA_ADMIN_TRUST_PASSWORD === "true",
    )
  )
    throw new Error("Admins only");
  return { id: userId, email, name: rows[0]?.name ?? null, isAdmin: true };
}
