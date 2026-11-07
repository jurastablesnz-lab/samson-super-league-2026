import { useState } from "react";
import { loadBetaResults } from "@/lib/seed-actions";
import type { SeedImportReport, SeedUnmatchedRow } from "@/lib/seed-results";
import { Kicker, Panel, PrimaryButton } from "./beta-ui";

function groupUnmatched(rows: SeedUnmatchedRow[]) {
  const grouped = new Map<string, { horse: string; esnz: string; reason: string; count: number }>();
  for (const row of rows) {
    const key = `${row.esnz}|${row.horse}|${row.reason}`;
    const current = grouped.get(key) ?? {
      horse: row.horse,
      esnz: row.esnz,
      reason: row.reason,
      count: 0,
    };
    current.count += 1;
    grouped.set(key, current);
  }
  return [...grouped.values()];
}

/** Admin: load the shipped beta results. Horses match on ESNZ number only. */
export function SeedResultsPanel() {
  const [report, setReport] = useState<SeedImportReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      setReport(await loadBetaResults());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const unmatched = report ? groupUnmatched(report.unmatchedRows) : [];
  return (
    <Panel className="mt-5 space-y-3">
      <Kicker>Beta results</Kicker>
      <h2 className="font-display text-xl font-medium">Load the shipped results</h2>
      <p className="text-sm text-muted">
        One tap loads the results file shipped with this app for Susan, Nicole and Shelley. Horses
        are matched by ESNZ number only. Rows already kept, waiting for review, or marked not mine
        are skipped. New scores are saved on the horse and show in that rider’s plan. This does not
        sign in to EVO Events.
      </p>
      <PrimaryButton type="button" disabled={busy} onClick={() => void load()}>
        {busy ? "Loading…" : "Load beta results"}
      </PrimaryButton>
      {error && <p className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-danger">{error}</p>}
      {report && (
        <div className="space-y-2 text-sm">
          <p>
            <span className="font-semibold text-accent">{report.imported} imported</span>
            {" · "}
            <span className="font-semibold">{report.skipped} skipped</span>
            {" · "}
            <span className="font-semibold">{report.unmatched} unmatched</span>
            <span className="text-muted"> · {report.total} rows in the file</span>
          </p>
          {unmatched.length > 0 && (
            <ul className="max-h-60 space-y-1 overflow-auto rounded-lg border border-line p-2 text-xs">
              {unmatched.map((row) => (
                <li key={`${row.esnz}-${row.horse}-${row.reason}`}>
                  <span className="font-semibold">{row.horse || "Unknown horse"}</span>
                  {row.esnz ? ` · ESNZ ${row.esnz}` : ""} · {row.reason} · {row.count}{" "}
                  {row.count === 1 ? "row" : "rows"}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Panel>
  );
}
