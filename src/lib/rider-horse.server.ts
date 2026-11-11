/**
 * Horse-scoped reads and writes. Every function takes a verified user id and
 * refuses a horse that rider does not own, so videos, packing ticks and coach
 * visits cannot cross riders or horses.
 */
import type { Sql } from "./db.ts";
import { cleanCoachVisit, type CoachVisitDraft } from "./rider-workspace.ts";
import type {
  CoachVisitRecord,
  HorseLog,
  NoteRecord,
  PendingEvoResult,
  Progress,
  ResultRecord,
  SheetRecord,
} from "./rider-types.ts";

const day = (v: string | Date | null | undefined) => {
  if (v == null) return "";
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const month = String(v.getMonth() + 1).padStart(2, "0");
    const date = String(v.getDate()).padStart(2, "0");
    return `${v.getFullYear()}-${month}-${date}`;
  }
  const match = String(v).match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
};
const dateOrNull = (v: unknown) =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null;
const s = (v: unknown, max = 500) =>
  typeof v === "string" ? v.slice(0, max) : v == null ? "" : String(v).slice(0, max);
const json = (v: unknown) => (typeof v === "string" ? (JSON.parse(v) as unknown) : v);
const newId = () => globalThis.crypto.randomUUID();

export function toProgress(v: unknown): Progress {
  const p = (json(v) ?? {}) as Partial<Progress>;
  return { done: p.done ?? {}, pack: p.pack ?? {} };
}

export async function ownedHorse(sql: Sql, userId: string, horseId: string) {
  const rows = await sql<{ id: string }>`
    select id from horses where id = ${horseId} and user_id = ${userId} and not archived`;
  if (!rows[0]) throw new Error("Horse not found");
  return rows[0];
}

type ResultRow = {
  client_id: string;
  source: ResultRecord["source"];
  show_id: string;
  show_name: string;
  ride_date: string | Date | null;
  test: string;
  dressage_test: string;
  level: string;
  percent: number | null;
  place: string;
  status: string;
  judges: string;
  notes: string;
  event_url: string;
};
type PendingEvoRow = ResultRow & { rider_name: string };
const toPendingEvoResult = (r: PendingEvoRow): PendingEvoResult => ({
  id: r.client_id,
  date: day(r.ride_date),
  showName: r.show_name,
  test: r.test,
  className: r.notes,
  percent: r.percent == null ? null : Number(r.percent),
  place: r.place,
  status: r.status,
  riderName: r.rider_name,
});
const toResult = (r: ResultRow): ResultRecord => ({
  id: r.client_id,
  source: r.source,
  showId: r.show_id,
  showName: r.show_name,
  date: day(r.ride_date),
  test: r.test,
  dressageTest: r.dressage_test ?? "",
  level: r.level,
  percent: r.percent == null ? null : Number(r.percent),
  place: r.place,
  status: r.status,
  judges: r.judges,
  notes: r.notes,
  eventUrl: r.event_url,
});
type NoteRow = { client_id: string; note_date: string | Date | null; body: string };
const toNote = (r: NoteRow): NoteRecord => ({
  id: r.client_id,
  date: day(r.note_date),
  text: r.body,
});
type SheetRow = {
  client_id: string;
  kind: "sheet" | "video";
  show_id: string;
  show_name: string;
  ride_date: string | Date | null;
  test: string;
  note: string;
  mime: string;
  sheet: unknown;
  photos: unknown;
};
const toSheet = (r: SheetRow): SheetRecord => ({
  id: r.client_id,
  kind: r.kind,
  showId: r.show_id,
  showName: r.show_name,
  date: day(r.ride_date),
  test: r.test,
  note: r.note,
  mime: r.mime,
  sheet: (json(r.sheet) as SheetRecord["sheet"]) ?? null,
  photos: (json(r.photos) as SheetRecord["photos"]) ?? null,
});
type CoachRow = {
  id: string;
  visit_date: string | Date | null;
  end_date: string | Date | null;
  title: string;
  focus: string;
  film: string;
  homework: string;
  leave_it: string;
};
const toCoach = (r: CoachRow): CoachVisitRecord => ({
  id: r.id,
  date: day(r.visit_date),
  endDate: day(r.end_date) || day(r.visit_date),
  title: r.title,
  focus: r.focus,
  film: r.film,
  homework: r.homework,
  leaveIt: r.leave_it,
});

/** One horse's log. Refuses another rider's horse before reading anything. */
export async function readHorseLog(sql: Sql, userId: string, horseId: string): Promise<HorseLog> {
  await ownedHorse(sql, userId, horseId);
  try {
    const { importSeedResultsForHorse } = await import("./seed-results.server.ts");
    await importSeedResultsForHorse(sql, userId, horseId);
  } catch {
    // A missing seed file must not hide scores the rider already saved.
  }
  try {
    const { backfillDressageTests } = await import("./seed-results.server.ts");
    await backfillDressageTests(sql, horseId);
  } catch {
    // An unmigrated dressage_test column must not hide scores. The screen still infers.
  }
  const results = (
    await sql<ResultRow>`select * from results where horse_id = ${horseId} and user_id = ${userId}
      and review_status = 'kept' order by ride_date desc nulls last, id desc`
  ).map(toResult);
  const pendingEvoResults = (
    await sql<PendingEvoRow>`select * from results where horse_id = ${horseId}
      and user_id = ${userId} and source = 'evo_csv' and review_status = 'pending'
      order by ride_date desc nulls last, id desc`
  ).map(toPendingEvoResult);
  const notes = (
    await sql<NoteRow>`select * from ride_notes where horse_id = ${horseId} and user_id = ${userId}
    order by note_date desc nulls last, id desc`
  ).map(toNote);
  const sheets = (
    await sql<SheetRow>`select * from judge_sheets where horse_id = ${horseId} and user_id = ${userId}
    order by ride_date desc nulls last, id desc`
  ).map(toSheet);
  const coachVisits = (
    await sql<CoachRow>`select * from coach_visits where horse_id = ${horseId} and user_id = ${userId}
    order by visit_date, id`
  ).map(toCoach);
  const prog = await sql<{
    progress: unknown;
  }>`select progress from plans where horse_id = ${horseId} and user_id = ${userId}`;
  return {
    horseId,
    results,
    pendingEvoResults,
    notes,
    sheets,
    coachVisits,
    progress: toProgress(prog[0]?.progress),
  };
}

export async function upsertSheet(
  sql: Sql,
  userId: string,
  horseId: string,
  x: Partial<SheetRecord>,
) {
  await ownedHorse(sql, userId, horseId);
  await sql`insert into judge_sheets (user_id, horse_id, client_id, kind, show_id, show_name, ride_date, test, note, mime, sheet, photos)
    values (${userId}, ${horseId}, ${s(x.id, 120) || newId()}, ${x.kind === "video" ? "video" : "sheet"}, ${s(x.showId, 60)},
      ${s(x.showName, 120)}, ${dateOrNull(x.date)}, ${s(x.test, 80)}, ${s(x.note, 5000)}, ${s(x.mime, 80)},
      ${x.sheet ? JSON.stringify(x.sheet) : null}::jsonb, ${x.photos ? JSON.stringify(x.photos) : null}::jsonb)
    on conflict (horse_id, client_id) do update set kind = excluded.kind, show_id = excluded.show_id,
      show_name = excluded.show_name, ride_date = excluded.ride_date, test = excluded.test, note = excluded.note,
      mime = excluded.mime, sheet = excluded.sheet, photos = excluded.photos, updated_at = now()
      where judge_sheets.user_id = ${userId}`;
}

function cleanFlags(o: unknown) {
  return Object.fromEntries(
    Object.entries((o ?? {}) as Record<string, unknown>)
      .filter(([, v]) => v === true)
      .slice(0, 5000)
      .map(([k]) => [k.slice(0, 200), true]),
  );
}

/** Packing ticks and done ticks for one horse. Refuses another rider's horse. */
export async function writeProgress(
  sql: Sql,
  userId: string,
  horseId: string,
  progress: Partial<Progress>,
) {
  await ownedHorse(sql, userId, horseId);
  const value = { done: cleanFlags(progress.done), pack: cleanFlags(progress.pack) };
  await sql`insert into plans (horse_id, user_id, progress) values (${horseId}, ${userId}, ${JSON.stringify(value)}::jsonb)
    on conflict (horse_id) do update set progress = excluded.progress, updated_at = now()
    where plans.user_id = ${userId}`;
}

export async function saveCoachVisitFor(
  sql: Sql,
  userId: string,
  horseId: string,
  draft: CoachVisitDraft,
) {
  await ownedHorse(sql, userId, horseId);
  const v = cleanCoachVisit(draft);
  const id = typeof draft.id === "string" ? draft.id.trim().slice(0, 120) : "";
  if (id) {
    const rows = await sql<{
      id: string;
    }>`update coach_visits set visit_date = ${v.date}, end_date = ${v.endDate}, title = ${v.title},
      focus = ${v.focus}, film = ${v.film}, homework = ${v.homework}, leave_it = ${v.leaveIt}, updated_at = now()
      where id = ${id} and user_id = ${userId} and horse_id = ${horseId} returning id`;
    if (!rows.length) throw new Error("Visit not found");
  } else {
    await sql`insert into coach_visits (id, user_id, horse_id, visit_date, end_date, title, focus, film, homework, leave_it)
      values (${newId()}, ${userId}, ${horseId}, ${v.date}, ${v.endDate}, ${v.title}, ${v.focus}, ${v.film},
        ${v.homework}, ${v.leaveIt})`;
  }
  return readHorseLog(sql, userId, horseId);
}

export async function deleteCoachVisitFor(sql: Sql, userId: string, horseId: string, id: string) {
  await ownedHorse(sql, userId, horseId);
  const visitId = id.trim().slice(0, 120);
  const rows = await sql<{
    id: string;
  }>`delete from coach_visits where id = ${visitId} and user_id = ${userId} and horse_id = ${horseId} returning id`;
  if (!rows.length) throw new Error("Visit not found");
  return readHorseLog(sql, userId, horseId);
}
