/**
 * Coach Portal authorisation. A coach reads a pupil only through an active link,
 * and only the scopes the rider turned on. Homework is the one write: an active
 * link, on that pupil's own horse, never another rider's data.
 */
import type { Sql } from "./db.ts";
import {
  emptyScopes,
  parseScopes,
  type CoachScopes,
  type GuardianInput,
} from "./coach-portal-types.ts";

export type ActiveLink = {
  id: string;
  riderUserId: string;
  coachUserId: string;
  scopes: CoachScopes;
};

type LinkRow = {
  id: string;
  rider_user_id: string;
  coach_user_id: string | null;
  status: string;
  scopes: unknown;
};

export async function isApprovedCoach(sql: Sql, userId: string): Promise<boolean> {
  const rows = await sql<{ status: string }>`select status from coaches where user_id = ${userId}`;
  return rows[0]?.status === "approved";
}

export async function activeLink(
  sql: Sql,
  coachUserId: string,
  riderUserId: string,
): Promise<ActiveLink | null> {
  if (!(await isApprovedCoach(sql, coachUserId))) return null;
  const rows = await sql<LinkRow>`
    select id, rider_user_id, coach_user_id, status, scopes from coach_links
    where coach_user_id = ${coachUserId} and rider_user_id = ${riderUserId} and status = 'active'`;
  const row = rows[0];
  if (!row?.coach_user_id) return null;
  return {
    id: row.id,
    riderUserId: row.rider_user_id,
    coachUserId: row.coach_user_id,
    scopes: parseScopes(row.scopes),
  };
}

export async function activeLinkById(sql: Sql, coachUserId: string, linkId: string): Promise<ActiveLink | null> {
  if (!linkId || !(await isApprovedCoach(sql, coachUserId))) return null;
  const rows = await sql<LinkRow>`
    select id, rider_user_id, coach_user_id, status, scopes from coach_links
    where id = ${linkId} and coach_user_id = ${coachUserId} and status = 'active'`;
  const row = rows[0];
  if (!row?.coach_user_id) return null;
  return {
    id: row.id,
    riderUserId: row.rider_user_id,
    coachUserId: row.coach_user_id,
    scopes: parseScopes(row.scopes),
  };
}

export function scopeAllows(scopes: CoachScopes, scope: keyof CoachScopes): boolean {
  return scopes[scope] === true;
}

/** Playback of one ready video. Music and floor plans stay on the rider's account. */
export async function coachMayPlayVideo(
  sql: Sql,
  coachUserId: string,
  media: { user_id: string; horse_id: string | null; kind: string },
): Promise<boolean> {
  if (media.kind !== "video" || !media.horse_id) return false;
  const link = await activeLink(sql, coachUserId, media.user_id);
  if (!link || !scopeAllows(link.scopes, "videos")) return false;
  const horses = await sql<{ id: string }>`
    select id from horses where id = ${media.horse_id} and user_id = ${media.user_id} and not archived`;
  return !!horses[0];
}

export function cleanEmail(value: unknown): string {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    throw new Error("Enter a full email address");
  }
  return email;
}

export function cleanGuardian(input: GuardianInput): {
  under18: boolean;
  name: string;
  note: string;
  consented: boolean;
} {
  const under18 = input.under18 === true;
  const name = typeof input.guardianName === "string" ? input.guardianName.trim().slice(0, 120) : "";
  const note = typeof input.guardianNote === "string" ? input.guardianNote.trim().slice(0, 500) : "";
  const consented = input.guardianAgrees === true && name.length > 0;
  if (under18 && !consented) {
    throw new Error("Add the parent or guardian's name and confirm they agree");
  }
  return { under18, name: under18 ? name : "", note: under18 ? note : "", consented: under18 && consented };
}

export function scopesFrom(input: unknown): CoachScopes {
  return parseScopes(input ?? emptyScopes());
}
