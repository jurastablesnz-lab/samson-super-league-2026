/**
 * Per-rider workspace data access (server-only). Every function takes the
 * VERIFIED user id from authMiddleware and scopes every query to it — a rider
 * can only ever read or write their own horses, plans, results, notes and
 * sheets. Admin-only helpers say so in their name.
 */
import { getSql, type Sql } from "./db";
import { loadUser, resolveRiderAccess, type UserInfo } from "./beta.server";
import { parseHorseList, type HorseEntry } from "./beta";
import { generatePlan, sanitisePlanConfig, type PlanConfig } from "./plan-builder";
import type { CoachVisitDraft } from "./rider-workspace";
import {
  deleteCoachVisitFor,
  ownedHorse,
  readHorseLog,
  saveCoachVisitFor,
  toProgress,
  upsertSheet,
  writeProgress,
} from "./rider-horse.server.ts";
import { reviewEvoResultsForOwner } from "./evo-review.server";
import type { EvoRow } from "./evo-csv";
import type {
  HorseLog,
  HorseRecord,
  LegacySnapshot,
  NoteRecord,
  PlanRecord,
  Progress,
  ResultRecord,
  SetupHorseInput,
  Workspace,
} from "./rider-types";

export const SAMSON = { name: "Jura Samson", level: "Level 2", esnz: "" };

const iso = (v: string | Date | null | undefined) => (v == null ? null : new Date(v).toISOString());
const dateOrNull = (v: unknown) =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null;
const s = (v: unknown, max = 500) =>
  typeof v === "string" ? v.slice(0, max) : v == null ? "" : String(v).slice(0, max);
const json = (v: unknown) => (typeof v === "string" ? (JSON.parse(v) as unknown) : v);
const newId = () => globalThis.crypto.randomUUID();

export { ownedHorse, readHorseLog, upsertSheet, writeProgress, saveCoachVisitFor, deleteCoachVisitFor };

/** Loads the user and refuses anyone without beta access. */
export async function requireAccess(userId: string): Promise<UserInfo> {
  const { user, approved } = await resolveRiderAccess(userId);
  if (!approved) throw new Error("Your beta place is not approved yet");
  const sql = await getSql();
  await sql`insert into riders (user_id, display_name, last_active_at) values (${userId}, ${user.name ?? ""}, now())
    on conflict (user_id) do update set last_active_at = now(), updated_at = now(),
      display_name = case when riders.display_name = '' then excluded.display_name else riders.display_name end`;
  return user;
}

export async function requireAdminUser(userId: string, sql?: Sql): Promise<UserInfo> {
  const user = await loadUser(userId, sql);
  if (!user.isAdmin) throw new Error("Admins only");
  return user;
}

async function ensureRider(sql: Sql, user: UserInfo) {
  await sql`insert into riders (user_id, display_name, last_active_at) values (${user.id}, ${user.name ?? ""}, now())
    on conflict (user_id) do update set last_active_at = now(), updated_at = now(),
      display_name = case when riders.display_name = '' then excluded.display_name else riders.display_name end`;
}

type HorseRow = {
  id: string;
  name: string;
  level: string;
  esnz_number: string | null;
  notes: string;
  is_legacy_samson: boolean;
  sort_order: number;
};
const toHorse = (r: HorseRow): HorseRecord => ({
  id: r.id,
  name: r.name,
  level: r.level,
  esnzNumber: r.esnz_number ?? "",
  notes: r.notes,
  isLegacySamson: r.is_legacy_samson,
  sortOrder: r.sort_order,
});

type PlanRow = {
  horse_id: string;
  config: unknown;
  plan: unknown;
  progress: unknown;
  freestyle: unknown;
  updated_at: string | Date;
};
const toPlan = (r: PlanRow): PlanRecord => ({
  horseId: r.horse_id,
  config: json(r.config) as PlanConfig,
  plan: (json(r.plan) as PlanRecord["plan"]) ?? null,
  progress: toProgress(r.progress),
  freestyle: (json(r.freestyle) as PlanRecord["freestyle"]) ?? null,
  updatedAt: iso(r.updated_at) ?? "",
});

export async function loadWorkspace(userId: string): Promise<Workspace> {
  const user = await requireAccess(userId);
  const sql = await getSql();
  await ensureRider(sql, user);
  const [rider] = await sql<{
    setup_completed_at: string | null;
    legacy_imported_at: string | null;
    legacy_synced_at: string | null;
  }>`
    select setup_completed_at, legacy_imported_at, legacy_synced_at from riders where user_id = ${user.id}`;
  const horses = (
    await sql<HorseRow>`select * from horses where user_id = ${user.id} and not archived
    order by sort_order, created_at`
  ).map(toHorse);
  const plans: Record<string, PlanRecord> = {};
  for (const p of await sql<PlanRow>`select * from plans where user_id = ${user.id}`)
    plans[p.horse_id] = toPlan(p);
  const app = await sql<{
    horse_list: unknown;
    horses: string;
    rider_grade: string;
    full_name: string;
  }>`
    select horse_list, horses, rider_grade, full_name from beta_applications where user_id = ${user.id}`;
  const applicationHorses: HorseEntry[] = app[0]
    ? parseHorseList(app[0].horse_list, app[0].horses)
    : [];
  return {
    userId: user.id,
    isOwner: user.isAdmin,
    displayName: app[0]?.full_name || user.name || "",
    rider: {
      setupCompletedAt: iso(rider?.setup_completed_at),
      legacyImportedAt: iso(rider?.legacy_imported_at),
      legacySyncedAt: iso(rider?.legacy_synced_at),
    },
    horses,
    plans,
    applicationHorses,
    riderGrade: app[0]?.rider_grade ?? "",
  };
}

/** Wizard save: upsert horses, (re)generate each plan, mark setup complete. */
export async function saveSetup(
  userId: string,
  input: SetupHorseInput[],
  keepOthers = true,
): Promise<Workspace> {
  const user = await requireAccess(userId);
  const sql = await getSql();
  await ensureRider(sql, user);
  if (!Array.isArray(input) || input.length === 0) throw new Error("Add at least one horse");
  if (input.length > 6) throw new Error("Up to 6 horses");
  const keep: string[] = [];
  let order = 0;
  for (const h of input) {
    const name = s(h.name, 80).trim();
    if (!name) throw new Error("Every horse needs a name");
    const level = s(h.level, 60).trim();
    const esnz = s(h.esnzNumber, 20).trim() || null;
    let id = typeof h.id === "string" && h.id ? h.id : "";
    if (id) {
      const own = await sql<{
        id: string;
        is_legacy_samson: boolean;
      }>`select id, is_legacy_samson from horses where id = ${id} and user_id = ${user.id}`;
      if (!own[0]) id = "";
    }
    if (!id) {
      id = newId();
      await sql`insert into horses (id, user_id, name, level, esnz_number, notes, sort_order)
        values (${id}, ${user.id}, ${name}, ${level}, ${esnz}, ${s(h.notes, 300)}, ${order})`;
    } else {
      await sql`update horses set name = ${name}, level = ${level}, esnz_number = ${esnz},
        notes = ${s(h.notes, 300)}, sort_order = ${order}, archived = false, updated_at = now()
        where id = ${id} and user_id = ${user.id}`;
    }
    keep.push(id);
    order += 1;
    const config = sanitisePlanConfig(h.config, { horseName: name, level });
    config.horseName = name;
    config.level = level || config.level;
    const plan = generatePlan(config);
    await sql`insert into plans (horse_id, user_id, config, plan, freestyle)
      values (${id}, ${user.id}, ${JSON.stringify(config)}::jsonb, ${JSON.stringify(plan)}::jsonb,
        ${config.freestyle ? JSON.stringify(config.freestyle) : null}::jsonb)
      on conflict (horse_id) do update set config = excluded.config, plan = excluded.plan,
        freestyle = excluded.freestyle, updated_at = now()`;
  }
  if (!keepOthers) {
    // Archive (never delete) horses the rider removed in the wizard, so their
    // results and notes survive. Samson's legacy horse is never archived here.
    const all = await sql<{
      id: string;
      is_legacy_samson: boolean;
    }>`select id, is_legacy_samson from horses where user_id = ${user.id}`;
    for (const h of all) {
      if (!keep.includes(h.id) && !h.is_legacy_samson) {
        await sql`update horses set archived = true, updated_at = now() where id = ${h.id} and user_id = ${user.id}`;
      }
    }
  }
  await sql`update riders set setup_completed_at = coalesce(setup_completed_at, now()), updated_at = now()
    where user_id = ${user.id}`;
  return loadWorkspace(userId);
}

export async function loadHorseLog(userId: string, horseId: string): Promise<HorseLog> {
  await requireAccess(userId);
  const sql = await getSql();
  return readHorseLog(sql, userId, horseId);
}

/** Import a rider's own parsed EVO rows as pending review suggestions. */
export async function importOwnEvoResults(userId: string, horseId: string, rows: EvoRow[]) {
  await requireAccess(userId);
  if (!Array.isArray(rows) || !rows.length) throw new Error("No EVO scores to import");
  if (rows.length > 500) throw new Error("Up to 500 rows at a time");
  const sql = await getSql();
  await ownedHorse(sql, userId, horseId);
  const { importOwnEvoRows } = await import("./evo-self-import.server");
  const audit = await sql<{
    id: number;
  }>`insert into result_imports (uploaded_by, file_name, row_count)
    values (CONCAT('rider:', ${userId}), 'Rider EVO paste', ${rows.length}) returning id`;
  const summary = await importOwnEvoRows(sql, userId, horseId, rows, Number(audit[0].id));
  const log = await loadHorseLog(userId, horseId);
  return { ...summary, log };
}

/** Keep or reject EVO suggestions only where they belong to this rider's horse. */
export async function reviewEvoResults(
  userId: string,
  horseId: string,
  ids: string[],
  reviewStatus: "kept" | "rejected",
) {
  await requireAccess(userId);
  const sql = await getSql();
  await ownedHorse(sql, userId, horseId);
  await reviewEvoResultsForOwner(sql, userId, horseId, ids, reviewStatus);
  return loadHorseLog(userId, horseId);
}

export async function upsertResult(
  sql: Sql,
  userId: string,
  horseId: string,
  r: Partial<ResultRecord>,
  source: ResultRecord["source"],
) {
  const pct = r.percent == null || !Number.isFinite(Number(r.percent)) ? null : Number(r.percent);
  await sql`insert into results (user_id, horse_id, client_id, source, show_id, show_name, ride_date, test, level,
      percent, place, status, judges, notes, event_url)
    values (${userId}, ${horseId}, ${s(r.id, 120) || newId()}, ${source}, ${s(r.showId, 60)}, ${s(r.showName, 120)},
      ${dateOrNull(r.date)}, ${s(r.test, 80)}, ${s(r.level, 20)}, ${pct}, ${s(r.place, 20)}, ${s(r.status, 10) || "ok"},
      ${s(r.judges, 300)}, ${s(r.notes, 2000)}, ${s(r.eventUrl, 300)})
    on conflict (horse_id, client_id) do update set show_id = excluded.show_id, show_name = excluded.show_name,
      ride_date = excluded.ride_date, test = excluded.test, level = excluded.level, percent = excluded.percent,
      place = excluded.place, status = excluded.status, judges = excluded.judges, notes = excluded.notes,
      event_url = excluded.event_url`;
}

export async function upsertNote(
  sql: Sql,
  userId: string,
  horseId: string,
  n: Partial<NoteRecord>,
) {
  await sql`insert into ride_notes (user_id, horse_id, client_id, note_date, body)
    values (${userId}, ${horseId}, ${s(n.id, 120) || newId()}, ${dateOrNull(n.date)}, ${s(n.text, 5000)})
    on conflict (horse_id, client_id) do update set note_date = excluded.note_date, body = excluded.body`;
}

export async function setProgress(userId: string, horseId: string, progress: Partial<Progress>) {
  await requireAccess(userId);
  const sql = await getSql();
  await writeProgress(sql, userId, horseId, progress);
}

export async function saveCoachVisit(userId: string, horseId: string, draft: CoachVisitDraft) {
  await requireAccess(userId);
  const sql = await getSql();
  return saveCoachVisitFor(sql, userId, horseId, draft);
}

export async function deleteCoachVisit(userId: string, horseId: string, id: string) {
  await requireAccess(userId);
  const sql = await getSql();
  return deleteCoachVisitFor(sql, userId, horseId, id);
}

// ---- Owner: Samson's localStorage → Postgres ------------------------------

async function ensureSamsonHorse(sql: Sql, userId: string): Promise<string> {
  const rows = await sql<{
    id: string;
  }>`select id from horses where user_id = ${userId} and is_legacy_samson limit 1`;
  if (rows[0]) return rows[0].id;
  const id = newId();
  await sql`insert into horses (id, user_id, name, level, notes, is_legacy_samson, sort_order)
    values (${id}, ${userId}, ${SAMSON.name}, ${SAMSON.level}, 'Original XSalute plan (imported from this device)', true, -1)`;
  await sql`insert into plans (horse_id, user_id, config) values (${id}, ${userId}, ${JSON.stringify({ template: "samson" })}::jsonb)
    on conflict (horse_id) do nothing`;
  return id;
}

function cleanSnapshot(x: LegacySnapshot): LegacySnapshot {
  return {
    done: x?.done ?? {},
    pack: x?.pack ?? {},
    scores: (x?.scores ?? [])
      .filter((r) => r && !r.official && typeof r.id === "string" && !r.id.startsWith("evo-"))
      .slice(0, 2000),
    notes: (x?.notes ?? []).filter((n) => n && typeof n.id === "string").slice(0, 5000),
    review: (x?.review ?? []).filter((r) => r && typeof r.id === "string").slice(0, 2000),
  };
}

/**
 * Write a localStorage snapshot into a horse. `mirror` = this device is the
 * source of truth for rows that came from the app/localStorage (deletions made
 * here propagate); CSV-imported results are never touched. Without `mirror`
 * it only adds/updates (first import).
 */
export async function writeSnapshot(
  userId: string,
  horseId: string,
  snap: LegacySnapshot,
  mirror: boolean,
) {
  const sql = await getSql();
  const x = cleanSnapshot(snap);
  for (const r of x.scores) {
    await upsertResult(
      sql,
      userId,
      horseId,
      { ...r, percent: r.percent, level: r.level ?? "", status: r.status ?? "ok" },
      "legacy",
    );
  }
  for (const n of x.notes) await upsertNote(sql, userId, horseId, n);
  for (const r of x.review) {
    await upsertSheet(sql, userId, horseId, {
      id: r.id,
      kind: r.kind,
      showId: r.showId,
      showName: "",
      date: r.date,
      test: r.test,
      note: r.note,
      mime: r.mime,
      sheet: r.sheet ?? null,
      photos: r.photos ?? null,
    });
  }
  if (mirror) {
    const keepScores = x.scores.map((r) => r.id);
    const keepNotes = x.notes.map((r) => r.id);
    const keepSheets = x.review.map((r) => r.id);
    await sql`delete from results where horse_id = ${horseId} and user_id = ${userId} and source in ('app', 'legacy')
      and not (client_id = any(${keepScores}::text[]))`;
    await sql`delete from ride_notes where horse_id = ${horseId} and user_id = ${userId}
      and not (client_id = any(${keepNotes}::text[]))`;
    await sql`delete from judge_sheets where horse_id = ${horseId} and user_id = ${userId}
      and not (client_id = any(${keepSheets}::text[]))`;
  }
  const prev = await sql<{
    progress: unknown;
  }>`select progress from plans where horse_id = ${horseId}`;
  const p = toProgress(prev[0]?.progress);
  const progress = mirror
    ? { done: x.done, pack: x.pack }
    : { done: { ...p.done, ...x.done }, pack: { ...p.pack, ...x.pack } };
  await setProgressRaw(sql, userId, horseId, progress);
}

async function setProgressRaw(sql: Sql, userId: string, horseId: string, progress: Progress) {
  const keepTrue = (o: Record<string, boolean>) =>
    Object.fromEntries(Object.entries(o).filter(([, v]) => v === true));
  const value = { done: keepTrue(progress.done), pack: keepTrue(progress.pack) };
  await sql`insert into plans (horse_id, user_id, progress) values (${horseId}, ${userId}, ${JSON.stringify(value)}::jsonb)
    on conflict (horse_id) do update set progress = excluded.progress, updated_at = now()`;
}

export async function ownerImportLegacy(userId: string, snap: LegacySnapshot) {
  const user = await requireAdminUser(userId);
  const sql = await getSql();
  await ensureRider(sql, user);
  const horseId = await ensureSamsonHorse(sql, user.id);
  await writeSnapshot(user.id, horseId, snap, false);
  await sql`update riders set legacy_imported_at = coalesce(legacy_imported_at, now()), legacy_synced_at = now(),
    setup_completed_at = coalesce(setup_completed_at, now()), updated_at = now() where user_id = ${user.id}`;
  return { horseId, snapshot: await readSnapshot(user.id, horseId) };
}

export async function ownerSyncLegacy(userId: string, snap: LegacySnapshot) {
  const user = await requireAdminUser(userId);
  const sql = await getSql();
  const rows = await sql<{
    legacy_imported_at: string | null;
  }>`select legacy_imported_at from riders where user_id = ${user.id}`;
  if (!rows[0]?.legacy_imported_at) throw new Error("Import first");
  const horseId = await ensureSamsonHorse(sql, user.id);
  await writeSnapshot(user.id, horseId, snap, true);
  await sql`update riders set legacy_synced_at = now(), updated_at = now() where user_id = ${user.id}`;
  return { ok: true as const, syncedAt: new Date().toISOString() };
}

export async function readSnapshot(userId: string, horseId: string): Promise<LegacySnapshot> {
  const log = await loadHorseLog(userId, horseId);
  return {
    done: log.progress.done,
    pack: log.progress.pack,
    scores: log.results
      .filter((r) => r.source !== "evo_csv")
      .map((r) => ({
        id: r.id,
        showId: r.showId,
        showName: r.showName || undefined,
        date: r.date || undefined,
        test: r.test,
        percent: r.percent ?? 0,
        notes: r.notes,
        place: r.place || undefined,
        status: r.status || undefined,
        level: r.level || undefined,
        judges: r.judges || undefined,
        eventUrl: r.eventUrl || undefined,
      })),
    notes: log.notes,
    review: log.sheets.map((x) => ({
      id: x.id,
      kind: x.kind,
      showId: x.showId,
      date: x.date,
      test: x.test,
      note: x.note,
      mime: x.mime,
      ...(x.sheet ? { sheet: x.sheet } : {}),
      ...(x.photos ? { photos: x.photos } : {}),
    })),
  };
}

export async function ownerLegacyState(userId: string) {
  const user = await requireAdminUser(userId);
  const sql = await getSql();
  await ensureRider(sql, user);
  const rows = await sql<{ legacy_imported_at: string | null; legacy_synced_at: string | null }>`
    select legacy_imported_at, legacy_synced_at from riders where user_id = ${user.id}`;
  const imported = !!rows[0]?.legacy_imported_at;
  const horse = await sql<{
    id: string;
  }>`select id from horses where user_id = ${user.id} and is_legacy_samson limit 1`;
  const horseId = horse[0]?.id ?? null;
  return {
    imported,
    importedAt: iso(rows[0]?.legacy_imported_at),
    syncedAt: iso(rows[0]?.legacy_synced_at),
    horseId,
    snapshot: imported && horseId ? await readSnapshot(user.id, horseId) : null,
  };
}

/** A rider's own earlier-beta localStorage (`xsalute-plan:<id>`) → one of their horses. Add-only. */
export async function riderImportLocal(userId: string, horseId: string, snap: LegacySnapshot) {
  await requireAccess(userId);
  const sql = await getSql();
  await ownedHorse(sql, userId, horseId);
  await writeSnapshot(userId, horseId, snap, false);
  return loadHorseLog(userId, horseId);
}
