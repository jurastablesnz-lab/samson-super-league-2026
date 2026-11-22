/**
 * Coach Portal data access. Every pupil read goes through an active link and
 * drops anything the rider did not share. The only write is the next focus
 * and homework, stored as a coach visit on the pupil's own horse.
 */
import type { Sql } from "./db.ts";
import { generatePlan } from "./plan-builder.ts";
import { iso, nzDay } from "./season.ts";
import { cleanCoachVisit, type CoachVisitDraft } from "./rider-workspace.ts";
import {
  activeLinkById,
  cleanEmail,
  cleanGuardian,
  isApprovedCoach,
  scopesFrom,
  type ActiveLink,
} from "./coach-access.server.ts";
import {
  COACH_SCOPE_IDS,
  parseScopes,
  type CoachApplication,
  type CoachHome,
  type CoachLinkSummary,
  type CoachOffering,
  type CoachOfferingKind,
  type CoachProfile,
  type CoachScopes,
  type GuardianInput,
  type PupilFocus,
  type PupilHorseView,
  type PupilSummary,
  type PupilView,
  type RiderCoachHome,
} from "./coach-portal-types.ts";

export type CoachNote = { to: string; subject: string; text: string; html: string };
export type CoachMailer = (note: CoachNote) => Promise<void>;

const OFFERING_KINDS = new Set<CoachOfferingKind>(["weekly_check_in", "ride_reviews", "lessons", "other"]);

const day = (value: string | Date | null | undefined) => {
  if (value == null) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const date = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${month}-${date}`;
  }
  const match = String(value).match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
};

const clip = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return asRecord(JSON.parse(value));
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function today() {
  return iso(nzDay(new Date()));
}

const esc = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function portalUrl() {
  const { env } = await import("./env.server.ts");
  const base = env("BETTER_AUTH_URL")?.replace(/\/+$/, "") ?? "";
  return base ? `${base}/coach` : "/coach";
}

async function deliver(mail: CoachMailer | undefined, note: CoachNote) {
  try {
    if (mail) {
      await mail(note);
      return;
    }
    const { sendEmail } = await import("./email.server.ts");
    await sendEmail(note);
  } catch (err) {
    console.error("[coach-portal] email failed:", err instanceof Error ? err.message : err);
  }
}

async function transaction<T>(sql: Sql, run: () => Promise<T>): Promise<T> {
  await sql.query("begin");
  try {
    const value = await run();
    await sql.query("commit");
    return value;
  } catch (error) {
    await sql.query("rollback");
    throw error;
  }
}

async function userById(sql: Sql, userId: string) {
  const rows = await sql<{ id: string; email: string | null; name: string | null }>`
    select id, email, name from "user" where id = ${userId}`;
  return rows[0] ?? null;
}

async function userByEmail(sql: Sql, email: string) {
  const rows = await sql<{ id: string; email: string; name: string | null }>`
    select id, email, name from "user" where lower(email) = ${email}`;
  return rows[0] ?? null;
}

async function personName(sql: Sql, userId: string, fallback: string) {
  const rows = await sql<{ display_name: string | null; full_name: string | null; coach_name: string | null; name: string | null }>`
    select r.display_name, b.full_name, c.display_name as coach_name, u.name
    from "user" u
    left join riders r on r.user_id = u.id
    left join beta_applications b on b.user_id = u.id
    left join coaches c on c.user_id = u.id
    where u.id = ${userId}`;
  const row = rows[0];
  return (
    row?.display_name?.trim() ||
    row?.full_name?.trim() ||
    row?.coach_name?.trim() ||
    row?.name?.trim() ||
    fallback
  );
}

async function claimCoachEmail(sql: Sql, userId: string, email: string | null) {
  if (!email) return;
  await sql`update coach_links set coach_user_id = ${userId}, updated_at = now()
    where coach_user_id is null and coach_email = ${email.toLowerCase()} and status in ('pending', 'active')`;
}

async function assertCanAddPupil(sql: Sql, coachUserId: string) {
  const rows = await sql<{ pupil_cap: number; accepting_pupils: boolean; status: string }>`
    select pupil_cap, accepting_pupils, status from coaches where user_id = ${coachUserId} for update`;
  const coach = rows[0];
  if (!coach || coach.status !== "approved") throw new Error("That coach isn't on the Coach Portal yet");
  if (!coach.accepting_pupils) throw new Error("This coach isn't taking new pupils right now");
  const counts = await sql<{ n: number }>`
    select count(*)::int as n from coach_links where coach_user_id = ${coachUserId} and status = 'active'`;
  if (Number(counts[0]?.n ?? 0) >= Number(coach.pupil_cap)) {
    throw new Error("This coach has reached their pupil cap");
  }
}

function requireShare(scopes: CoachScopes) {
  if (!COACH_SCOPE_IDS.some((id) => scopes[id])) throw new Error("Choose at least one thing to share");
}

async function openPair(sql: Sql, riderUserId: string, coachEmail: string) {
  const rows = await sql<{ id: string; status: string }>`
    select id, status from coach_links
    where rider_user_id = ${riderUserId} and coach_email = ${coachEmail} and status in ('pending', 'active')`;
  return rows[0] ?? null;
}

async function rememberGuardian(sql: Sql, riderUserId: string, input: GuardianInput) {
  const guardian = cleanGuardian(input);
  await sql`insert into riders (user_id, display_name, under_18, guardian_note)
    values (${riderUserId}, '', ${guardian.under18}, ${guardian.note})
    on conflict (user_id) do update set
      under_18 = excluded.under_18,
      guardian_note = case when excluded.under_18 and excluded.guardian_note <> '' then excluded.guardian_note else riders.guardian_note end,
      updated_at = now()`;
  return guardian;
}

type LinkDb = {
  id: string;
  rider_user_id: string;
  coach_user_id: string | null;
  coach_email: string;
  rider_email: string;
  initiated_by: "rider" | "coach";
  status: CoachLinkSummary["status"];
  scopes: unknown;
  rider_under_18: boolean;
  guardian_consent_required: boolean;
  guardian_name: string;
  guardian_note: string;
  guardian_consented_at: string | Date | null;
};

async function toSummary(sql: Sql, row: LinkDb): Promise<CoachLinkSummary> {
  const coachName = row.coach_user_id
    ? await personName(sql, row.coach_user_id, row.coach_email)
    : row.coach_email;
  const riderName = await personName(sql, row.rider_user_id, row.rider_email || "Pupil");
  return {
    id: row.id,
    status: row.status,
    initiatedBy: row.initiated_by,
    coachEmail: row.coach_email,
    coachName,
    riderEmail: row.rider_email,
    riderName,
    scopes: parseScopes(row.scopes),
    under18: row.rider_under_18,
    guardianConsentRequired: row.guardian_consent_required,
    guardianName: row.guardian_name,
    guardianNote: row.guardian_note,
    guardianConsented: !!row.guardian_consented_at,
  };
}

function letter(to: string, subject: string, paragraphs: string[], href: string, button: string): CoachNote {
  const text = [...paragraphs, "", `${button}: ${href}`, "", "XSalute Coach Portal"].join("\n");
  const html = `${paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}<p><a href="${esc(href)}" style="display:inline-block;background:#2fd3a7;color:#0b1020;padding:10px 18px;border-radius:8px;font-weight:700;text-decoration:none">${esc(button)}</a></p><p style="color:#666;font-size:13px">XSalute Coach Portal</p>`;
  return { to, subject, text, html };
}

export async function inviteCoach(
  sql: Sql,
  riderUserId: string,
  input: GuardianInput & { email: string; scopes: unknown },
  mail?: CoachMailer,
) {
  const coachEmail = cleanEmail(input.email);
  const rider = await userById(sql, riderUserId);
  if (!rider) throw new Error("Your account was not found");
  if (rider.email?.toLowerCase() === coachEmail) throw new Error("Use your coach's email, not your own");
  const scopes = scopesFrom(input.scopes);
  requireShare(scopes);
  const linkId = await transaction(sql, async () => {
    const guardian = await rememberGuardian(sql, riderUserId, input);
    const existing = await openPair(sql, riderUserId, coachEmail);
    if (existing?.status === "active") throw new Error("That coach is already connected");
    if (existing) throw new Error("There's already an invitation waiting for that email");
    const coach = await userByEmail(sql, coachEmail);
    if (coach && (await isApprovedCoach(sql, coach.id))) await assertCanAddPupil(sql, coach.id);
    const id = crypto.randomUUID();
    await sql`insert into coach_links (
      id, rider_user_id, coach_user_id, coach_email, rider_email, initiated_by, status, scopes,
      rider_under_18, guardian_consent_required, guardian_name, guardian_note, guardian_consented_at
    ) values (
      ${id}, ${riderUserId}, ${coach?.id ?? null}, ${coachEmail}, ${rider.email ?? ""}, 'rider', 'pending',
      ${JSON.stringify(scopes)}::jsonb, ${guardian.under18}, ${guardian.under18}, ${guardian.name}, ${guardian.note},
      ${guardian.consented ? new Date() : null}
    )`;
    return id;
  });
  const riderName = await personName(sql, riderUserId, rider.email ?? "A rider");
  const href = await portalUrl();
  await deliver(
    mail,
    letter(
      coachEmail,
      `${riderName} invited you to the XSalute Coach Portal`,
      [
        "Kia ora,",
        `${riderName} wants to connect you on the XSalute Coach Portal. You'll see only what they choose to share, and they can change or remove that at any time.`,
        "Sign in (or apply for a Coach Portal place) and accept the invitation. Nothing is shared until you accept.",
      ],
      href,
      "Open Coach Portal",
    ),
  );
  return { id: linkId };
}

export async function requestPupil(sql: Sql, coachUserId: string, input: { email: string }, mail?: CoachMailer) {
  if (!(await isApprovedCoach(sql, coachUserId))) {
    throw new Error("Your Coach Portal place isn't approved yet");
  }
  const riderEmail = cleanEmail(input.email);
  const coach = await userById(sql, coachUserId);
  if (!coach?.email) throw new Error("Your account has no email address");
  const coachEmail = coach.email.toLowerCase();
  if (coachEmail === riderEmail) throw new Error("Use your pupil's email, not your own");
  const rider = await userByEmail(sql, riderEmail);
  if (!rider) {
    throw new Error("No XSalute rider uses that email yet. Ask them to invite you from their Coach tab.");
  }
  const linkId = await transaction(sql, async () => {
    await assertCanAddPupil(sql, coachUserId);
    const existing = await openPair(sql, rider.id, coachEmail);
    if (existing?.status === "active") throw new Error("You're already connected to this rider");
    if (existing) throw new Error("There's already a request waiting with this rider");
    const flags = await sql<{ under_18: boolean }>`select under_18 from riders where user_id = ${rider.id}`;
    const under18 = flags[0]?.under_18 === true;
    const id = crypto.randomUUID();
    await sql`insert into coach_links (
      id, rider_user_id, coach_user_id, coach_email, rider_email, initiated_by, status, scopes,
      rider_under_18, guardian_consent_required
    ) values (
      ${id}, ${rider.id}, ${coachUserId}, ${coachEmail}, ${riderEmail}, 'coach', 'pending',
      '{}'::jsonb, ${under18}, ${under18}
    )`;
    return id;
  });
  const coachName = await personName(sql, coachUserId, coach.email ?? "A coach");
  const href = await portalUrl();
  await deliver(
    mail,
    letter(
      riderEmail,
      `${coachName} asked to connect on XSalute`,
      [
        "Kia ora,",
        `${coachName} asked to connect as your coach on the XSalute Coach Portal. Nothing is shared until you accept, and you choose what they can see.`,
        "Open your Coach tab to accept or decline. You can remove a coach at any time.",
      ],
      href.replace(/\/coach$/, "/"),
      "Open XSalute",
    ),
  );
  return { id: linkId };
}

export async function acceptLink(
  sql: Sql,
  userId: string,
  input: GuardianInput & { linkId: string; scopes?: unknown },
  mail?: CoachMailer,
) {
  const linkId = clip(input.linkId, 80);
  const accepted = await transaction(sql, async () => {
    const rows = await sql<LinkDb>`select * from coach_links where id = ${linkId} for update`;
    const link = rows[0];
    if (!link || link.status !== "pending") throw new Error("That invitation is no longer waiting");
    if (link.initiated_by === "rider") {
      if (link.coach_user_id && link.coach_user_id !== userId) throw new Error("This invitation isn't for you");
      const user = await userById(sql, userId);
      if (!user?.email || user.email.toLowerCase() !== link.coach_email) {
        throw new Error("This invitation isn't for you");
      }
      if (!(await isApprovedCoach(sql, userId))) throw new Error("Your Coach Portal place isn't approved yet");
      await assertCanAddPupil(sql, userId);
      if (link.guardian_consent_required && !link.guardian_consented_at) {
        throw new Error("A parent or guardian still needs to agree before this connection can start");
      }
      await sql`update coach_links set coach_user_id = ${userId}, status = 'active', responded_at = now(), updated_at = now()
        where id = ${link.id}`;
      return { tell: link.rider_email, subjectName: await personName(sql, userId, user.email), other: "coach" as const };
    }
    if (link.rider_user_id !== userId) throw new Error("This request isn't for you");
    const stored = await sql<{ under_18: boolean }>`select under_18 from riders where user_id = ${userId}`;
    const guardian = await rememberGuardian(sql, userId, { ...input, under18: stored[0]?.under_18 === true || input.under18 === true });
    const scopes = scopesFrom(input.scopes);
    requireShare(scopes);
    if (!link.coach_user_id) throw new Error("That coach doesn't have a Coach Portal place yet");
    await assertCanAddPupil(sql, link.coach_user_id);
    await sql`update coach_links set status = 'active', scopes = ${JSON.stringify(scopes)}::jsonb,
      rider_under_18 = ${guardian.under18}, guardian_consent_required = ${guardian.under18},
      guardian_name = ${guardian.name}, guardian_note = ${guardian.note},
      guardian_consented_at = ${guardian.consented ? new Date() : null},
      responded_at = now(), updated_at = now()
      where id = ${link.id}`;
    const rider = await userById(sql, userId);
    return {
      tell: link.coach_email,
      subjectName: await personName(sql, userId, rider?.email ?? "Your pupil"),
      other: "rider" as const,
    };
  });
  const href = await portalUrl();
  await deliver(
    mail,
    letter(
      accepted.tell,
      accepted.other === "rider"
        ? `${accepted.subjectName} accepted you on the Coach Portal`
        : `${accepted.subjectName} accepted your Coach Portal invitation`,
      [
        "Kia ora,",
        accepted.other === "rider"
          ? `${accepted.subjectName} accepted the connection. You can see only what they chose to share.`
          : `${accepted.subjectName} accepted. They can now see the parts of your training you shared.`,
        "Either of you can end the connection at any time.",
      ],
      accepted.other === "rider" ? href : href.replace(/\/coach$/, "/"),
      accepted.other === "rider" ? "Open Coach Portal" : "Open XSalute",
    ),
  );
  return { ok: true as const };
}

export async function updateLinkScopes(
  sql: Sql,
  riderUserId: string,
  input: { linkId: string; scopes: unknown },
) {
  const linkId = clip(input.linkId, 80);
  const scopes = scopesFrom(input.scopes);
  const rows = await sql<{ id: string }>`
    update coach_links set scopes = ${JSON.stringify(scopes)}::jsonb, updated_at = now()
    where id = ${linkId} and rider_user_id = ${riderUserId} and status in ('pending', 'active')
    returning id`;
  if (!rows.length) throw new Error("That connection isn't yours to change");
  return { ok: true as const };
}

export async function endLink(sql: Sql, userId: string, linkId: string) {
  const id = clip(linkId, 80);
  const rows = await sql<LinkDb>`select * from coach_links where id = ${id}`;
  const link = rows[0];
  if (!link) throw new Error("That connection was not found");
  if (link.rider_user_id !== userId && link.coach_user_id !== userId) {
    throw new Error("That connection isn't yours");
  }
  if (link.status === "active") {
    await sql`update coach_links set status = 'revoked', revoked_at = now(), updated_at = now() where id = ${id}`;
  } else if (link.status === "pending") {
    await sql`update coach_links set status = 'declined', responded_at = now(), updated_at = now() where id = ${id}`;
  }
  return { ok: true as const };
}

function asArray(value: unknown): unknown[] {
  if (typeof value === "string") {
    try {
      return asArray(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? value : [];
}

function cleanOfferings(value: unknown): CoachOffering[] {
  return asArray(value)
    .slice(0, 8)
    .map((item) => {
      const row = (item ?? {}) as Partial<CoachOffering>;
      const kind = OFFERING_KINDS.has(row.kind as CoachOfferingKind) ? (row.kind as CoachOfferingKind) : "other";
      const per = Number(row.perMonth);
      return {
        id: clip(row.id, 40) || crypto.randomUUID(),
        kind,
        label: clip(row.label, 80),
        detail: clip(row.detail, 200),
        perMonth: Number.isFinite(per) && per > 0 && per <= 60 ? Math.round(per) : null,
      };
    })
    .filter((item) => item.label);
}

export async function applyForCoach(
  sql: Sql,
  userId: string,
  input: { displayName: string; phone?: string; region: string; bio: string; consent: boolean },
) {
  const user = await userById(sql, userId);
  if (!user?.email) throw new Error("Your account has no email address");
  const displayName = clip(input.displayName, 120);
  const region = clip(input.region, 80);
  const bio = clip(input.bio, 1000);
  if (!displayName) throw new Error("Enter the name pupils should see");
  if (!region) throw new Error("Choose a region");
  if (bio.length < 10) throw new Error("Tell us a little about the coaching you offer");
  if (input.consent !== true) throw new Error("Please accept the privacy note");
  const existing = await sql<{ status: string }>`select status from coaches where user_id = ${userId}`;
  if (existing[0]?.status === "approved") throw new Error("You're already approved on the Coach Portal");
  await sql`insert into coaches (user_id, email, display_name, phone, region, bio, status)
    values (${userId}, ${user.email.toLowerCase()}, ${displayName}, ${clip(input.phone, 40) || null}, ${region}, ${bio}, 'pending')
    on conflict (user_id) do update set
      email = excluded.email, display_name = excluded.display_name, phone = excluded.phone,
      region = excluded.region, bio = excluded.bio, status = 'pending', decided_at = null, decided_by = null,
      updated_at = now()`;
  return { ok: true as const };
}

export async function saveCoachPackage(
  sql: Sql,
  userId: string,
  input: { displayName?: string; bio?: string; offerings: unknown; pupilCap: number; acceptingPupils: boolean },
) {
  const cap = Math.round(Number(input.pupilCap));
  if (!Number.isFinite(cap) || cap < 0 || cap > 200) throw new Error("Pupil cap must be 0–200");
  const offerings = cleanOfferings(input.offerings);
  const rows = await sql<{ user_id: string }>`update coaches set
      display_name = case when ${clip(input.displayName, 120)} = '' then display_name else ${clip(input.displayName, 120)} end,
      bio = case when ${clip(input.bio, 1000)} = '' then bio else ${clip(input.bio, 1000)} end,
      offerings = ${JSON.stringify(offerings)}::jsonb,
      pupil_cap = ${cap},
      accepting_pupils = ${input.acceptingPupils === true},
      updated_at = now()
    where user_id = ${userId} returning user_id`;
  if (!rows.length) throw new Error("Apply for the Coach Portal first");
  return { ok: true as const };
}

async function profileFor(sql: Sql, userId: string): Promise<CoachProfile | null> {
  const rows = await sql<{
    user_id: string;
    email: string;
    display_name: string;
    phone: string | null;
    region: string;
    bio: string;
    offerings: unknown;
    pupil_cap: number;
    accepting_pupils: boolean;
    subscription_status: CoachProfile["subscriptionStatus"];
    status: CoachProfile["status"];
  }>`select user_id, email, display_name, phone, region, bio, offerings, pupil_cap, accepting_pupils,
      subscription_status, status from coaches where user_id = ${userId}`;
  const row = rows[0];
  if (!row) return null;
  const counts = await sql<{ n: number }>`
    select count(*)::int as n from coach_links where coach_user_id = ${userId} and status = 'active'`;
  return {
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    phone: row.phone ?? "",
    region: row.region,
    bio: row.bio,
    offerings: cleanOfferings(row.offerings),
    pupilCap: Number(row.pupil_cap),
    acceptingPupils: row.accepting_pupils,
    subscriptionStatus: row.subscription_status,
    status: row.status,
    activePupils: Number(counts[0]?.n ?? 0),
  };
}

type VisitDb = {
  id: string;
  visit_date: string | Date | null;
  end_date: string | Date | null;
  title: string;
  focus: string;
  film: string;
  homework: string;
  leave_it: string;
  author_user_id: string | null;
  author_name: string;
  author_role: string;
};

function toFocus(row: VisitDb, coachUserId: string): PupilFocus {
  return {
    id: row.id,
    date: day(row.visit_date),
    endDate: day(row.end_date) || day(row.visit_date),
    title: row.title,
    focus: row.focus,
    homework: row.homework,
    film: row.film,
    leaveIt: row.leave_it,
    authorName: row.author_name,
    editable: row.author_role === "coach" && row.author_user_id === coachUserId,
  };
}

function visibleVisits(rows: VisitDb[], scopes: CoachScopes, coachUserId: string) {
  if (scopes.visits) return rows;
  return rows.filter((row) => row.author_role === "coach" && row.author_user_id === coachUserId);
}

function pickFocus(visits: PupilFocus[], on: string): PupilFocus | null {
  const ordered = [...visits].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return (
    ordered.find((visit) => (visit.endDate || visit.date) >= on && (visit.focus || visit.homework)) ??
    [...ordered].reverse().find((visit) => visit.focus || visit.homework) ??
    null
  );
}

function phaseOf(plan: unknown, progress: unknown, on: string): PupilHorseView["plan"] {
  const body = asRecord(plan);
  const phases = Array.isArray(body.phases) ? body.phases : [];
  const match = phases
    .map((phase) => asRecord(phase))
    .find((phase) => typeof phase.start === "string" && typeof phase.end === "string" && phase.start <= on && on <= phase.end);
  const phase = match ?? (phases[0] ? asRecord(phases[0]) : null);
  if (!phase || typeof phase.name !== "string") return null;
  const done = asRecord(asRecord(progress).done);
  const ticked = Object.values(done).filter((value) => value === true).length;
  return {
    phase: phase.name,
    intent: typeof phase.intent === "string" ? phase.intent : "",
    start: typeof phase.start === "string" ? phase.start : "",
    end: typeof phase.end === "string" ? phase.end : "",
    ticked,
  };
}

async function horseView(
  sql: Sql,
  link: ActiveLink,
  horse: { id: string; name: string; level: string },
  on: string,
): Promise<PupilHorseView> {
  const scopes = link.scopes;
  const visitRows = await sql<VisitDb>`select id, visit_date, end_date, title, focus, film, homework, leave_it,
      author_user_id, author_name, author_role
    from coach_visits where user_id = ${link.riderUserId} and horse_id = ${horse.id}
    order by visit_date desc, id desc`;
  const visits = visibleVisits(visitRows, scopes, link.coachUserId).map((row) => toFocus(row, link.coachUserId));
  const focus = pickFocus(visits, on);

  let workOns: PupilHorseView["workOns"] = null;
  if (scopes.judges) {
    workOns = { date: "", test: "", showName: "", items: [] };
    const sheets = await sql<{ ride_date: string | Date | null; test: string; show_name: string; sheet: unknown }>`
      select ride_date, test, show_name, sheet from judge_sheets
      where user_id = ${link.riderUserId} and horse_id = ${horse.id} and kind = 'sheet'
      order by ride_date desc nulls last, id desc limit 8`;
    for (const sheet of sheets) {
      const body = asRecord(sheet.sheet);
      const items = Array.isArray(body.workOns) ? body.workOns : [];
      const cleaned = items
        .slice(0, 3)
        .map((item) => asRecord(item))
        .filter((item) => typeof item.title === "string" && item.title)
        .map((item) => ({
          title: clip(item.title, 160),
          why: clip(item.why, 300),
          how: clip(item.how, 400),
        }));
      if (cleaned.length) {
        workOns = { date: day(sheet.ride_date), test: sheet.test, showName: sheet.show_name, items: cleaned };
        break;
      }
    }
  }

  let notes: PupilHorseView["notes"] = null;
  if (scopes.notes) {
    const rows = await sql<{ note_date: string | Date | null; body: string }>`
      select note_date, body from ride_notes where user_id = ${link.riderUserId} and horse_id = ${horse.id}
      order by note_date desc nulls last, id desc limit 5`;
    notes = rows.map((row) => ({ date: day(row.note_date), text: row.body }));
  }

  let plan: PupilHorseView["plan"] = null;
  if (scopes.plan) {
    const rows = await sql<{ plan: unknown; progress: unknown }>`
      select plan, progress from plans where horse_id = ${horse.id} and user_id = ${link.riderUserId}`;
    const empty = { phase: "No plan yet", intent: "", start: "", end: "", ticked: 0 };
    plan = rows[0] ? (phaseOf(rows[0].plan, rows[0].progress, on) ?? empty) : empty;
  }

  let scores: PupilHorseView["scores"] = null;
  if (scopes.results) {
    const rows = await sql<{ ride_date: string | Date | null; test: string; show_name: string; percent: number | null; place: string }>`
      select ride_date, test, show_name, percent, place from results
      where user_id = ${link.riderUserId} and horse_id = ${horse.id} and review_status = 'kept'
      order by ride_date desc nulls last, id desc limit 5`;
    scores = rows.map((row) => ({
      date: day(row.ride_date),
      test: row.test,
      showName: row.show_name,
      percent: row.percent == null ? null : Number(row.percent),
      place: row.place,
    }));
  }

  let videos: PupilHorseView["videos"] = null;
  if (scopes.videos) {
    const rows = await sql<{ client_id: string; ride_date: string | Date | null; test: string; show_name: string; note: string }>`
      select client_id, ride_date, test, show_name, note from judge_sheets
      where user_id = ${link.riderUserId} and horse_id = ${horse.id} and kind = 'video'
      order by ride_date desc nulls last, id desc limit 12`;
    const ready = new Set(
      (
        await sql<{ id: string }>`select id from media_objects
          where user_id = ${link.riderUserId} and horse_id = ${horse.id} and kind = 'video' and status = 'ready'`
      ).map((row) => row.id),
    );
    videos = rows.map((row) => ({
      id: row.client_id,
      date: day(row.ride_date),
      test: row.test,
      showName: row.show_name,
      note: row.note,
      ready: ready.has(row.client_id),
    }));
  }

  return {
    id: horse.id,
    name: horse.name,
    level: horse.level,
    focus,
    visits: scopes.visits ? visits.slice(0, 8) : null,
    workOns,
    notes,
    plan,
    scores,
    videos,
  };
}

async function horsesFor(sql: Sql, riderUserId: string) {
  return sql<{ id: string; name: string; level: string }>`
    select id, name, level from horses where user_id = ${riderUserId} and not archived
    order by sort_order, created_at`;
}

export async function loadPupil(sql: Sql, coachUserId: string, linkId: string): Promise<PupilView> {
  const link = await activeLinkById(sql, coachUserId, clip(linkId, 80));
  if (!link) throw new Error("You aren't linked to this pupil");
  const consent = await sql<{ guardian_consented_at: string | Date | null; rider_under_18: boolean }>`
    select guardian_consented_at, rider_under_18 from coach_links where id = ${link.id}`;
  const horses = await horsesFor(sql, link.riderUserId);
  const on = today();
  return {
    linkId: link.id,
    pupilName: await personName(sql, link.riderUserId, "Pupil"),
    pupilEmail: (await userById(sql, link.riderUserId))?.email ?? "",
    guardianConsent: consent[0]?.rider_under_18 === true && !!consent[0]?.guardian_consented_at,
    horses: await Promise.all(horses.map((horse) => horseView(sql, link, horse, on))),
  };
}

async function statusLine(sql: Sql, link: ActiveLink) {
  const horses = await horsesFor(sql, link.riderUserId);
  if (!horses.length) return "No horse on the plan yet";
  const on = today();
  for (const horse of horses) {
    const rows = await sql<VisitDb>`select id, visit_date, end_date, title, focus, film, homework, leave_it,
        author_user_id, author_name, author_role
      from coach_visits where user_id = ${link.riderUserId} and horse_id = ${horse.id}`;
    const focus = pickFocus(visibleVisits(rows, link.scopes, link.coachUserId).map((row) => toFocus(row, link.coachUserId)), on);
    if (focus?.focus) return `${horse.name}: ${focus.focus}`;
    if (focus?.homework) return `${horse.name}: ${focus.homework}`;
  }
  if (!link.scopes.visits) return horses.length > 1 ? `${horses.length} horses · visits not shared` : `${horses[0].name} · visits not shared`;
  return `${horses[0].name} · no focus set yet`;
}

export async function loadCoachHome(sql: Sql, userId: string): Promise<CoachHome> {
  const user = await userById(sql, userId);
  if (user?.email) await claimCoachEmail(sql, userId, user.email);
  const profile = await profileFor(sql, userId);
  const pupils: PupilSummary[] = [];
  if (profile?.status === "approved") {
    const links = await sql<LinkDb>`select * from coach_links where coach_user_id = ${userId} and status = 'active'
      order by updated_at desc`;
    for (const row of links) {
      const link = await activeLinkById(sql, userId, row.id);
      if (!link) continue;
      const horses = await horsesFor(sql, link.riderUserId);
      pupils.push({
        linkId: link.id,
        name: await personName(sql, link.riderUserId, row.rider_email || "Pupil"),
        email: row.rider_email,
        horses,
        statusLine: await statusLine(sql, link),
      });
    }
  }
  const pending = await sql<LinkDb>`select * from coach_links where coach_user_id = ${userId} and status = 'pending'
    order by created_at desc`;
  const summaries = await Promise.all(pending.map((row) => toSummary(sql, row)));
  return {
    profile,
    pupils,
    incoming: summaries.filter((link) => link.initiatedBy === "rider"),
    outgoing: summaries.filter((link) => link.initiatedBy === "coach"),
  };
}

export async function loadRiderCoaches(sql: Sql, riderUserId: string): Promise<RiderCoachHome> {
  const rider = await sql<{ under_18: boolean; guardian_note: string }>`
    select under_18, guardian_note from riders where user_id = ${riderUserId}`;
  const rows = await sql<LinkDb>`select * from coach_links where rider_user_id = ${riderUserId}
    and status in ('pending', 'active') order by created_at desc`;
  return {
    under18: rider[0]?.under_18 === true,
    guardianNote: rider[0]?.guardian_note ?? "",
    links: await Promise.all(rows.map((row) => toSummary(sql, row))),
  };
}

export async function setPupilHomework(
  sql: Sql,
  coachUserId: string,
  input: CoachVisitDraft & { linkId: string; horseId: string },
  mail?: CoachMailer,
) {
  const link = await activeLinkById(sql, coachUserId, clip(input.linkId, 80));
  if (!link) throw new Error("You aren't linked to this pupil");
  const horseId = clip(input.horseId, 80);
  const horses = await sql<{ id: string; name: string }>`
    select id, name from horses where id = ${horseId} and user_id = ${link.riderUserId} and not archived`;
  if (!horses[0]) throw new Error("Horse not found");
  const cleaned = cleanCoachVisit(input);
  if (!cleaned.focus && !cleaned.homework) throw new Error("Add a focus or some homework");
  const coach = await userById(sql, coachUserId);
  const coachName = await personName(sql, coachUserId, coach?.email ?? "Coach");
  const title = cleaned.title || coachName;
  const visitId = clip(input.id, 120);
  if (visitId) {
    const updated = await sql<{ id: string }>`update coach_visits set
        visit_date = ${cleaned.date}, end_date = ${cleaned.endDate}, title = ${title}, focus = ${cleaned.focus},
        film = ${cleaned.film}, homework = ${cleaned.homework}, leave_it = ${cleaned.leaveIt},
        author_name = ${coachName}, updated_at = now()
      where id = ${visitId} and user_id = ${link.riderUserId} and horse_id = ${horseId}
        and author_user_id = ${coachUserId} and author_role = 'coach'
      returning id`;
    if (!updated.length) throw new Error("You can only change focus you set");
  } else {
    await sql`insert into coach_visits (
      id, user_id, horse_id, visit_date, end_date, title, focus, film, homework, leave_it,
      author_user_id, author_name, author_role
    ) values (
      ${crypto.randomUUID()}, ${link.riderUserId}, ${horseId}, ${cleaned.date}, ${cleaned.endDate}, ${title},
      ${cleaned.focus}, ${cleaned.film}, ${cleaned.homework}, ${cleaned.leaveIt},
      ${coachUserId}, ${coachName}, 'coach'
    )`;
  }
  const pupil = await userById(sql, link.riderUserId);
  if (pupil?.email) {
    const href = (await portalUrl()).replace(/\/coach$/, "/");
    const lines = [
      "Kia ora,",
      `${coachName} set the next focus for ${horses[0].name} on your XSalute Coach tab.`,
      cleaned.focus ? `Focus: ${cleaned.focus}` : "",
      cleaned.homework ? `Homework: ${cleaned.homework}` : "",
    ].filter(Boolean);
    await deliver(mail, letter(pupil.email, `New focus for ${horses[0].name}`, lines, href, "Open your Coach tab"));
  }
  return loadPupil(sql, coachUserId, link.id);
}

export async function listCoachApplications(sql: Sql): Promise<CoachApplication[]> {
  const rows = await sql<{
    user_id: string;
    email: string;
    display_name: string;
    phone: string | null;
    region: string;
    bio: string;
    status: CoachApplication["status"];
    admin_notes: string;
    created_at: string | Date;
  }>`select user_id, email, display_name, phone, region, bio, status, admin_notes, created_at
    from coaches order by created_at desc`;
  return rows.map((row) => ({
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    phone: row.phone ?? "",
    region: row.region,
    bio: row.bio,
    status: row.status,
    adminNotes: row.admin_notes,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  }));
}

export async function decideCoach(
  sql: Sql,
  adminEmail: string,
  input: { userId: string; status: "pending" | "approved" | "declined"; notes?: string },
) {
  if (!["pending", "approved", "declined"].includes(input.status)) throw new Error("Bad status");
  const notes = input.notes == null ? null : clip(input.notes, 2000);
  const rows = await sql<{ email: string; display_name: string }>`update coaches set
      status = ${input.status},
      admin_notes = coalesce(${notes}, admin_notes),
      decided_at = now(),
      decided_by = ${adminEmail},
      updated_at = now()
    where user_id = ${clip(input.userId, 120)}
    returning email, display_name`;
  if (!rows.length) throw new Error("Coach application not found");
  return rows[0];
}

export async function seedCoachDemo(sql: Sql, actorUserId: string, opts: { riderPreview: boolean }) {
  const existingUser = await userById(sql, actorUserId);
  if (!existingUser) {
    const email = `${actorUserId.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}@xsalute.local`;
    await sql`insert into "user" (id, name, email, "emailVerified")
      values (${actorUserId}, 'Dev User', ${email}, true)`;
  }
  const actor = (await userById(sql, actorUserId))!;
  await sql`insert into coaches (user_id, email, display_name, region, bio, offerings, pupil_cap, accepting_pupils, status, decided_at, decided_by)
    values (
      ${actorUserId}, ${actor.email!.toLowerCase()}, ${actor.name?.trim() || "Coach"}, 'Manawatū-Whanganui',
      'Sample coach profile for trying the Coach Portal.',
      ${JSON.stringify([
        { id: "check-in", kind: "weekly_check_in", label: "Weekly check-in", detail: "A short note on the week's focus", perMonth: null },
        { id: "reviews", kind: "ride_reviews", label: "Ride reviews", detail: "Clips you send in", perMonth: 4 },
      ])}::jsonb,
      12, true, 'approved', now(), 'seed'
    )
    on conflict (user_id) do update set status = 'approved', updated_at = now()`;

  const pupilId = "seed-pupil-coach-portal";
  const pupilEmail = "seed-pupil@xsalute.invalid";
  await sql`insert into "user" (id, name, email, "emailVerified")
    values (${pupilId}, 'Mia Chen', ${pupilEmail}, true)
    on conflict (id) do nothing`;
  await sql`insert into riders (user_id, display_name, setup_completed_at) values (${pupilId}, 'Mia Chen', now())
    on conflict (user_id) do update set display_name = 'Mia Chen'`;
  await sql`insert into beta_applications (
      user_id, email, full_name, region, rider_grade, competition_level, horses, goals, heard_from, consent, status, decided_at, decided_by
    ) values (
      ${pupilId}, ${pupilEmail}, 'Mia Chen', 'Sample', 'Non-graded', 'Level 2', 'Waimarie', 'Sample pupil', 'Seed', true, 'approved', now(), 'seed'
    ) on conflict (user_id) do nothing`;

  const horseRows = await sql<{ id: string }>`select id from horses where user_id = ${pupilId} and name = 'Waimarie' and not archived`;
  let horseId = horseRows[0]?.id ?? "";
  if (!horseId) {
    horseId = crypto.randomUUID();
    const plan = generatePlan(
      {
        horseName: "Waimarie",
        level: "Level 2",
        tests: ["2A", "2B"],
        shows: [{ id: "taupo", name: "Taupō", start: "2026-12-06", end: "2026-12-07", travel: false }],
        goals: [],
        startDate: "2026-11-16",
      },
      new Date("2026-11-16T00:00:00Z"),
    );
    await sql`insert into horses (id, user_id, name, level, sort_order) values (${horseId}, ${pupilId}, 'Waimarie', 'Level 2', 0)`;
    await sql`insert into plans (horse_id, user_id, config, plan, progress) values (
      ${horseId}, ${pupilId}, ${JSON.stringify(plan)}::jsonb, ${JSON.stringify(plan)}::jsonb,
      ${JSON.stringify({ done: { sample: true }, pack: {} })}::jsonb
    )`;
    await sql`insert into ride_notes (user_id, horse_id, client_id, note_date, body) values
      (${pupilId}, ${horseId}, 'seed-note-1', '2026-11-20', 'Right canter kept falling through the outside shoulder.')`;
    await sql`insert into results (user_id, horse_id, client_id, source, show_name, ride_date, test, level, percent, place, status, review_status)
      values (${pupilId}, ${horseId}, 'seed-score-1', 'app', 'Feilding', '2026-11-08', '2B', 'Level 2', 64.2, '4th', 'ok', 'kept')`;
    await sql`insert into judge_sheets (user_id, horse_id, client_id, kind, show_name, ride_date, test, note, sheet) values (
      ${pupilId}, ${horseId}, 'seed-sheet-1', 'sheet', 'Feilding', '2026-11-08', '2B', '',
      ${JSON.stringify({
        readable: true,
        workOns: [{ title: "Halt from walk", why: "The halt was early", how: "Walk to halt at X, both reins, square before you salute." }],
      })}::jsonb
    )`;
    await sql`insert into judge_sheets (user_id, horse_id, client_id, kind, show_name, ride_date, test, note, mime) values (
      ${pupilId}, ${horseId}, 'seed-video-waimarie', 'video', 'Feilding', '2026-11-08', '2B', 'Watch the halt.', 'video/mp4'
    )`;
    await sql`insert into media_objects (id, user_id, horse_id, kind, object_key, file_name, mime, byte_size, status)
      values ('seed-video-waimarie', ${pupilId}, ${horseId}, 'video', ${`users/${pupilId}/video/seed-video-waimarie`},
        'waimarie-2b.mp4', 'video/mp4', 1200, 'ready')`;
    await sql`insert into coach_visits (id, user_id, horse_id, visit_date, end_date, title, focus, homework, leave_it, author_role)
      values (${crypto.randomUUID()}, ${pupilId}, ${horseId}, '2026-11-18', '2026-11-18', 'Yard lesson',
        'Straight into the halt', 'One halt a day', 'No new bit', 'rider')`;
  }

  const linked = await sql<{ id: string }>`select id from coach_links
    where coach_user_id = ${actorUserId} and rider_user_id = ${pupilId} and status = 'active'`;
  let linkId = linked[0]?.id ?? "";
  if (!linkId) {
    linkId = crypto.randomUUID();
    const scopes = { plan: true, results: true, judges: true, notes: true, visits: true, videos: true };
    await sql`insert into coach_links (
      id, rider_user_id, coach_user_id, coach_email, rider_email, initiated_by, status, scopes, responded_at
    ) values (
      ${linkId}, ${pupilId}, ${actorUserId}, ${actor.email!.toLowerCase()}, ${pupilEmail}, 'rider', 'active',
      ${JSON.stringify(scopes)}::jsonb, now()
    )`;
  }

  if (opts.riderPreview) {
    const own = await sql<{ id: string }>`select id from horses where user_id = ${actorUserId} and not archived`;
    if (!own.length) {
      await sql`insert into "user" (id, name, email, "emailVerified")
        values ('seed-coach-alex', 'Alex Ng', 'seed-alex@xsalute.invalid', false)
        on conflict (id) do nothing`;
      const ownHorse = crypto.randomUUID();
      const plan = generatePlan(
        {
          horseName: "Tui",
          level: "Level 2",
          tests: ["2A", "2B"],
          shows: [],
          goals: [],
          startDate: "2026-11-16",
        },
        new Date("2026-11-16T00:00:00Z"),
      );
      const school = plan.weeks
        .flatMap((week) => week.sessions)
        .find((session) => session.kind !== "show" && session.day >= "2026-11-23");
      const visitDay = school?.day ?? "2026-11-24";
      await sql`insert into horses (id, user_id, name, level) values (${ownHorse}, ${actorUserId}, 'Tui', 'Level 2')`;
      await sql`insert into plans (horse_id, user_id, config, plan, progress)
        values (${ownHorse}, ${actorUserId}, ${JSON.stringify({ horseName: "Tui", level: "Level 2", tests: ["2A", "2B"], shows: [], goals: [] })}::jsonb,
          ${JSON.stringify(plan)}::jsonb, '{}'::jsonb)`;
      await sql`insert into riders (user_id, display_name, setup_completed_at)
        values (${actorUserId}, ${actor.name ?? "Dev User"}, now())
        on conflict (user_id) do update set setup_completed_at = coalesce(riders.setup_completed_at, now())`;
      await sql`insert into coach_visits (
        id, user_id, horse_id, visit_date, end_date, title, focus, homework, leave_it, author_user_id, author_name, author_role
      ) values (
        ${crypto.randomUUID()}, ${actorUserId}, ${ownHorse}, ${visitDay}, ${visitDay}, 'Alex Ng',
        'Half-halts before the halt', 'One halt from walk, both reins, then leave it.', 'No new exercise',
        'seed-coach-alex', 'Alex Ng', 'coach'
      )`;
    }
  }

  return { linkId, pupilName: "Mia Chen" };
}
