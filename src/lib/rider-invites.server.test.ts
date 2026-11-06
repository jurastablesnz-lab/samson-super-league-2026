import type { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./db.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  claimInvitation,
  createInvitation,
  prepareRiderWorkspace,
  loadVerifiedIdentity,
  verifiedGoogle,
  type VerifiedIdentity,
} from "./rider-invites.server.ts";

import { asSql, database } from "./test-database.ts";
async function user(pg: PGlite, id: string, email: string, provider = "google", verified = true) {
  await pg.query('insert into "user" (id, name, email, "emailVerified") values ($1, $2, $3, $4)', [
    id,
    id,
    email,
    verified,
  ]);
  await pg.query(
    'insert into account (id, "accountId", "providerId", "userId", "createdAt", "updatedAt") values ($1, $2, $3, $4, now(), now())',
    [`account-${id}`, id, provider, id],
  );
}
async function identity(sql: Sql, id: string): Promise<VerifiedIdentity> {
  return loadVerifiedIdentity(sql, id);
}

test("only a verified matching Google identity can claim, even with empty result tables", async () => {
  const pg = await database();
  try {
    const sql = asSql(pg);
    const invite = await createInvitation(sql, {
      email: "RIDER@EXAMPLE.COM",
      fullName: "A Rider",
      createdBy: "Admin",
    });
    await pg.query(
      "insert into horses (id, user_id, name, level, esnz_number) values ('horse', $1, 'Bella', 'Level 2', '12345')",
      [invite.userId],
    );
    await pg.query("insert into plans (horse_id, user_id, config) values ('horse', $1, '{}')", [
      invite.userId,
    ]);
    await pg.query(
      "insert into results (user_id, horse_id, client_id) values ($1, 'horse', 'result')",
      [invite.userId],
    );
    await pg.query(
      "insert into ride_notes (user_id, horse_id, client_id, body) values ($1, 'horse', 'note', 'Good work')",
      [invite.userId],
    );
    await pg.query(
      "insert into judge_sheets (user_id, horse_id, client_id) values ($1, 'horse', 'sheet')",
      [invite.userId],
    );
    assert.equal(
      verifiedGoogle({
        id: "bad",
        email: invite.email,
        emailVerified: true,
        providers: ["credential"],
      }),
      false,
    );
    await user(pg, "password", "password@example.com", "credential", true);
    assert.equal(await claimInvitation(sql, await identity(sql, "password")), null);
    await user(pg, "wrong", "wrong@example.com");
    assert.equal(await claimInvitation(sql, await identity(sql, "wrong")), null);
    await user(pg, "unverified", "unverified@example.com", "google", false);
    assert.equal(await claimInvitation(sql, await identity(sql, "unverified")), null);
    await user(pg, "rider", invite.email);
    assert.equal(await claimInvitation(sql, await identity(sql, "rider")), "rider");
    assert.deepEqual((await pg.query("select user_id from horses where id = 'horse'")).rows, [
      { user_id: "rider" },
    ]);
    assert.deepEqual((await pg.query("select user_id from plans where horse_id = 'horse'")).rows, [
      { user_id: "rider" },
    ]);
    assert.deepEqual((await pg.query("select user_id from results")).rows, [{ user_id: "rider" }]);
    assert.deepEqual((await pg.query("select user_id from ride_notes")).rows, [
      { user_id: "rider" },
    ]);
    assert.deepEqual((await pg.query("select user_id from judge_sheets")).rows, [
      { user_id: "rider" },
    ]);
    assert.equal(
      (
        await pg.query<{ status: string }>(
          "select status from beta_applications where user_id = 'rider'",
        )
      ).rows[0]?.status,
      "approved",
    );
    assert.equal(
      (
        await pg.query<{ n: number }>('select count(*)::int as n from "user" where id = $1', [
          invite.userId,
        ])
      ).rows[0]?.n,
      0,
    );
    await user(pg, "second", "second@example.com");
    assert.equal(await claimInvitation(sql, await identity(sql, "second")), null);
    assert.deepEqual(
      (
        await pg.query(
          "select workspace_user_id, claimed_by_user_id from rider_invitations where email = $1",
          [invite.email],
        )
      ).rows,
      [{ workspace_user_id: "rider", claimed_by_user_id: "rider" }],
    );
  } finally {
    await pg.close();
  }
});

test("existing Google rider gets approval; another prepared rider still claims separately", async () => {
  const pg = await database();
  try {
    const sql = asSql(pg);
    await user(pg, "rider", "rider@example.com");
    const invite = await createInvitation(sql, {
      email: "rider@example.com",
      fullName: "A Rider",
      createdBy: "Admin",
    });
    assert.equal(await claimInvitation(sql, await identity(sql, "rider")), null);
    assert.equal(
      (await pg.query("select status from beta_applications where user_id = 'rider'")).rows.length,
      1,
    );
    const linked = await createInvitation(sql, {
      email: "linked@example.com",
      fullName: "Linked Rider",
      createdBy: "Admin",
    });
    await user(pg, "linked", "linked@example.com");
    assert.notEqual(linked.userId, "linked");
    assert.equal(await claimInvitation(sql, await identity(sql, "linked")), "linked");
    assert.equal(invite.userId, "rider");
  } finally {
    await pg.close();
  }
});

test("admin preparation rejects duplicates and password-only existing identities", async () => {
  const pg = await database();
  try {
    const sql = asSql(pg);
    const made = await createInvitation(sql, {
      email: "rider@example.com",
      fullName: "A Rider",
      createdBy: "Admin",
    });
    await assert.rejects(
      createInvitation(sql, { email: "rider@example.com", fullName: "Other", createdBy: "Admin" }),
      /already|prepared|duplicate/i,
    );
    assert.equal(
      (
        await pg.query<{ status: string }>(
          "select status from beta_applications where user_id = $1",
          [made.userId],
        )
      ).rows[0]?.status,
      "approved",
    );
    await user(pg, "existing", "existing@example.com", "credential", true);
    await assert.rejects(
      createInvitation(sql, {
        email: "existing@example.com",
        fullName: "Existing",
        createdBy: "Admin",
      }),
      /Google/,
    );
  } finally {
    await pg.close();
  }
});

test("admin horses and tests survive preparation and the verified claim", async () => {
  const pg = await database();
  try {
    const sql = asSql(pg);
    const { generatePlan, sanitisePlanConfig } = await import("./plan-builder.ts");
    const config = sanitisePlanConfig(
      { horseName: "Bella", level: "Level 2", tests: ["2A", "3A"], shows: [], goals: [] },
      { horseName: "Bella", level: "Level 2" },
    );
    const invite = await prepareRiderWorkspace(sql, {
      email: "rider@example.com",
      fullName: "A Rider",
      createdBy: "Admin",
      applicationHorses: [{ name: "Bella", level: "Level 2", esnzNumber: "123456", notes: "" }],
      horses: [
        {
          name: "Bella",
          level: "Level 2",
          esnzNumber: "123456",
          config,
          plan: generatePlan(config),
        },
      ],
    });
    await user(pg, "rider", invite.email);
    assert.equal(await claimInvitation(sql, await identity(sql, "rider")), "rider");
    const horse = (
      await pg.query<{ name: string; esnz_number: string }>(
        "select name, esnz_number from horses where user_id = 'rider'",
      )
    ).rows[0];
    assert.equal(horse?.name, "Bella");
    assert.equal(horse?.esnz_number, "123456");
    assert.deepEqual(
      (
        await pg.query<{ tests: string[] }>(
          "select plan->'tests' as tests from plans where user_id = 'rider'",
        )
      ).rows[0]?.tests,
      ["2A", "3A"],
    );
  } finally {
    await pg.close();
  }
});

test("a second Google account cannot claim after the matching account", async () => {
  const pg = await database();
  try {
    const sql = asSql(pg);
    const invite = await createInvitation(sql, {
      email: "rider@example.com",
      fullName: "A Rider",
      createdBy: "Admin",
    });
    await user(pg, "rider-a", invite.email);
    await user(pg, "rider-b", "rider-b@example.com");
    assert.equal(await claimInvitation(sql, await identity(sql, "rider-a")), "rider-a");
    assert.equal(await claimInvitation(sql, await identity(sql, "rider-b")), null);
    const owner = await pg.query<{ claimed_by_user_id: string }>(
      "select claimed_by_user_id from rider_invitations where email = $1",
      [invite.email],
    );
    assert.equal(owner.rows[0]?.claimed_by_user_id, "rider-a");
  } finally {
    await pg.close();
  }
});
