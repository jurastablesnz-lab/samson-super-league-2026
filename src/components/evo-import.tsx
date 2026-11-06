import { useState } from "react";
import { parseEvoResultsCsv, type EvoParseResult } from "@/lib/evo-csv";
import { importEvoResults } from "@/lib/rider";
import type { EvoImportResult } from "@/lib/rider-types";
import { cn } from "@/lib/utils";
import { Kicker, Panel } from "./beta-ui";

/** Admin: upload an EVO Events results CSV, preview the matches, then save. */
export function EvoImportPanel() {
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<EvoParseResult | null>(null);
  const [preview, setPreview] = useState<EvoImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(f: File) {
    setError(null);
    setPreview(null);
    setFileName(f.name);
    if (f.size > 5 * 1024 * 1024)
      return setError("That file is over 5 MB — export one event at a time.");
    const text = await f.text();
    const p = parseEvoResultsCsv(text);
    setParsed(p);
    if (!p.rows.length) return;
    await run(p, true, f.name);
  }

  async function run(p: EvoParseResult, dryRun: boolean, name = fileName) {
    setBusy(true);
    setError(null);
    try {
      setPreview(await importEvoResults({ data: { fileName: name, rows: p.rows, dryRun } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="mt-5 space-y-3">
      <Kicker>Import results · EVO Events CSV</Kicker>
      <p className="text-sm text-muted">
        Download the results CSV for an event from EVO Events and drop it here. Rows are matched to
        beta riders’ horses by ESNZ number, then horse + rider name. Other competitors in the file
        are ignored. You’ll see a preview before anything is saved. Matched scores are sent to
        riders for review — they choose which to keep. Re-importing the same file won’t re-suggest
        scores that are pending, kept or rejected.
      </p>
      <label className="block cursor-pointer rounded-lg border border-dashed border-line px-3 py-3 text-center text-sm font-semibold text-ink-soft">
        {fileName ? `${fileName} — choose another` : "Choose a CSV file"}
        <input
          type="file"
          accept=".csv,text/csv,text/plain,.txt,.tsv"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = "";
          }}
        />
      </label>
      {parsed && (
        <div className="text-xs text-muted">
          <p>
            {parsed.rows.length} result rows · delimiter “
            {parsed.delimiter === "\t" ? "tab" : parsed.delimiter}” · columns:{" "}
            {Object.entries(parsed.mapping)
              .map(([h, f]) => `${h} → ${f}`)
              .join(", ") || "none recognised"}
          </p>
          {parsed.warnings.map((w) => (
            <p key={w} className="text-warn">
              {w}
            </p>
          ))}
        </div>
      )}
      {error && <p className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-danger">{error}</p>}
      {preview && (
        <div className="space-y-2">
          <p className="text-sm">
            <span className="font-semibold">{preview.matched}</span> of {preview.total} rows match a
            beta horse
            {!preview.dryRun && (
              <>
                {" "}
                ·{" "}
                <span className="font-semibold text-accent">
                  {preview.inserted} sent for review
                </span>
                {preview.duplicates ? ` · ${preview.duplicates} already imported` : ""}
              </>
            )}
          </p>
          <div className="max-h-80 overflow-auto rounded-lg border border-line">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-surface text-faint">
                <tr>
                  <th className="p-2">Line</th>
                  <th className="p-2">Rider</th>
                  <th className="p-2">Horse</th>
                  <th className="p-2">%</th>
                  <th className="p-2">Match</th>
                </tr>
              </thead>
              <tbody>
                {[...preview.rows]
                  .sort((a, b) => Number(!!b.match) - Number(!!a.match))
                  .map((r) => (
                    <tr
                      key={r.line}
                      className={cn("border-t border-line", !r.match && "text-faint")}
                    >
                      <td className="p-2">{r.line}</td>
                      <td className="p-2">{r.rider}</td>
                      <td className="p-2">
                        {r.horse}
                        {r.esnz && <span className="text-faint"> · {r.esnz}</span>}
                      </td>
                      <td className="p-2">{r.percent ?? "—"}</td>
                      <td className="p-2">
                        {r.match ? (
                          <span className="text-accent">
                            {r.match.horseName} ({r.match.riderName || "rider"}) · by {r.match.by}
                            {r.duplicate
                              ? " · already reviewed or waiting"
                              : " · sent to rider for review"}
                          </span>
                        ) : (
                          r.reason
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {preview.dryRun && preview.matched > 0 && parsed && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(parsed, false)}
              className="w-full cursor-pointer rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-fg disabled:opacity-60"
            >
              {busy
                ? "Sending…"
                : `Send ${preview.matched} matched result${preview.matched === 1 ? "" : "s"} to riders for review`}
            </button>
          )}
        </div>
      )}
    </Panel>
  );
}
