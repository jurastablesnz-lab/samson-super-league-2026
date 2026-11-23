import { useCallback, useEffect, useState } from "react";
import { decideCoachApplication, getCoachApplications } from "@/lib/coach-portal";
import type { CoachApplication } from "@/lib/coach-portal-types";
import { Kicker, Panel, StatusBadge } from "./beta-ui";

export function CoachAdmin() {
  const [rows, setRows] = useState<CoachApplication[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    getCoachApplications()
      .then(setRows)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);
  useEffect(load, [load]);
  if (error) return <p className="mt-4 text-sm text-danger">{error}</p>;
  if (!rows) return null;
  const pending = rows.filter((row) => row.status === "pending").length;
  return (
    <section className="mt-8">
      <Kicker>Coach Portal</Kicker>
      <h2 className="font-display mt-1 text-2xl font-extrabold">Coach applications</h2>
      <p className="mt-1 text-sm text-muted">
        {pending ? `${pending} waiting` : "None waiting"}. Approving a coach does not make them a rider.
      </p>
      <div className="mt-3 space-y-3">
        {rows.length === 0 && <p className="text-sm text-muted">No coach applications yet.</p>}
        {rows.map((row) => (
          <Panel key={row.userId} className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{row.displayName}</p>
                <p className="text-xs text-muted">{row.email}</p>
              </div>
              <StatusBadge status={row.status} />
            </div>
            <p className="text-sm text-ink-soft">{row.region}</p>
            <p className="whitespace-pre-line text-sm text-muted">{row.bio}</p>
            <div className="flex flex-wrap gap-2">
              {row.status !== "approved" && (
                <button type="button" className="min-h-11 cursor-pointer rounded-lg bg-accent px-3 text-sm font-bold text-accent-fg" onClick={() => void decideCoachApplication({ data: { userId: row.userId, status: "approved" } }).then(load)}>
                  Approve
                </button>
              )}
              {row.status !== "declined" && (
                <button type="button" className="min-h-11 cursor-pointer rounded-lg border border-line px-3 text-sm" onClick={() => void decideCoachApplication({ data: { userId: row.userId, status: "declined" } }).then(load)}>
                  Decline
                </button>
              )}
            </div>
          </Panel>
        ))}
      </div>
    </section>
  );
}
