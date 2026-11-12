import type { Sql } from "./db.ts";
import type { SheetRead } from "./review-types.ts";
import { aucklandDay, sheetReadGate } from "./sheet-reads.ts";
import {
  acceptCues,
  claimCoachGeneration,
  coachCuesPerDay,
  coachTtsMode,
  evidenceScript,
  mergeCoachCues,
  cueRiderName,
  rewriteCueText,
  spokenHorseName,
  sheetMatchesTest,
  type CoachCue,
  type CueEvidence,
} from "./coach-cues.ts";

export type CueMovement = { n: number; label: string };

const SYSTEM = `You write one short spoken cue for each movement of a dressage test.
Use only the evidence. Never invent a score, percentage, placing, date, or comment.
If a movement has no evidence that names it, its letters, or its figure, return an empty string or one brief general riding tip with no numbers.
Address the rider by their first name only when you know it. Say "your horse" or the horse's name. Do not say he or she.
One or two spoken sentences. No emoji. No markdown.
Return JSON only: {"cues":[{"n":1,"text":""}]}`;

function clip(value: string, max: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

async function horseRow(sql: Sql, userId: string, horseId: string, isAdmin: boolean) {
  const rows = await sql<{ id: string; name: string; paddock_name: string; user_id: string }>`
    select id, name, paddock_name, user_id from horses
    where id = ${horseId} and not archived and (${isAdmin} or user_id = ${userId})`;
  return rows[0] ?? null;
}

async function namingFor(sql: Sql, horse: { name: string; paddock_name: string; user_id: string }) {
  const rows = await sql<{ full_name: string | null; display_name: string | null; account_name: string | null }>`
    select b.full_name, r.display_name, u.name as account_name
    from "user" u
    left join riders r on r.user_id = u.id
    left join beta_applications b on b.user_id = u.id
    where u.id = ${horse.user_id}`;
  const row = rows[0];
  const riderName = cueRiderName({
    applicationName: row?.full_name,
    profileName: row?.display_name,
    accountName: row?.account_name,
  });
  const account = (row?.account_name ?? "").trim().split(/\s+/)[0] ?? "";
  return {
    riderName,
    dropNames: account && account.toLowerCase() !== riderName.toLowerCase() ? [account] : [],
    spokenHorse: spokenHorseName(horse.name, horse.paddock_name),
    registeredName: horse.name,
  };
}

async function loadEvidence(
  sql: Sql,
  ownerId: string,
  horseId: string,
  horseName: string,
  firstName: string,
  testId: string,
  testName: string,
  registeredName = "",
): Promise<CueEvidence> {
  const sheets = await sql<{ ride_date: string | null; test: string; sheet: SheetRead | null }>`
    select ride_date::text as ride_date, test, sheet from judge_sheets
    where horse_id = ${horseId} and user_id = ${ownerId} and kind = 'sheet' and sheet is not null
    order by ride_date desc nulls last limit 12`;
  const notes = await sql<{ note_date: string | null; body: string }>`
    select note_date::text as note_date, body from ride_notes
    where horse_id = ${horseId} and user_id = ${ownerId}
    order by note_date desc nulls last limit 8`;
  const visits = await sql<{
    visit_date: string | null;
    focus: string;
    homework: string;
    leave_it: string;
  }>`
    select visit_date::text as visit_date, focus, homework, leave_it from coach_visits
    where horse_id = ${horseId} and user_id = ${ownerId}
    order by visit_date desc limit 6`;
  const results = await sql<{
    ride_date: string | null;
    test: string;
    dressage_test: string;
    percent: number | null;
    place: string;
  }>`
    select ride_date::text as ride_date, test, dressage_test, percent, place from results
    where horse_id = ${horseId} and user_id = ${ownerId} and review_status = 'kept' and status = 'ok'
    order by ride_date desc nulls last limit 20`;
  const asSheet = (value: SheetRead | string | null): SheetRead | null => {
    if (!value) return null;
    if (typeof value === "string") {
      try {
        return JSON.parse(value) as SheetRead;
      } catch {
        return null;
      }
    }
    return value;
  };
  const matchingSheets = sheets
    .map((row) => ({ ...row, sheet: asSheet(row.sheet) }))
    .filter((row) => row.sheet && sheetMatchesTest(row.test, testId, testName));
  const matchingResults = results.filter((row) =>
    sheetMatchesTest(row.dressage_test || row.test, testId, testName),
  );
  return {
    firstName,
    horseName,
    registeredName: registeredName && registeredName !== horseName ? registeredName : undefined,
    testName,
    sheets: matchingSheets.slice(0, 4).map((row) => ({
      date: row.ride_date ?? "",
      summary: clip(row.sheet?.summary ?? "", 400),
      lowMarks: (row.sheet?.lowMarks ?? []).slice(0, 6).map((mark) => ({
        movement: clip(mark.movement, 80),
        mark: clip(mark.mark, 12),
        comment: clip(mark.comment, 180),
      })),
      remarks: (row.sheet?.judges ?? []).flatMap((judge) => judge.remarks).slice(0, 8).map((remark) => clip(remark, 180)),
    })),
    notes: notes.map((row) => ({ date: row.note_date ?? "", text: clip(row.body, 240) })),
    visits: visits.map((row) => ({
      date: row.visit_date ?? "",
      focus: clip(row.focus, 160),
      homework: clip(row.homework, 200),
      leaveIt: clip(row.leave_it, 160),
    })),
    results: matchingResults.slice(0, 6).map((row) => ({
      date: row.ride_date ?? "",
      test: clip(row.dressage_test || testName, 40),
      percent: row.percent,
      place: clip(row.place, 16),
    })),
  };
}

async function readStored(sql: Sql, horseId: string, testId: string): Promise<CoachCue[]> {
  const rows = await sql<{ cues: CoachCue[] | string | null }>`
    select cues from coach_cues where horse_id = ${horseId} and test_id = ${testId}`;
  const stored = rows[0]?.cues;
  let cues: CoachCue[] | null = null;
  if (typeof stored === "string") {
    try {
      cues = JSON.parse(stored) as CoachCue[];
    } catch {
      cues = [];
    }
  } else cues = stored ?? null;
  if (!Array.isArray(cues)) return [];
  return cues
    .filter((cue) => cue && Number.isInteger(cue.n) && (cue.source === "ai" || cue.source === "edit"))
    .map((cue) => ({
      n: cue.n,
      text: clip(String(cue.text ?? ""), 320),
      source: cue.source,
    }));
}

export async function loadStoredCues(
  sql: Sql,
  actor: { userId: string; isAdmin: boolean },
  horseId: string,
  testId: string,
): Promise<CoachCue[]> {
  const horse = await horseRow(sql, actor.userId, horseId, actor.isAdmin);
  if (!horse) throw new Error("Horse not found");
  const stored = await readStored(sql, horse.id, testId);
  const naming = await namingFor(sql, horse);
  const cues = stored.map((cue) => ({ ...cue, text: rewriteCueText(cue.text, naming) }));
  if (cues.some((cue, index) => cue.text !== stored[index]?.text)) {
    await sql`update coach_cues set cues = ${JSON.stringify(cues)}::jsonb, updated_at = now()
      where horse_id = ${horse.id} and test_id = ${testId}`;
  }
  return cues;
}

export async function saveEditedCues(
  sql: Sql,
  actor: { userId: string; isAdmin: boolean },
  horseId: string,
  testId: string,
  cues: { n: number; text: string }[],
): Promise<CoachCue[]> {
  if (!actor.isAdmin) throw new Error("Admins only");
  const horse = await horseRow(sql, actor.userId, horseId, true);
  if (!horse) throw new Error("Horse not found");
  const previous = await readStored(sql, horse.id, testId);
  const edits: CoachCue[] = cues.slice(0, 40).map((cue) => ({
    n: cue.n,
    text: clip(cue.text, 320),
    source: "edit" as const,
  }));
  const byNumber = new Map(previous.map((cue) => [cue.n, cue]));
  for (const edit of edits) byNumber.set(edit.n, edit);
  const next = [...byNumber.values()].sort((a, b) => a.n - b.n);
  await sql`insert into coach_cues (horse_id, test_id, user_id, cues)
    values (${horse.id}, ${testId}, ${horse.user_id}, ${JSON.stringify(next)}::jsonb)
    on conflict (horse_id, test_id) do update
      set cues = excluded.cues, user_id = excluded.user_id, updated_at = now()`;
  return next;
}

async function askXai(apiKey: string, evidence: string, movements: CueMovement[]): Promise<string> {
  const list = movements
    .map((movement) => `${movement.n}. ${clip(movement.label, 240)}`)
    .join("\n");
  const body = {
    model: "grok-4.5",
    temperature: 0.2,
    max_tokens: 2200,
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `${evidence}\n\nMovements:\n${list}\n\nWrite one cue per movement number.`,
      },
    ],
  };
  let res: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    if (res.ok || (res.status !== 429 && res.status < 500)) break;
  }
  if (!res?.ok) throw new Error("The coaching could not be written. Try again in a moment.");
  const json = (await res.json()) as { choices?: { message?: { content?: string | null } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

async function attachSpeech(cues: CoachCue[]): Promise<(CoachCue & { audioBase64?: string })[]> {
  if (coachTtsMode(process.env.COACH_TTS) !== "xai") return cues;
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return cues;
  const voice = process.env.XAI_TTS_VOICE?.trim() || "eve";
  let budget = 1_200_000;
  const spoken: (CoachCue & { audioBase64?: string })[] = [];
  for (const cue of cues) {
    if (!cue.text || budget < 20_000) {
      spoken.push(cue);
      continue;
    }
    try {
      const res = await fetch("https://api.x.ai/v1/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ text: cue.text, voice_id: voice, language: "en" }),
      });
      if (!res.ok) {
        spoken.push(cue);
        continue;
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength === 0 || bytes.byteLength > 120_000) {
        spoken.push(cue);
        continue;
      }
      const audioBase64 = Buffer.from(bytes).toString("base64");
      budget -= audioBase64.length;
      spoken.push(budget >= 0 ? { ...cue, audioBase64 } : cue);
    } catch {
      spoken.push(cue);
    }
  }
  return spoken;
}

export async function refreshCues(
  sql: Sql,
  actor: { userId: string; isAdmin: boolean; approved: boolean },
  input: { horseId: string; testId: string; testName: string; movements: CueMovement[] },
): Promise<{ ok: true; cues: (CoachCue & { audioBase64?: string })[]; tts: "browser" | "xai" } | { ok: false; error: string }> {
  const gate = sheetReadGate(actor);
  if (!gate.ok) return gate;
  const horse = await horseRow(sql, actor.userId, input.horseId, actor.isAdmin);
  if (!horse) return { ok: false, error: "Horse not found" };
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return { ok: false, error: "Coaching cues are not available right now." };
  if (gate.limited) {
    const slot = await claimCoachGeneration(sql, {
      userId: actor.userId,
      limit: coachCuesPerDay(process.env.COACH_CUES_PER_DAY),
      day: aucklandDay(),
    });
    if (!slot.ok) return slot;
  }
  const naming = await namingFor(sql, horse);
  const movements = input.movements
    .filter((movement) => Number.isInteger(movement.n) && movement.n > 0 && movement.n < 80)
    .slice(0, 40);
  const evidence = await loadEvidence(
    sql,
    horse.user_id,
    horse.id,
    naming.spokenHorse,
    naming.riderName,
    input.testId,
    input.testName,
    naming.registeredName,
  );
  const script = evidenceScript(evidence);
  const raw = await askXai(apiKey, script, movements);
  const accepted = acceptCues(raw, movements, script).map((cue) => ({
    ...cue,
    text: rewriteCueText(cue.text, naming),
  }));
  const previous = (await readStored(sql, horse.id, input.testId)).map((cue) => ({
    ...cue,
    text: rewriteCueText(cue.text, naming),
  }));
  const cues = mergeCoachCues(previous, accepted);
  await sql`insert into coach_cues (horse_id, test_id, user_id, cues)
    values (${horse.id}, ${input.testId}, ${horse.user_id}, ${JSON.stringify(cues)}::jsonb)
    on conflict (horse_id, test_id) do update
      set cues = excluded.cues, updated_at = now()`;
  const tts = coachTtsMode(process.env.COACH_TTS);
  return { ok: true, cues: await attachSpeech(cues), tts };
}
