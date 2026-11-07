/**
 * Competitions catalog (admin) and the competitions a rider is training a
 * horse towards. Every rider read is scoped to a horse that rider owns.
 */
import type { Sql } from "./db.ts";
import {
  cleanCompetition,
  cleanTargetTests,
  type CompetitionInput,
  type CompetitionRecord,
  type TrainingBoard,
  type TrainingTarget,
} from "./competitions.ts";
import { ownedHorse } from "./rider-horse.server.ts";

type CompetitionRow = {
  id: string;
  name: string;
  venue: string;
  region: string;
  start_date: string | Date;
  end_date: string | Date;
  entry_open: string | Date | null;
  entry_close: string | Date | null;
  offered: string;
  schedule_url: string;
  notes: string;
  tests?: unknown;
};

function day(v: unknown): string {
  if (v == null || v === "") return "";
  if (typeof v === "string") return v.slice(0, 10);
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  return "";
}

function json(v: unknown) {
  return typeof v === "string" ? (JSON.parse(v) as unknown) : v;
}

function toCompetition(row: CompetitionRow): CompetitionRecord {
  return {
    id: row.id,
    name: row.name,
    venue: row.venue,
    region: row.region,
    start: day(row.start_date),
    end: day(row.end_date),
    entryOpen: day(row.entry_open),
    entryClose: day(row.entry_close),
    offered: row.offered,
    scheduleUrl: row.schedule_url,
    notes: row.notes,
  };
}

function toTarget(row: CompetitionRow): TrainingTarget {
  const tests = json(row.tests);
  return {
    ...toCompetition(row),
    tests: Array.isArray(tests) ? tests.filter((t): t is string => typeof t === "string") : [],
  };
}

async function listRows(sql: Sql): Promise<CompetitionRecord[]> {
  const rows = await sql<CompetitionRow>`
    select * from competitions order by start_date, name, id`;
  return rows.map(toCompetition);
}

export async function listCompetitions(sql: Sql): Promise<CompetitionRecord[]> {
  return listRows(sql);
}

export async function saveCompetition(
  sql: Sql,
  input: Partial<CompetitionInput>,
): Promise<CompetitionRecord[]> {
  const data = cleanCompetition(input);
  const entryOpen = data.entryOpen || null;
  const entryClose = data.entryClose || null;
  if (data.id) {
    const updated = await sql<{ id: string }>`
      update competitions set name = ${data.name}, venue = ${data.venue}, region = ${data.region},
        start_date = ${data.start}, end_date = ${data.end}, entry_open = ${entryOpen},
        entry_close = ${entryClose}, offered = ${data.offered}, schedule_url = ${data.scheduleUrl},
        notes = ${data.notes}, updated_at = now()
      where id = ${data.id} returning id`;
    if (!updated[0]) throw new Error("Competition not found");
  } else {
    const id = crypto.randomUUID();
    await sql`
      insert into competitions (
        id, name, venue, region, start_date, end_date, entry_open, entry_close, offered, schedule_url, notes
      ) values (
        ${id}, ${data.name}, ${data.venue}, ${data.region}, ${data.start}, ${data.end},
        ${entryOpen}, ${entryClose}, ${data.offered}, ${data.scheduleUrl}, ${data.notes}
      )`;
  }
  return listRows(sql);
}

export async function deleteCompetition(sql: Sql, id: string): Promise<CompetitionRecord[]> {
  const gone = await sql<{ id: string }>`delete from competitions where id = ${id} returning id`;
  if (!gone[0]) throw new Error("Competition not found");
  return listRows(sql);
}

async function planTests(sql: Sql, userId: string, horseId: string): Promise<string[]> {
  const rows = await sql<{ config: unknown }>`
    select config from plans where horse_id = ${horseId} and user_id = ${userId}`;
  const config = (json(rows[0]?.config) ?? {}) as { tests?: unknown };
  return Array.isArray(config.tests)
    ? config.tests.filter((t): t is string => typeof t === "string")
    : [];
}

async function targetsFor(sql: Sql, userId: string, horseId: string): Promise<TrainingTarget[]> {
  const rows = await sql<CompetitionRow>`
    select c.*, hc.tests from horse_competitions hc
    join competitions c on c.id = hc.competition_id
    where hc.horse_id = ${horseId} and hc.user_id = ${userId}
    order by c.start_date, c.name, c.id`;
  return rows.map(toTarget);
}

export async function trainingBoard(
  sql: Sql,
  userId: string,
  horseId: string,
): Promise<TrainingBoard> {
  await ownedHorse(sql, userId, horseId);
  return { catalog: await listRows(sql), targets: await targetsFor(sql, userId, horseId) };
}

export async function setTrainingTarget(
  sql: Sql,
  userId: string,
  horseId: string,
  competitionId: string,
  tests: unknown,
  on: boolean,
): Promise<TrainingBoard> {
  await ownedHorse(sql, userId, horseId);
  const id = competitionId.trim().slice(0, 80);
  if (!id) throw new Error("Choose a competition");
  if (!on) {
    await sql`
      delete from horse_competitions
      where horse_id = ${horseId} and user_id = ${userId} and competition_id = ${id}`;
    return trainingBoard(sql, userId, horseId);
  }
  const found = await sql<{ id: string }>`select id from competitions where id = ${id}`;
  if (!found[0]) throw new Error("Competition not found");
  const allowed = await planTests(sql, userId, horseId);
  const stored = cleanTargetTests(tests, allowed);
  await sql`
    insert into horse_competitions (horse_id, competition_id, user_id, tests)
    values (${horseId}, ${id}, ${userId}, ${JSON.stringify(stored)}::jsonb)
    on conflict (horse_id, competition_id) do update set tests = excluded.tests`;
  return trainingBoard(sql, userId, horseId);
}
