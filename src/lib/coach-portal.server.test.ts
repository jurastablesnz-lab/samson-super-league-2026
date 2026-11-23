import assert from "node:assert/strict";
import { test } from "node:test";
import type { PGlite } from "@electric-sql/pglite";
import { asSql, database } from "./test-database.ts";
import type { Sql } from "./db.ts";
import { playbackUrl, type StoragePort } from "./media-store.ts";
import { deleteCoachVisitFor, readHorseLog, saveCoachVisitFor } from "./rider-horse.server.ts";
import {
  acceptLink,
  applyForCoach,
  decideCoach,
  endLink,
  inviteCoach,
  loadPupil,
  requestPupil,
  saveCoachPackage,
  seedCoachDemo,
  setPupilHomework,
  updateLinkScopes,
  type CoachNote,
} from "./coach-portal.server.ts";

const ALL = { plan: true, results: true, judges: true, notes: true, visits: true, videos: true };
const SHARED = { plan: true, results: true, judges: true, notes: false, visits: true, videos: false };

function files(): StoragePort {
  return {
    async start() {
      return "upload";
    },
    async signPart() {
      return "https://files.test/part";
    },
    async parts() {
      return [];
    },
    async finish() {},
    async cancel() {},
    async readUrl(key) {
      return `https://files.test/read/${key}`;
    },
    async remove() {},
  };
}

async function person(pg: PGlite, id: string, name: string, email: string) {
  await pg.query('insert into "user" (id, name, email, "emailVerified") values ($1, $2, $3, true)', [
    id,
    name,
    email,
  ]);
}

async function readyFile(sql: Sql, id: string, userId: string, horseId: string, kind: string) {
  await sql`insert into media_objects (id, user_id, horse_id, kind, object_key, file_name, mime, byte_size, status)
    values (${id}, ${userId}, ${horseId}, ${kind}, ${`users/${userId}/${kind}/${id}`}, ${`${id}.bin`}, ${kind === "video" ? "video/mp4" : "audio/mpeg"}, 100, 'ready')`;
}

test("a coach reads only an active link, only shared scopes, and cannot touch the pupil's own records", async () => {
  const pg = await database();
  const sql = asSql(pg);
  const sent: CoachNote[] = [];
  const mail = async (note: CoachNote) => {
    sent.push(note);
  };
  try {
    await person(pg, "rider", "Mia Chen", "mia@example.com");
    await person(pg, "coach", "Alex Ng", "alex@example.com");
    await person(pg, "stranger", "Sam Taylor", "sam@example.com");
    await person(pg, "other", "Other Rider", "other@example.com");
    await pg.query("insert into horses (id, user_id, name, level) values ('kahu', 'rider', 'Waimarie', 'Level 2'), ('secret', 'other', 'Secret', 'Level 3')");
    await sql`insert into plans (horse_id, user_id, config, plan, progress) values (
      'kahu', 'rider', '{}'::jsonb,
      ${JSON.stringify({ phases: [{ name: "Foundation", start: "2026-01-01", end: "2027-12-31", intent: "Basics" }] })}::jsonb,
      ${JSON.stringify({ done: { a: true }, pack: {} })}::jsonb
    )`;
    await sql`insert into ride_notes (user_id, horse_id, client_id, note_date, body) values ('rider', 'kahu', 'note-1', '2026-11-20', 'Secret shoulder note')`;
    await sql`insert into results (user_id, horse_id, client_id, show_name, ride_date, test, percent, place, review_status)
      values ('rider', 'kahu', 'score-1', 'Feilding', '2026-11-08', '2B', 64.2, '4th', 'kept')`;
    await sql`insert into judge_sheets (user_id, horse_id, client_id, kind, show_name, ride_date, test, sheet) values (
      'rider', 'kahu', 'sheet-1', 'sheet', 'Feilding', '2026-11-08', '2B',
      ${JSON.stringify({ workOns: [{ title: "Halt from walk", why: "Early", how: "Square it at X" }] })}::jsonb
    )`;
    await sql`insert into judge_sheets (user_id, horse_id, client_id, kind, show_name, ride_date, test, note, mime)
      values ('rider', 'kahu', 'clip-1', 'video', 'Feilding', '2026-11-08', '2B', 'Watch the halt', 'video/mp4')`;
    await readyFile(sql, "clip-1", "rider", "kahu", "video");
    await readyFile(sql, "track-1", "rider", "kahu", "music");
    await saveCoachVisitFor(sql, "rider", "kahu", { date: "2026-11-01", title: "Yard", focus: "Rider halt", homework: "Leave it" });

    await assert.rejects(loadPupil(sql, "coach", "missing"), /aren't linked/);
    await assert.rejects(
      setPupilHomework(sql, "coach", { linkId: "missing", horseId: "kahu", date: "2027-04-02", focus: "Nope" }),
      /aren't linked/,
    );
    await assert.rejects(playbackUrl(sql, files(), { userId: "stranger", isAdmin: false }, "clip-1"), /private/);
    await assert.rejects(readHorseLog(sql, "coach", "kahu"), /Horse not found/);
    await assert.rejects(
      saveCoachVisitFor(sql, "coach", "kahu", { date: "2027-04-02", focus: "Stolen" }),
      /Horse not found/,
    );

    await applyForCoach(sql, "coach", {
      displayName: "Alex Ng",
      region: "Manawatū-Whanganui",
      bio: "I coach Level 2 horses in the yard.",
      consent: true,
    });
    const invited = await inviteCoach(
      sql,
      "rider",
      { email: "alex@example.com", scopes: SHARED, under18: false },
      mail,
    );
    await assert.rejects(acceptLink(sql, "coach", { linkId: invited.id, under18: false }, mail), /isn't approved/);
    await decideCoach(sql, "admin@example.com", { userId: "coach", status: "approved" });
    await acceptLink(sql, "coach", { linkId: invited.id, under18: false }, mail);

    const view = await loadPupil(sql, "coach", invited.id);
    assert.equal(view.pupilName, "Mia Chen");
    assert.equal(view.horses[0].notes, null);
    assert.equal(view.horses[0].videos, null);
    assert.equal(view.horses[0].scores?.[0].percent, 64.2);
    assert.equal(view.horses[0].workOns?.items[0].title, "Halt from walk");
    assert.equal(view.horses[0].plan?.phase, "Foundation");
    assert.equal(view.horses[0].plan?.ticked, 1);
    assert.equal(view.horses[0].visits?.some((visit) => visit.focus === "Rider halt"), true);
    await assert.rejects(playbackUrl(sql, files(), { userId: "coach", isAdmin: false }, "clip-1"), /private/);
    await assert.rejects(playbackUrl(sql, files(), { userId: "coach", isAdmin: false }, "track-1"), /private/);

    const before = await readHorseLog(sql, "rider", "kahu");
    const riderVisit = before.coachVisits.find((visit) => visit.focus === "Rider halt");
    assert.ok(riderVisit);
    assert.equal(riderVisit.authorRole, "rider");
    await assert.rejects(deleteCoachVisitFor(sql, "coach", "kahu", riderVisit.id), /Horse not found|Visit not found/);
    await assert.rejects(
      setPupilHomework(sql, "coach", {
        linkId: invited.id,
        horseId: "kahu",
        id: riderVisit.id,
        date: "2027-04-02",
        focus: "Overwrite",
      }),
      /only change focus you set/,
    );
    await assert.rejects(
      setPupilHomework(sql, "coach", { linkId: invited.id, horseId: "secret", date: "2027-04-02", focus: "Other horse" }),
      /Horse not found/,
    );
    await assert.rejects(loadPupil(sql, "stranger", invited.id), /aren't linked/);

    const taught = await setPupilHomework(
      sql,
      "coach",
      { linkId: invited.id, horseId: "kahu", date: "2027-04-02", focus: "Half-halts", homework: "One halt from walk" },
      mail,
    );
    assert.equal(taught.horses[0].focus?.focus, "Half-halts");
    assert.equal(taught.horses[0].focus?.authorName, "Alex Ng");

    const pupil = await readHorseLog(sql, "rider", "kahu");
    const authored = pupil.coachVisits.find((visit) => visit.focus === "Half-halts");
    assert.equal(authored?.authorRole, "coach");
    assert.equal(authored?.authorName, "Alex Ng");
    assert.equal(authored?.homework, "One halt from walk");
    assert.equal(pupil.notes[0].text, "Secret shoulder note");
    assert.equal(pupil.results.length, before.results.length);
    assert.equal(pupil.coachVisits.some((visit) => visit.focus === "Rider halt"), true);

    await updateLinkScopes(sql, "rider", { linkId: invited.id, scopes: ALL });
    assert.match(
      await playbackUrl(sql, files(), { userId: "coach", isAdmin: false }, "clip-1"),
      /users\/rider\/video\/clip-1/,
    );
    await assert.rejects(playbackUrl(sql, files(), { userId: "coach", isAdmin: false }, "track-1"), /private/);
    const withNotes = await loadPupil(sql, "coach", invited.id);
    assert.equal(withNotes.horses[0].notes?.[0].text, "Secret shoulder note");
    assert.equal(withNotes.horses[0].videos?.[0].ready, true);

    await updateLinkScopes(sql, "rider", { linkId: invited.id, scopes: { ...ALL, notes: false, videos: false, visits: false } });
    const hidden = await loadPupil(sql, "coach", invited.id);
    assert.equal(hidden.horses[0].notes, null);
    assert.equal(hidden.horses[0].videos, null);
    assert.equal(hidden.horses[0].visits, null);
    assert.equal(hidden.horses[0].focus?.focus, "Half-halts");
    await assert.rejects(playbackUrl(sql, files(), { userId: "coach", isAdmin: false }, "clip-1"), /private/);

    await endLink(sql, "rider", invited.id);
    await assert.rejects(loadPupil(sql, "coach", invited.id), /aren't linked/);
    await assert.rejects(
      setPupilHomework(sql, "coach", { linkId: invited.id, horseId: "kahu", date: "2027-05-01", focus: "After revoke" }),
      /aren't linked/,
    );
    await assert.rejects(playbackUrl(sql, files(), { userId: "coach", isAdmin: false }, "clip-1"), /private/);
    const still = await readHorseLog(sql, "rider", "kahu");
    assert.equal(still.notes[0].text, "Secret shoulder note");
    assert.equal(still.coachVisits.some((visit) => visit.focus === "Half-halts"), true);
    assert.equal(still.results[0].percent, 64.2);
    await saveCoachVisitFor(sql, "rider", "kahu", { date: "2027-06-01", focus: "Still mine" });
    assert.equal((await readHorseLog(sql, "rider", "kahu")).coachVisits.some((visit) => visit.focus === "Still mine"), true);

    assert.equal(sent.some((note) => /invited you/.test(note.subject) && note.to === "alex@example.com"), true);
    assert.equal(sent.some((note) => /accepted/.test(note.subject)), true);
    assert.equal(sent.some((note) => /New focus/.test(note.subject) && note.to === "mia@example.com"), true);
    assert.equal(sent.some((note) => note.text.includes("Secret shoulder")), false);
  } finally {
    await pg.close();
  }
});

test("guardian consent, pupil cap and a coach who is not approved all block access", async () => {
  const pg = await database();
  const sql = asSql(pg);
  const sent: CoachNote[] = [];
  try {
    await person(pg, "rider", "Mia Chen", "mia@example.com");
    await person(pg, "young", "Ari Bennett", "ari@example.com");
    await person(pg, "coach", "Alex Ng", "alex@example.com");
    await person(pg, "extra", "Jo Lee", "jo@example.com");
    await pg.query(
      "insert into horses (id, user_id, name) values ('kahu', 'rider', 'Waimarie'), ('ari-horse', 'young', 'Pip'), ('jo-horse', 'extra', 'Nimbus')",
    );
    await applyForCoach(sql, "coach", {
      displayName: "Alex Ng",
      region: "Wellington",
      bio: "Lessons and a weekly check-in.",
      consent: true,
    });
    await decideCoach(sql, "admin@example.com", { userId: "coach", status: "approved" });

    await assert.rejects(
      inviteCoach(sql, "young", { email: "alex@example.com", scopes: ALL, under18: true, guardianAgrees: false }),
      /parent or guardian/,
    );
    const invited = await inviteCoach(sql, "young", {
      email: "alex@example.com",
      scopes: ALL,
      under18: true,
      guardianName: "Pat Bennett",
      guardianNote: "Agreed by phone",
      guardianAgrees: true,
    });
    await acceptLink(sql, "coach", { linkId: invited.id, under18: false });
    const young = await loadPupil(sql, "coach", invited.id);
    assert.equal(young.guardianConsent, true);
    assert.equal(young.pupilName, "Ari Bennett");

    await saveCoachPackage(sql, "coach", { offerings: [], pupilCap: 1, acceptingPupils: true });
    await assert.rejects(requestPupil(sql, "coach", { email: "mia@example.com" }, async (note) => void sent.push(note)), /pupil cap/);
    await endLink(sql, "young", invited.id);
    await saveCoachPackage(sql, "coach", { offerings: [], pupilCap: 8, acceptingPupils: false });
    await assert.rejects(requestPupil(sql, "coach", { email: "mia@example.com" }), /isn't taking new pupils/);
    await saveCoachPackage(sql, "coach", {
      offerings: [{ id: "reviews", kind: "ride_reviews", label: "Ride reviews", detail: "Clips", perMonth: 4 }],
      pupilCap: 8,
      acceptingPupils: true,
    });
    await sql`insert into riders (user_id, display_name, under_18) values ('rider', 'Mia Chen', true)
      on conflict (user_id) do update set under_18 = true`;
    const requested = await requestPupil(sql, "coach", { email: "mia@example.com" }, async (note) => void sent.push(note));
    assert.equal(sent.some((note) => note.to === "mia@example.com" && /asked to connect/.test(note.subject)), true);
    await assert.rejects(acceptLink(sql, "rider", { linkId: requested.id, scopes: ALL, under18: false }), /parent or guardian/);
    await acceptLink(sql, "rider", {
      linkId: requested.id,
      scopes: { ...ALL, notes: false },
      under18: true,
      guardianName: "Kim Chen",
      guardianAgrees: true,
    });
    const mia = await loadPupil(sql, "coach", requested.id);
    assert.equal(mia.horses[0].notes, null);
    assert.equal(mia.guardianConsent, true);

    await decideCoach(sql, "admin@example.com", { userId: "coach", status: "declined" });
    await assert.rejects(loadPupil(sql, "coach", requested.id), /aren't linked/);
    const own = await readHorseLog(sql, "young", "ari-horse");
    assert.deepEqual(own.notes, []);
  } finally {
    await pg.close();
  }
});

test("the sample pupil can be loaded twice without touching the coach's own horses", async () => {
  const pg = await database();
  const sql = asSql(pg);
  try {
    const first = await seedCoachDemo(sql, "dev-user", { riderPreview: false });
    const own = await sql<{ id: string }>`select id from horses where user_id = 'dev-user'`;
    assert.equal(own.length, 0);
    const again = await seedCoachDemo(sql, "dev-user", { riderPreview: true });
    assert.equal(again.linkId, first.linkId);
    const horses = await sql<{ name: string }>`select name from horses where user_id = 'dev-user'`;
    assert.deepEqual(horses.map((horse) => horse.name), ["Tui"]);
    const view = await loadPupil(sql, "dev-user", first.linkId);
    assert.equal(view.pupilName, "Mia Chen");
    assert.equal(view.horses[0].name, "Waimarie");
    assert.ok(view.horses[0].notes?.some((note) => /shoulder/.test(note.text)));
    assert.equal(view.horses[0].videos?.[0].ready, true);
    assert.equal(view.horses[0].workOns?.items[0].title, "Halt from walk");
    const preview = await readHorseLog(sql, "dev-user", (await sql<{ id: string }>`select id from horses where user_id = 'dev-user'`)[0].id);
    assert.equal(preview.coachVisits[0].authorRole, "coach");
    assert.equal(preview.coachVisits[0].authorName, "Alex Ng");
    const third = await seedCoachDemo(sql, "dev-user", { riderPreview: true });
    assert.equal(third.linkId, first.linkId);
    const still = await sql<{ n: number }>`select count(*)::int as n from horses where user_id = 'dev-user'`;
    assert.equal(Number(still[0].n), 1);
  } finally {
    await pg.close();
  }
});
