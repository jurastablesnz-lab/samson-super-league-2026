import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./auth/middleware";

export type BetaStatus = "pending" | "approved" | "declined" | "waitlist";

export const RIDER_GRADES = ["Bronze", "Silver", "Gold", "Non-graded"] as const;
export const REGIONS = [
  "Northland", "Auckland", "Waikato", "Bay of Plenty", "Gisborne", "Hawke's Bay",
  "Taranaki", "Manawatū-Whanganui", "Wellington", "Nelson / Tasman / Marlborough",
  "West Coast", "Canterbury", "Otago", "Southland", "Outside NZ",
] as const;
export const COMPETITION_LEVELS = [
  "Not competing yet", "Training / Preliminary", "Level 1", "Level 2", "Level 3",
  "Level 4", "Level 5", "Level 6", "Level 7 / FEI Small Tour", "Grand Prix",
] as const;
export const HEARD_FROM = [
  "Virtual Dressage NZ website", "Instagram / Facebook", "A friend or fellow rider",
  "My coach", "At a show", "Other",
] as const;

export const MAX_HORSES = 6;

export type HorseEntry = { name: string; level: string; notes: string };

export type ApplicationInput = {
  fullName: string;
  phone?: string;
  region: string;
  riderGrade: string;
  competitionLevel: string;
  /** Structured horses (1–6). */
  horseList: HorseEntry[];
  /** Legacy free-text summary (kept in sync for older rows / exports). */
  horses?: string;
  esnzMember: boolean;
  coach?: string;
  goals: string;
  heardFrom: string;
  consent: boolean;
};

export type Application = ApplicationInput & {
  userId: string;
  email: string;
  status: BetaStatus;
  adminNotes: string;
  createdAt: string;
  decidedAt: string | null;
};

export type BetaAccess = {
  email: string | null;
  name: string | null;
  isAdmin: boolean;
  hasAccess: boolean;
  status: BetaStatus | null;
  /** The user's own application (no admin notes). */
  application: Omit<Application, "adminNotes"> | null;
  /** localStorage key for this user's training data. */
  storageKey: string;
};

const STATUSES: BetaStatus[] = ["pending", "approved", "declined", "waitlist"];
const LEGACY_KEY = "samson-super5-plan";

type Row = {
  user_id: string; email: string; full_name: string; phone: string | null; region: string;
  rider_grade: string; competition_level: string; horses: string; horse_list?: unknown; esnz_member: boolean;
  coach: string | null; goals: string; heard_from: string; consent: boolean; status: BetaStatus;
  admin_notes: string; created_at: string | Date; decided_at: string | Date | null;
};

const iso = (v: string | Date | null) => (v == null ? null : new Date(v).toISOString());

function toApp(r: Row): Application {
  return {
    userId: r.user_id, email: r.email, fullName: r.full_name, phone: r.phone ?? "",
    region: r.region, riderGrade: r.rider_grade, competitionLevel: r.competition_level,
    horses: r.horses, horseList: parseHorseList(r.horse_list, r.horses), esnzMember: r.esnz_member, coach: r.coach ?? "", goals: r.goals,
    heardFrom: r.heard_from, consent: r.consent, status: r.status, adminNotes: r.admin_notes,
    createdAt: iso(r.created_at) ?? "", decidedAt: iso(r.decided_at),
  };
}

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Structured list if present; otherwise the legacy single text field shown as one horse. */
export function parseHorseList(raw: unknown, legacy: string | null | undefined): HorseEntry[] {
  let v = raw;
  if (typeof v === "string") {
    try { v = JSON.parse(v); } catch { v = null; }
  }
  if (Array.isArray(v)) {
    const list = v
      .map((h) => (h ?? {}) as Record<string, unknown>)
      .map((h) => ({ name: clip(h.name, 80), level: clip(h.level, 60), notes: clip(h.notes, 300) }))
      .filter((h) => h.name);
    if (list.length) return list;
  }
  const text = (legacy ?? "").trim();
  return text ? [{ name: text, level: "", notes: "" }] : [];
}

export function summariseHorses(list: HorseEntry[]): string {
  return list
    .map((h) => [h.name, h.level && `— ${h.level}`, h.notes && `(${h.notes})`].filter(Boolean).join(" "))
    .join("; ")
    .slice(0, 2000);
}

function validate(input: unknown): ApplicationInput {
  const i = (input ?? {}) as Record<string, unknown>;
  const out: ApplicationInput = {
    fullName: clip(i.fullName, 120),
    phone: clip(i.phone, 40),
    region: clip(i.region, 60),
    riderGrade: clip(i.riderGrade, 20),
    competitionLevel: clip(i.competitionLevel, 60),
    horseList: (Array.isArray(i.horseList) ? i.horseList : [])
      .slice(0, MAX_HORSES)
      .map((h) => (h ?? {}) as Record<string, unknown>)
      .map((h) => ({ name: clip(h.name, 80), level: clip(h.level, 60), notes: clip(h.notes, 300) }))
      .filter((h) => h.name || h.level || h.notes),
    esnzMember: i.esnzMember === true,
    coach: clip(i.coach, 120),
    goals: clip(i.goals, 1500),
    heardFrom: clip(i.heardFrom, 200),
    consent: i.consent === true,
  };
  const missing = (["fullName", "region", "riderGrade", "competitionLevel", "goals", "heardFrom"] as const)
    .filter((k) => !out[k]);
  if (missing.length) throw new Error(`Please complete: ${missing.join(", ")}`);
  if (!out.horseList.length) throw new Error("Please add at least one horse with a name");
  if (out.horseList.some((h) => !h.name)) throw new Error("Every horse needs a name (or remove the empty one)");
  if (Array.isArray(i.horseList) && i.horseList.length > MAX_HORSES) throw new Error(`Up to ${MAX_HORSES} horses`);
  for (const h of out.horseList) {
    if (h.level && !(COMPETITION_LEVELS as readonly string[]).includes(h.level)) throw new Error("Pick a level for each horse");
  }
  out.horses = summariseHorses(out.horseList);
  if (!(RIDER_GRADES as readonly string[]).includes(out.riderGrade)) throw new Error("Pick a rider grade");
  if (!out.consent) throw new Error("Please accept the privacy note and beta terms");
  return out;
}

export const getBetaAccess = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<BetaAccess> => {
    const { loadUser, preApproved, authOff } = await import("./beta.server");
    const { getSql } = await import("./db");
    const user = await loadUser(context.userId);
    if (authOff()) {
      return { email: null, name: user.name, isAdmin: true, hasAccess: true, status: null, application: null, storageKey: LEGACY_KEY };
    }
    const sql = await getSql();
    const rows = await sql<Row>`select * from beta_applications where user_id = ${user.id}`;
    const app = rows[0] ? toApp(rows[0]) : null;
    const status = app?.status ?? null;
    const hasAccess = user.isAdmin || status === "approved" || preApproved(user.email);
    let application: BetaAccess["application"] = null;
    if (app) {
      const { adminNotes: _n, ...rest } = app;
      void _n;
      application = rest;
    }
    return {
      email: user.email, name: user.name, isAdmin: user.isAdmin, hasAccess, status, application,
      // Admins keep the original single-rider plan; riders get their own space.
      storageKey: user.isAdmin ? LEGACY_KEY : `xsalute-plan:${user.id}`,
    };
  });

export const submitApplication = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: ApplicationInput) => validate(input))
  .handler(async ({ context, data }) => {
    const { loadUser } = await import("./beta.server");
    const { getSql } = await import("./db");
    const user = await loadUser(context.userId);
    if (!user.email) throw new Error("Your account has no email address");
    const sql = await getSql();
    await sql`
      insert into beta_applications (user_id, email, full_name, phone, region, rider_grade,
        competition_level, horses, horse_list, esnz_member, coach, goals, heard_from, consent, consent_at)
      values (${user.id}, ${user.email}, ${data.fullName}, ${data.phone || null}, ${data.region},
        ${data.riderGrade}, ${data.competitionLevel}, ${data.horses ?? ""}, ${JSON.stringify(data.horseList)}::jsonb, ${data.esnzMember},
        ${data.coach || null}, ${data.goals}, ${data.heardFrom}, ${data.consent}, now())
      on conflict (user_id) do update set
        full_name = excluded.full_name, phone = excluded.phone, region = excluded.region,
        rider_grade = excluded.rider_grade, competition_level = excluded.competition_level,
        horses = excluded.horses, horse_list = excluded.horse_list, esnz_member = excluded.esnz_member, coach = excluded.coach,
        goals = excluded.goals, heard_from = excluded.heard_from, consent = excluded.consent,
        consent_at = now(), updated_at = now()`;
    return { ok: true };
  });

async function requireAdmin(userId: string) {
  const { loadUser } = await import("./beta.server");
  const user = await loadUser(userId);
  if (!user.isAdmin) throw new Error("Admins only");
  return user;
}

export type AdminOverview = { applications: Application[]; cap: number; approved: number };

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AdminOverview> => {
    await requireAdmin(context.userId);
    const { getSql } = await import("./db");
    const sql = await getSql();
    const rows = await sql<Row>`select * from beta_applications order by created_at desc`;
    const cap = await sql<{ value: string }>`select value from app_settings where key = 'beta_cap'`;
    const applications = rows.map(toApp);
    return {
      applications,
      cap: Number(cap[0]?.value ?? 15) || 15,
      approved: applications.filter((a) => a.status === "approved").length,
    };
  });

export const decideApplication = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; status?: BetaStatus; notes?: string }) => {
    if (input.status && !STATUSES.includes(input.status)) throw new Error("Bad status");
    return { userId: String(input.userId), status: input.status, notes: input.notes == null ? undefined : String(input.notes).slice(0, 2000) };
  })
  .handler(async ({ context, data }) => {
    const admin = await requireAdmin(context.userId);
    const { getSql } = await import("./db");
    const sql = await getSql();
    if (data.status) {
      await sql`update beta_applications set status = ${data.status}, decided_at = now(),
        decided_by = ${admin.email}, updated_at = now() where user_id = ${data.userId}`;
    }
    if (data.notes !== undefined) {
      await sql`update beta_applications set admin_notes = ${data.notes}, updated_at = now()
        where user_id = ${data.userId}`;
    }
    return { ok: true };
  });

export const setBetaCap = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { cap: number }) => {
    const cap = Math.round(Number(input.cap));
    if (!Number.isFinite(cap) || cap < 1 || cap > 500) throw new Error("Cap must be 1–500");
    return { cap };
  })
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const { getSql } = await import("./db");
    const sql = await getSql();
    await sql`insert into app_settings (key, value) values ('beta_cap', ${String(data.cap)})
      on conflict (key) do update set value = excluded.value, updated_at = now()`;
    return { ok: true };
  });
