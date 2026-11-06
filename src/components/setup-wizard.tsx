import { useMemo, useState } from "react";
import { Check, Music, Plus, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { COMPETITION_LEVELS, MAX_HORSES } from "@/lib/beta";
import { putMediaBlob } from "@/lib/media-db";
import {
  GOALS,
  describeWhen,
  type FreestyleRef,
  type GoalId,
  type PlanConfig,
  type TargetShow,
} from "@/lib/plan-builder";
import { saveSetup } from "@/lib/rider";
import { isPublishedTest, testsForLevelPublished } from "@/lib/test-registry";
import type { Workspace } from "@/lib/rider-types";
import { SHOWS, TODAY, iso } from "@/lib/season";
import { cn } from "@/lib/utils";
import { Field, inputCls, Kicker, Panel, PrimaryButton, Title } from "./beta-ui";

export type WizardHorse = {
  id?: string;
  name: string;
  level: string;
  esnzNumber: string;
  notes: string;
  tests: string[];
  shows: TargetShow[];
  goals: GoalId[];
  goalNote: string;
  freestyle: FreestyleRef | null;
};

/** Public show calendar offered in the wizard (dates only — confirm on EVO Events). */
export const CALENDAR_SHOWS: TargetShow[] = SHOWS.map((s) => ({
  id: `cal-${s.id}`,
  name: s.short === "Nationals" ? "Dressage Nationals" : `${s.short} Premier League`,
  start: s.start,
  end: s.end,
  venue: s.venue,
  source: "calendar" as const,
  entriesClose: s.entriesClose,
}));

const isFreestyle = (t: string) => /freestyle|mfs/i.test(t);

export function wizardHorsesFrom(ws: Workspace): WizardHorse[] {
  const own = ws.horses.filter((h) => !h.isLegacySamson);
  if (own.length) {
    return own.map((h) => {
      const c = ws.plans[h.id]?.config as Partial<PlanConfig> | undefined;
      return {
        id: h.id,
        name: h.name,
        level: h.level,
        esnzNumber: h.esnzNumber,
        notes: h.notes,
        tests: (c?.tests ?? []).filter(
          (test) => ws.isOwner || isPublishedTest(test, ws.approvedTestIds),
        ),
        shows: c?.shows ?? [],
        goals: c?.goals ?? [],
        goalNote: c?.goalNote ?? "",
        freestyle: c?.freestyle ?? ws.plans[h.id]?.freestyle ?? null,
      };
    });
  }
  const fromApp = ws.applicationHorses.length ? ws.applicationHorses : [{ name: "", level: "", notes: "", esnzNumber: "" }];
  return fromApp.map((h) => ({
    name: h.name,
    level: (COMPETITION_LEVELS as readonly string[]).includes(h.level) ? h.level : "",
    esnzNumber: h.esnzNumber ?? "",
    notes: h.notes,
    tests: [],
    shows: [],
    goals: [],
    goalNote: "",
    freestyle: null,
  }));
}

type Step = { kind: "horses" } | { kind: "tests" | "shows" | "goals"; i: number } | { kind: "review" };

export function SetupWizard({
  workspace,
  onDone,
  onCancel,
}: {
  workspace: Workspace;
  onDone: (ws: Workspace) => void;
  onCancel?: () => void;
}) {
  const [horses, setHorses] = useState<WizardHorse[]>(() => wizardHorsesFrom(workspace));
  const [stepIdx, setStepIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const steps: Step[] = useMemo(
    () => [
      { kind: "horses" },
      ...horses.flatMap((_, i) => [
        { kind: "tests" as const, i },
        { kind: "shows" as const, i },
        { kind: "goals" as const, i },
      ]),
      { kind: "review" },
    ],
    [horses],
  );
  const step = steps[Math.min(stepIdx, steps.length - 1)];
  const update = (i: number, patch: Partial<WizardHorse>) =>
    setHorses((list) => list.map((h, j) => (j === i ? { ...h, ...patch } : h)));

  function next() {
    setError(null);
    if (step.kind === "horses") {
      if (horses.some((h) => !h.name.trim())) return setError("Every horse needs a name.");
      if (horses.some((h) => !h.level)) return setError("Pick a level for each horse.");
    }
    if (step.kind === "tests") {
      const chosen = horses[step.i].tests.filter(
        (test) => workspace.isOwner || isPublishedTest(test, workspace.approvedTestIds),
      );
      if (chosen.length === 0) return setError("Pick at least one published test.");
      if (chosen.length !== horses[step.i].tests.length) update(step.i, { tests: chosen });
    }
    setStepIdx((n) => Math.min(steps.length - 1, n + 1));
    window.scrollTo({ top: 0 });
  }

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      const ws = await saveSetup({
        data: {
          archiveMissing: true,
          horses: horses.map((h) => ({
            id: h.id,
            name: h.name.trim(),
            level: h.level,
            esnzNumber: h.esnzNumber.trim(),
            notes: h.notes,
            config: {
              horseName: h.name.trim(),
              level: h.level,
              tests: h.tests,
              shows: h.shows,
              goals: h.goals,
              goalNote: h.goalNote,
              freestyle: h.freestyle,
            },
          })),
        },
      });
      onDone(ws);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const h = "i" in step ? horses[step.i] : null;
  const progress = Math.round(((stepIdx + 1) / steps.length) * 100);

  return (
    <div className="space-y-4" data-testid="setup-wizard">
      <div>
        <Kicker>Set up your season · step {stepIdx + 1} of {steps.length}</Kicker>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken">
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {step.kind === "horses" && (
        <>
          <Title>Your horses</Title>
          <p className="text-sm leading-relaxed text-muted">
            We’ve brought these across from your application. Check the names and levels — each horse gets its own
            season plan.
          </p>
          {horses.map((x, i) => (
            <Panel key={i} className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Horse {i + 1}</p>
                {horses.length > 1 && (
                  <button
                    type="button"
                    className="cursor-pointer text-xs font-semibold text-muted hover:text-danger"
                    onClick={() => setHorses((l) => l.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                )}
              </div>
              <Field label="Horse name" hint="Use the registered name, exactly as it appears on EVO Events, so your results can be matched.">
                <input className={inputCls} value={x.name} onChange={(e) => update(i, { name: e.target.value })} />
              </Field>
              <Field label="Level you’re competing at this season">
                <select
                  className={inputCls}
                  value={x.level}
                  onChange={(e) => update(i, { level: e.target.value, tests: [] })}
                >
                  <option value="">Choose…</option>
                  {COMPETITION_LEVELS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </Field>
              <Field label="ESNZ registration number" optional hint="Used to match your EVO Events results.">
                <input
                  className={inputCls}
                  maxLength={20}
                  value={x.esnzNumber}
                  onChange={(e) => update(i, { esnzNumber: e.target.value })}
                />
              </Field>
            </Panel>
          ))}
          {horses.length < MAX_HORSES && (
            <button
              type="button"
              onClick={() =>
                setHorses((l) => [
                  ...l,
                  { name: "", level: "", esnzNumber: "", notes: "", tests: [], shows: [], goals: [], goalNote: "", freestyle: null },
                ])
              }
              className="w-full cursor-pointer rounded-lg border border-dashed border-accent/60 px-3 py-2.5 text-sm font-semibold text-accent"
            >
              + Add another horse
            </button>
          )}
        </>
      )}

      {step.kind === "tests" && h && (
        <TestsStep
          horse={h}
          isAdmin={workspace.isOwner}
          approvedTestIds={workspace.approvedTestIds}
          onChange={(p) => update(step.i, p)}
        />
      )}
      {step.kind === "shows" && h && <ShowsStep horse={h} onChange={(p) => update(step.i, p)} />}
      {step.kind === "goals" && h && <GoalsStep horse={h} onChange={(p) => update(step.i, p)} />}

      {step.kind === "review" && (
        <>
          <Title>Ready to build your plan</Title>
          <p className="text-sm text-muted">
            Four phases — Foundation, Consolidate, Prepare, Compete — timed around your target competitions. You can change
            any of this later from Setup.
          </p>
          {horses.map((x, i) => (
            <Panel key={i} className="space-y-2 text-sm">
              <p className="font-display text-lg font-extrabold">{x.name}</p>
              <p className="text-muted">
                {x.level} · rider grade {workspace.riderGrade}
                {x.esnzNumber && ` · ESNZ ${x.esnzNumber}`}
              </p>
              <p>
                <span className="font-semibold">Tests:</span> {x.tests.join(", ")}
              </p>
              <p>
                <span className="font-semibold">Shows:</span>{" "}
                {x.shows.length ? x.shows.map((s) => `${s.name} (${describeWhen(s)})`).join(", ") : "None yet — a 16-week development block"}
              </p>
              <p>
                <span className="font-semibold">Goals:</span>{" "}
                {x.goals.length ? x.goals.map((g) => GOALS.find((o) => o.id === g)?.label).join(", ") : "—"}
              </p>
              {x.freestyle && (
                <p>
                  <span className="font-semibold">Freestyle music:</span> {x.freestyle.fileName}
                </p>
              )}
            </Panel>
          ))}
        </>
      )}

      {error && (
        <p className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        {stepIdx > 0 ? (
          <button
            type="button"
            className="cursor-pointer rounded-lg border border-line px-4 py-3 text-sm font-semibold text-ink-soft"
            onClick={() => setStepIdx((n) => Math.max(0, n - 1))}
          >
            Back
          </button>
        ) : (
          onCancel && (
            <button
              type="button"
              className="cursor-pointer rounded-lg border border-line px-4 py-3 text-sm font-semibold text-ink-soft"
              onClick={onCancel}
            >
              Cancel
            </button>
          )
        )}
        {step.kind === "review" ? (
          <PrimaryButton type="button" disabled={busy} onClick={() => void finish()}>
            {busy ? "Building your plan…" : horses.length > 1 ? "Generate my plans" : "Generate my plan"}
          </PrimaryButton>
        ) : (
          <PrimaryButton type="button" onClick={next}>
            Next
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}

function Chip({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-semibold",
        on ? "border-accent bg-accent/15 text-accent" : "border-line bg-sunken text-ink-soft",
      )}
    >
      <span className={cn("grid size-5 shrink-0 place-items-center rounded border", on ? "border-accent bg-accent text-accent-fg" : "border-line")}>
        {on && <Check className="size-3.5" />}
      </span>
      <span className="min-w-0">{children}</span>
    </button>
  );
}

function TestsStep({
  horse,
  isAdmin,
  approvedTestIds,
  onChange,
}: {
  horse: WizardHorse;
  isAdmin: boolean;
  approvedTestIds: string[];
  onChange: (p: Partial<WizardHorse>) => void;
}) {
  const [custom, setCustom] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const options = testsForLevelPublished(horse.level, approvedTestIds, isAdmin);
  const selected = horse.tests.filter((test) => isAdmin || isPublishedTest(test, approvedTestIds));
  const toggle = (t: string) =>
    onChange({ tests: horse.tests.includes(t) ? horse.tests.filter((x) => x !== t) : [...horse.tests, t] });
  return (
    <>
      <Title>{horse.name}: tests to load</Title>
      <p className="text-sm text-muted">
        Select the tests you want in your pocket at {horse.level || "this level"}. Also want access to tests a level above
        or below for this horse? Add them in the “Another test” field below.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((t) => (
          <Chip key={t} on={selected.includes(t)} onClick={() => toggle(t)}>
            {t}
            {isAdmin && !isPublishedTest(t, approvedTestIds) && (
              <span className="ml-1 text-xs font-normal text-warn">· Draft</span>
            )}
            {selected.indexOf(t) === 0 && <span className="ml-1 text-xs font-normal">· main</span>}
            {selected.indexOf(t) === 1 && <span className="ml-1 text-xs font-normal">· homework</span>}
          </Chip>
        ))}
      </div>
      {options.length === 0 && (
        <p className="text-sm text-muted">No published tests for this level yet.</p>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const t = custom.trim();
          setCustomError(null);
          if (!t) return;
          if (!isAdmin && !isPublishedTest(t, approvedTestIds)) {
            setCustomError("That test is not published yet.");
            return;
          }
          if (!horse.tests.includes(t)) onChange({ tests: [...horse.tests, t] });
          setCustom("");
        }}
      >
        <input className={inputCls} placeholder="Another test (type its name)" value={custom} onChange={(e) => setCustom(e.target.value)} />
        <button type="submit" className="cursor-pointer rounded-lg border border-line px-3 text-sm font-semibold" aria-label="Add test">
          <Plus className="size-4" />
        </button>
      </form>
      {customError && <p className="text-sm text-danger">{customError}</p>}
    </>
  );
}

function ShowsStep({ horse, onChange }: { horse: WizardHorse; onChange: (p: Partial<WizardHorse>) => void }) {
  const today = iso(TODAY);
  const upcoming = CALENDAR_SHOWS.filter((s) => s.end >= today);
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [travel, setTravel] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const picked = (id: string) => horse.shows.some((s) => s.id === id);
  const toggle = (s: TargetShow) =>
    onChange({ shows: picked(s.id) ? horse.shows.filter((x) => x.id !== s.id) : [...horse.shows, s] });
  const customs = horse.shows.filter((s) => s.source !== "calendar");
  return (
    <>
      <Title>{horse.name}: target competitions</Title>
      <p className="text-sm text-muted">
        Tick the competitions you’re aiming at. The plan times its phases around them — the last one is the main target.
        Dates follow the usual calendar; always confirm on EVO Events.
      </p>
      <Panel className="space-y-2">
        <Kicker>North Island Premier League calendar</Kicker>
        {upcoming.map((s) => (
          <Chip key={s.id} on={picked(s.id)} onClick={() => toggle(s)}>
            {s.name}
            <span className="block text-xs font-normal text-muted">
              {describeWhen(s)} · {s.venue}
            </span>
          </Chip>
        ))}
        {upcoming.length === 0 && <p className="text-sm text-muted">No upcoming calendar competitions — add your own below.</p>}
      </Panel>
      <Panel className="space-y-3">
        <Kicker>Your own competitions</Kicker>
        <p className="text-sm text-muted">
          Find upcoming dressage competitions on{" "}
          <a
            className="font-semibold text-accent underline"
            href="https://www.evoevents.co.nz/?sport=1&country=1&discipline=1&view=list"
            target="_blank"
            rel="noopener noreferrer"
          >
            EVO Events
          </a>
          , then add the ones you’re aiming at below.
        </p>
        {dateError && <p className="text-sm text-danger" role="alert">{dateError}</p>}
        {customs.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg bg-bg px-3 py-2 text-sm">
            <span>
              <span className="font-semibold">{s.name}</span> · {describeWhen(s)}
              {s.travel && " · travel day"}
            </span>
            <button
              type="button"
              aria-label={`Remove ${s.name}`}
              className="cursor-pointer text-muted hover:text-danger"
              onClick={() => onChange({ shows: horse.shows.filter((x) => x.id !== s.id) })}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <Field label="Show name">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Area Champs" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="First day">
            <input className={inputCls} type="date" value={start} min={today} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Last day" optional>
            <input className={inputCls} type="date" value={end} min={start || today} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" className="size-4" checked={travel} onChange={(e) => setTravel(e.target.checked)} />
          Long trip — add a travel day before
        </label>
        <button
          type="button"
          disabled={!name.trim() || !start}
          onClick={() => {
            if (start < today) return setDateError("Choose a start date from today onwards.");
            if (end && end < start) return setDateError("The finish date must be on or after the start date.");
            setDateError(null);
            onChange({
              shows: [
                ...horse.shows,
                { id: `own-${Date.now()}`, name: name.trim(), start, end: end || start, travel, source: "custom" },
              ],
            });
            setName("");
            setStart("");
            setEnd("");
            setTravel(false);
          }}
          className="w-full cursor-pointer rounded-lg border border-dashed border-accent/60 px-3 py-2.5 text-sm font-semibold text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Add this show
        </button>
      </Panel>
    </>
  );
}

function GoalsStep({ horse, onChange }: { horse: WizardHorse; onChange: (p: Partial<WizardHorse>) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const wantsFreestyle = horse.goals.includes("freestyle") || horse.tests.some(isFreestyle);
  const toggle = (g: GoalId) =>
    onChange({ goals: horse.goals.includes(g) ? horse.goals.filter((x) => x !== g) : [...horse.goals, g] });

  async function upload(file: File) {
    setErr(null);
    if (!file.type.startsWith("audio/") && !/\.(mp3|m4a|wav|aac|ogg)$/i.test(file.name)) {
      return setErr("That doesn’t look like an audio file.");
    }
    if (file.size > 60 * 1024 * 1024) return setErr("Keep the file under 60 MB.");
    setBusy(true);
    try {
      const mediaId = `freestyle-${globalThis.crypto.randomUUID()}`;
      await putMediaBlob(mediaId, file);
      const durationSec = await new Promise<number | null>((resolve) => {
        const url = URL.createObjectURL(file);
        const a = new Audio();
        a.preload = "metadata";
        a.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          resolve(Number.isFinite(a.duration) ? Math.round(a.duration * 10) / 10 : null);
        };
        a.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        a.src = url;
      });
      onChange({
        freestyle: {
          mediaId,
          fileName: file.name,
          mime: file.type || "audio/mpeg",
          size: file.size,
          durationSec,
          storedOn: "device",
          uploadedAt: new Date().toISOString(),
        },
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Title>{horse.name}: goals</Title>
      <p className="text-sm text-muted">What would make this a good season? Pick as many as fit.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {GOALS.map((g) => (
          <Chip key={g.id} on={horse.goals.includes(g.id)} onClick={() => toggle(g.id)}>
            {g.label}
            <span className="block text-xs font-normal text-muted">{g.hint}</span>
          </Chip>
        ))}
      </div>
      <Field label="Anything else?" optional>
        <textarea
          className={inputCls}
          rows={2}
          value={horse.goalNote}
          onChange={(e) => onChange({ goalNote: e.target.value })}
          placeholder="e.g. Qualify for Nationals at Level 3, a 65% at Taupō…"
        />
      </Field>
      <Panel className="space-y-2">
        <div className="flex items-center gap-2">
          <Music className="size-4 text-accent" />
          <p className="text-sm font-semibold">Freestyle music {wantsFreestyle ? "" : "(optional)"}</p>
        </div>
        <p className="text-xs text-muted">
          Upload your freestyle track to practise with in the app. The file stays on this device; we save its name and
          length with your plan.
        </p>
        {horse.freestyle ? (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-bg px-3 py-2 text-sm">
            <span className="min-w-0 truncate">
              {horse.freestyle.fileName}
              {horse.freestyle.durationSec ? ` · ${fmtDuration(horse.freestyle.durationSec)}` : ""}
            </span>
            <button type="button" className="cursor-pointer text-xs font-semibold text-muted hover:text-danger" onClick={() => onChange({ freestyle: null })}>
              Remove
            </button>
          </div>
        ) : (
          <label className="block cursor-pointer rounded-lg border border-dashed border-line px-3 py-3 text-center text-sm font-semibold text-ink-soft">
            {busy ? "Saving…" : "Choose an audio file"}
            <input
              type="file"
              accept="audio/*,.mp3,.m4a,.wav"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = "";
              }}
            />
          </label>
        )}
        {err && <p className="text-xs text-danger">{err}</p>}
      </Panel>
    </>
  );
}

export function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function fmtDay(d: string) {
  return d ? format(parseISO(d), "d MMM yyyy") : "";
}
