/**
 * Publication gate for the test registry. Riders only receive tests with a row
 * in test_approvals. Admins (Google sign-in) may approve or unapprove.
 */
import type { Sql } from "./db.ts";
import { isVerifiedAdmin, requireVerifiedAdmin } from "./admin-user.server.ts";
import { catalogTests, testIdForName } from "./test-registry.ts";

export type TestApproval = { testId: string; approvedBy: string; approvedAt: string };

export async function listTestApprovals(sql: Sql): Promise<TestApproval[]> {
  const rows = await sql<{
    test_id: string;
    approved_by: string;
    approved_at: string | Date;
  }>`select test_id, approved_by, approved_at from test_approvals order by test_id`;
  return rows.map((row) => ({
    testId: row.test_id,
    approvedBy: row.approved_by,
    approvedAt: new Date(row.approved_at).toISOString(),
  }));
}

export async function publishedTestIds(sql: Sql): Promise<string[]> {
  return (await listTestApprovals(sql)).map((row) => row.testId);
}

/**
 * A non-admin horse can only be given a published test. An admin's own horse
 * may still carry a draft.
 */
export async function assertTestsAssignable(sql: Sql, horseUserId: string, names: string[]) {
  if (await isVerifiedAdmin(horseUserId, sql)) return;
  const approved = new Set(await publishedTestIds(sql));
  for (const name of names) {
    if (!approved.has(testIdForName(name))) throw new Error("That test is not published yet");
  }
}

export async function setTestApproval(sql: Sql, adminId: string, testId: string, approved: boolean) {
  const admin = await requireVerifiedAdmin(adminId, sql);
  const id = testId.trim().slice(0, 80);
  if (!catalogTests().some((test) => test.id === id)) throw new Error("Unknown test");
  if (approved) {
    await sql`insert into test_approvals (test_id, approved_by, approved_at)
      values (${id}, ${admin.id}, now())
      on conflict (test_id) do update set approved_by = excluded.approved_by, approved_at = now()`;
  } else {
    await sql`delete from test_approvals where test_id = ${id}`;
  }
  return publishedTestIds(sql);
}
