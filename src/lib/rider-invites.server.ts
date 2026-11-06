import type { Sql } from "./db";

export type VerifiedIdentity = {
  id: string;
  email: string | null;
  emailVerified: boolean;
  providers: string[];
};

/** The session comes from authMiddleware; its provider and email evidence must
 * also come from our auth tables, not from a browser-supplied claim. */
export async function loadVerifiedIdentity(sql: Sql, userId: string): Promise<VerifiedIdentity> {
  const users = await sql<{
    id: string;
    email: string | null;
    emailVerified: boolean;
  }>`select id, email, "emailVerified" from "user" where id = ${userId}`;
  if (!users[0]) throw new Error("Your sign-in account was not found");
  const accounts = await sql<{
    providerId: string;
  }>`select "providerId" from account where "userId" = ${userId}`;
  return {
    id: users[0].id,
    email: users[0].email?.toLowerCase() ?? null,
    emailVerified: users[0].emailVerified,
    providers: accounts.map((a) => a.providerId),
  };
}
export function verifiedGoogle(identity: VerifiedIdentity): boolean {
  return (
    !!identity.email &&
    identity.emailVerified &&
    identity.providers.some((p) => p === "google" || p === "grok-google")
  );
}

type InvitationInput = { email: string; fullName: string; createdBy: string };
async function createInvitationUnlocked(sql: Sql, input: InvitationInput) {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Enter the rider's full email address");
  const fullName = input.fullName
    .replace(/[^\P{C}]/gu, "")
    .trim()
    .slice(0, 120);
  if (!fullName) throw new Error("Enter the rider's full name");
  const invitations = await sql<{
    email: string;
  }>`select email from rider_invitations where lower(email) = ${email} for update`;
  if (invitations.length) throw new Error("A workspace is already prepared for that email");
  const users = await sql<{
    id: string;
    emailVerified: boolean;
    providerId: string | null;
  }>`select u.id, u."emailVerified", a."providerId" from "user" u left join account a on a."userId" = u.id where lower(u.email) = ${email} for update of u`;
  if (users.length) {
    const verified = users.some(
      (u) => u.emailVerified && (u.providerId === "google" || u.providerId === "grok-google"),
    );
    if (!verified)
      throw new Error(
        "Ask that rider to sign in with their matching Google account first. This protects their workspace.",
      );
    await approveRider(sql, users[0].id, email, fullName, input.createdBy);
    await sql`insert into rider_invitations (id, email, full_name, workspace_user_id, created_by, claimed_by_user_id, claimed_at) values (${crypto.randomUUID()}, ${email}, ${fullName}, ${users[0].id}, ${input.createdBy}, ${users[0].id}, now())`;
    return { id: users[0].id, userId: users[0].id, email };
  }
  const userId = `invite-${crypto.randomUUID()}`;
  const id = crypto.randomUUID();
  // The placeholder NEVER uses the rider's real email, so Google linking can
  // neither sign into it nor bypass the explicit verified-email claim below.
  await sql`insert into "user" (id, name, email, "emailVerified") values (${userId}, ${fullName}, ${`${userId}@prepared.invalid`}, false)`;
  await approveRider(sql, userId, email, fullName, input.createdBy);
  await sql`insert into rider_invitations (id, email, full_name, workspace_user_id, created_by) values (${id}, ${email}, ${fullName}, ${userId}, ${input.createdBy})`;
  return { id, userId, email };
}

export async function createInvitation(sql: Sql, input: InvitationInput) {
  await sql.query("begin");
  try {
    const invitation = await createInvitationUnlocked(sql, input);
    await sql.query("commit");
    return invitation;
  } catch (error) {
    await sql.query("rollback");
    throw error;
  }
}

export async function prepareRiderWorkspace(
  sql: Sql,
  input: InvitationInput & {
    horses: {
      name: string;
      level: string;
      esnzNumber: string | null;
      config: unknown;
      plan: unknown;
    }[];
    applicationHorses: { name: string; level: string; esnzNumber?: string; notes: string }[];
  },
) {
  await sql.query("begin");
  try {
    const existing = await sql<{
      id: string;
    }>`select id from "user" where lower(email) = ${input.email} for update`;
    if (existing.length && input.horses.length)
      throw new Error(
        "This rider has already signed in. Ask them to change their own horse setup instead of overwriting it.",
      );
    const invitation = await createInvitationUnlocked(sql, input);
    await sql`update beta_applications set horse_list = ${JSON.stringify(input.applicationHorses)}::jsonb, horses = ${input.applicationHorses.map((h) => `${h.name} (${h.level})`).join("\n")} where user_id = ${invitation.userId}`;
    for (const [index, horse] of input.horses.entries()) {
      const horseId = crypto.randomUUID();
      await sql`insert into horses (id, user_id, name, level, esnz_number, sort_order) values (${horseId}, ${invitation.userId}, ${horse.name}, ${horse.level}, ${horse.esnzNumber}, ${index})`;
      await sql`insert into plans (horse_id, user_id, config, plan) values (${horseId}, ${invitation.userId}, ${JSON.stringify(horse.config)}::jsonb, ${JSON.stringify(horse.plan)}::jsonb)`;
    }
    await sql.query("commit");
    return invitation;
  } catch (error) {
    await sql.query("rollback");
    throw error;
  }
}

async function approveRider(
  sql: Sql,
  userId: string,
  email: string,
  fullName: string,
  decidedBy: string,
) {
  await sql`insert into beta_applications (user_id, email, full_name, region, rider_grade, competition_level, horses, goals, heard_from, consent, status, decided_at, decided_by)
    values (${userId}, ${email}, ${fullName}, 'Admin prepared', 'Non-graded', 'Not competing yet', '', 'Added by an admin', 'Admin', true, 'approved', now(), ${decidedBy})
    on conflict (user_id) do update set status = 'approved', full_name = excluded.full_name, decided_at = now(), decided_by = excluded.decided_by, updated_at = now()`;
  await sql`insert into riders (user_id, display_name) values (${userId}, ${fullName}) on conflict (user_id) do update set display_name = excluded.display_name, updated_at = now()`;
}

/** Empty tables are fine. All ownership changes commit together, or none do. */
export async function claimInvitation(
  sql: Sql,
  identity: VerifiedIdentity,
): Promise<string | null> {
  if (!verifiedGoogle(identity)) return null;
  await sql.query("begin");
  try {
    await sql.query(
      "set constraints horses_user_id_fkey, ride_notes_user_id_fkey, judge_sheets_user_id_fkey deferred",
    );
    const invites = await sql<{
      id: string;
      workspace_user_id: string;
    }>`select id, workspace_user_id from rider_invitations where lower(email) = ${identity.email!} and claimed_by_user_id is null for update`;
    const invite = invites[0];
    if (!invite) {
      await sql.query("commit");
      return null;
    }
    const proof = await sql<{
      id: string;
    }>`select u.id from "user" u join account a on a."userId" = u.id where u.id = ${identity.id} and lower(u.email) = ${identity.email!} and u."emailVerified" = true and a."providerId" in ('google', 'grok-google')`;
    const placeholder = await sql<{
      id: string;
    }>`select id from "user" where id = ${invite.workspace_user_id} and "emailVerified" = false and id like 'invite-%' and lower(email) = ${`${invite.workspace_user_id}@prepared.invalid`}`;
    const prepared = await sql<{
      user_id: string;
    }>`select user_id from beta_applications where user_id = ${invite.workspace_user_id} and region = 'Admin prepared' and heard_from = 'Admin' and status = 'approved'`;
    if (!proof.length || !placeholder.length || !prepared.length)
      throw new Error("A verified matching Google email is required for this prepared workspace");
    for (const table of ["plans", "results", "ride_notes", "judge_sheets", "horses"]) {
      await sql.query(`update ${table} set user_id = $1 where user_id = $2`, [
        identity.id,
        invite.workspace_user_id,
      ]);
    }
    await sql`insert into beta_applications (user_id, email, full_name, phone, region, rider_grade, competition_level, horse_list, horses, esnz_member, coach, goals, heard_from, consent, consent_at, status, admin_notes, decided_at, decided_by, created_at, updated_at)
      select ${identity.id}, email, full_name, phone, region, rider_grade, competition_level, horse_list, horses, esnz_member, coach, goals, heard_from, consent, consent_at, status, admin_notes, decided_at, decided_by, created_at, now() from beta_applications where user_id = ${invite.workspace_user_id}
      on conflict (user_id) do update set full_name = excluded.full_name, horses = excluded.horses, horse_list = excluded.horse_list, goals = excluded.goals, heard_from = excluded.heard_from, status = 'approved', decided_at = excluded.decided_at, decided_by = excluded.decided_by, updated_at = now()`;
    await sql`insert into riders (user_id, display_name, setup_completed_at, last_active_at) select ${identity.id}, display_name, setup_completed_at, now() from riders where user_id = ${invite.workspace_user_id}
      on conflict (user_id) do update set last_active_at = now(), updated_at = now(), display_name = case when riders.display_name = '' then excluded.display_name else riders.display_name end`;
    await sql`update rider_invitations set workspace_user_id = ${identity.id} where id = ${invite.id}`;
    await sql`delete from riders where user_id = ${invite.workspace_user_id}`;
    await sql`delete from "user" where id = ${invite.workspace_user_id} and id like 'invite-%'`;
    const claimed = await sql<{
      id: string;
    }>`update rider_invitations set claimed_by_user_id = ${identity.id}, claimed_at = now() where id = ${invite.id} and workspace_user_id = ${identity.id} and claimed_by_user_id is null returning id`;
    if (!claimed.length) throw new Error("This workspace has already been claimed");
    await sql`update riders set last_active_at = now(), updated_at = now() where user_id = ${identity.id}`;
    await sql.query("commit");
    return identity.id;
  } catch (error) {
    await sql.query("rollback");
    throw error;
  }
}

/** Prepared claims require Google. Existing approved riders keep whichever
 * supported sign-in provider they already use. */
export function assertWorkspaceAccess(
  _identity: VerifiedIdentity,
  applicationsApproved: boolean,
  isAdmin: boolean,
): boolean {
  return isAdmin || applicationsApproved;
}
