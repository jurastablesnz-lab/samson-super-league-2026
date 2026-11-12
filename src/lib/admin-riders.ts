import type { BetaStatus } from "./beta";
import type { GeneratedPlan, TargetShow } from "./plan-builder";
import type { Sql } from "./db";
import { phaseIn } from "./season.ts";

import { testsForPlan } from "./admin-rider-rules.ts";

export type AdminRiderHorse = {
  id: string;
  name: string;
  esnzNumber: string;
  paddockName: string;
  level: string;
  tests: { name: string; nameOnly: boolean }[];
  shows: TargetShow[];
  keptEvo: number;
  pendingEvo: number;
  rejectedEvo: number;
  otherScores: number;
  bestPercent: number | null;
  phase: string;
  problems: string[];
};
export type AdminRider = {
  userId: string;
  name: string;
  accountName: string;
  email: string;
  applicationStatus: BetaStatus | "invited";
  lastActiveAt: string | null;
  horses: AdminRiderHorse[];
  prepared: boolean;
};

type Row = {
  user_id: string;
  display_name: string;
  email: string | null;
  name: string | null;
  status: string | null;
  last_active_at: string | Date | null;
  updated_at: string | Date | null;
  horse_id: string | null;
  horse_name: string | null;
  esnz_number: string | null;
  paddock_name: string | null;
  level: string | null;
  plan: unknown;
  horse_updated_at: string | Date | null;
  config: unknown;
  kept: number;
  pending: number;
  rejected: number;
  others: number;
  best: number | string | null;
  invite_email: string | null;
  claimed_at: string | Date | null;
};

/** Read-only aggregate for admins. There are no mutation endpoints here. */
export async function loadAdminRiders(sql: Sql): Promise<AdminRider[]> {
  const rows = await sql<Row>`select r.user_id, r.display_name, u.email, u.name, b.status,
    r.last_active_at, r.updated_at, h.id as horse_id, h.name as horse_name, h.paddock_name, h.esnz_number, h.level,
    p.plan, p.config, greatest(h.updated_at, coalesce(p.updated_at, h.updated_at)) as horse_updated_at, coalesce(sc.kept, 0) as kept, coalesce(sc.pending, 0) as pending,
    coalesce(sc.rejected, 0) as rejected, coalesce(sc.others, 0) as others, sc.best,
    i.email as invite_email, i.claimed_at
    from riders r
    join "user" u on u.id = r.user_id
    left join beta_applications b on b.user_id = r.user_id
    left join rider_invitations i on i.workspace_user_id = r.user_id
    left join horses h on h.user_id = r.user_id and not h.archived
    left join plans p on p.horse_id = h.id and p.user_id = r.user_id
    left join (select horse_id, user_id,
      count(*) filter (where source = 'evo_csv' and review_status = 'kept') as kept,
      count(*) filter (where source = 'evo_csv' and review_status = 'pending') as pending,
      count(*) filter (where source = 'evo_csv' and review_status = 'rejected') as rejected,
      count(*) filter (where source <> 'evo_csv' and review_status = 'kept') as others,
      max(percent) filter (where review_status = 'kept' and status = 'ok') as best
      from results group by horse_id, user_id) sc on sc.horse_id = h.id and sc.user_id = r.user_id
    order by coalesce(r.last_active_at, r.updated_at, greatest(h.updated_at, p.updated_at)) desc, r.display_name, h.sort_order`;
  const riders = new Map<string, AdminRider>();
  for (const row of rows) {
    let rider = riders.get(row.user_id);
    if (!rider) {
      rider = {
        userId: row.user_id,
        name: row.display_name || row.name || row.email || "Rider",
        accountName: row.name ?? "",
        email: row.invite_email ?? row.email ?? "",
        applicationStatus: (row.status as AdminRider["applicationStatus"] | null) ?? "invited",
        lastActiveAt: new Date(
          Math.max(
            ...[row.last_active_at, row.updated_at, row.horse_updated_at]
              .filter((v) => v != null)
              .map((v) => new Date(v!).getTime()),
            0,
          ),
        ).toISOString(),
        horses: [],
        prepared: !!row.invite_email && !row.claimed_at,
      };
      riders.set(row.user_id, rider);
    }
    if (!row.horse_id) continue;
    let data: unknown = row.plan ?? {};
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        data = {};
      }
    }
    const plan = data as Partial<GeneratedPlan>;
    const phases = plan.phases ?? [];
    const phase = phases.length ? phaseIn(phases, "2026-11-06").name : "Wizard not finished";
    const names = testsForPlan(plan.tests ?? []);
    const problems: string[] = [];
    if (!row.esnz_number?.trim()) problems.push("No ESNZ number");
    if (!names.length) problems.push("No tests chosen");
    if (names.some((t) => t.nameOnly))
      problems.push("Some tests are name only — movement data not loaded");
    if (Number(row.pending) > 0)
      problems.push(
        `${Number(row.pending)} EVO score${Number(row.pending) === 1 ? "" : "s"} waiting for review`,
      );
    rider.horses.push({
      id: row.horse_id,
      name: row.horse_name ?? "",
      esnzNumber: row.esnz_number ?? "",
      paddockName: row.paddock_name ?? "",
      level: row.level ?? plan.level ?? "",
      tests: names,
      shows: plan.shows ?? [],
      keptEvo: Number(row.kept),
      pendingEvo: Number(row.pending),
      rejectedEvo: Number(row.rejected),
      otherScores: Number(row.others),
      bestPercent: row.best == null ? null : Number(row.best),
      phase,
      problems,
    });
  }
  return [...riders.values()];
}
