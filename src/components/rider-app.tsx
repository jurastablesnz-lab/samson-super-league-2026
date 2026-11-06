import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Home,
  ImagePlus,
  Music,
  NotebookPen,
  Settings2,
  Target,
  Trash2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { compressSheetPhoto, getMediaBlob, putMediaBlob } from "@/lib/media-db";
import { describeWhen, GOALS, type GeneratedPlan } from "@/lib/plan-builder";
import {
  deleteEntry,
  getHorseLog,
  getWorkspace,
  importLocalForHorse,
  saveNote,
  saveProgress,
  saveResult,
  saveSheet,
} from "@/lib/rider";
import {
  snapshotCounts,
  snapshotFromStorage,
  snapshotIsEmpty,
  type HorseLog,
  type HorseRecord,
  type LegacySnapshot,
  type PlanRecord,
  type Workspace,
} from "@/lib/rider-types";
import { MAX_SHEET_PHOTOS } from "@/lib/review-types";
import { daysUntil, kindLabel, phaseIn, TODAY, iso, weekIn, type Kind, type Session } from "@/lib/season";
import { summariseSheet } from "@/lib/summarise-sheet";
import { cn } from "@/lib/utils";
import { BrandShell, inputCls, Kicker, Panel, PrimaryButton, Title } from "./beta-ui";
import { fmtDay, fmtDuration, SetupWizard } from "./setup-wizard";

type Tab = "today" | "season" | "tests" | "log" | "setup";
const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "today", label: "Today", icon: Home },
  { id: "season", label: "Season", icon: CalendarDays },
  { id: "tests", label: "Tests", icon: Target },
  { id: "log", label: "Log", icon: NotebookPen },
  { id: "setup", label: "Setup", icon: Settings2 },
];

function kindClass(kind: Kind) {
  switch (kind) {
    case "show":
      return "bg-fg text-accent-fg";
    case "travel":
      return "bg-ink-soft text-accent-fg";
    case "rest":
      return "bg-sunken text-muted";
    case "test":
      return "bg-accent/15 text-accent";
    default:
      return "bg-sunken text-fg";
  }
}

/** Entry point for approved riders (not the owner): workspace → wizard or plan. */
export function RiderHome({ storageKey }: { storageKey: string }) {
  const [ws, setWs] = useState<Workspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    getWorkspace()
      .then(setWs)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  if (error) {
    return (
      <BrandShell>
        <Title>Couldn’t load your plan</Title>
        <p className="mt-3 text-sm text-muted">{error}</p>
      </BrandShell>
    );
  }
  if (!ws) return <div className="vd-glow min-h-dvh" />;
  const planned = ws.horses.filter((h) => !h.isLegacySamson && ws.plans[h.id]?.plan);
  if (editing || !ws.rider.setupCompletedAt || planned.length === 0) {
    const first = !ws.rider.setupCompletedAt;
    return (
      <BrandShell>
        {first && (
          <Panel className="mb-4 space-y-1">
            <Kicker>Welcome{ws.displayName ? `, ${ws.displayName.split(" ")[0]}` : ""}</Kicker>
            <p className="text-sm text-ink-soft">
              Let’s build a season plan for your own horse{ws.applicationHorses.length > 1 ? "s" : ""}. It takes about
              two minutes. Everything you log is saved to your account, not just this device.
            </p>
          </Panel>
        )}
        <SetupWizard
          workspace={ws}
          onCancel={editing && planned.length ? () => setEditing(false) : undefined}
          onDone={(next) => {
            setWs(next);
            setEditing(false);
          }}
        />
      </BrandShell>
    );
  }
  return <RiderApp ws={ws} horses={planned} storageKey={storageKey} onEditSetup={() => setEditing(true)} />;
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5", className)}>{children}</section>;
}

function RiderApp({
  ws,
  horses,
  storageKey,
  onEditSetup,
}: {
  ws: Workspace;
  horses: HorseRecord[];
  storageKey: string;
  onEditSetup: () => void;
}) {
  const [tab, setTab] = useState<Tab>("today");
  const [horseId, setHorseId] = useState(horses[0].id);
  const horse = horses.find((h) => h.id === horseId) ?? horses[0];
  const record = ws.plans[horse.id];
  const plan = record.plan as GeneratedPlan;
  const [log, setLog] = useState<HorseLog | null>(null);
  const [logError, setLogError] = useState<string | null>(null);

  const reload = useCallback(() => {
    getHorseLog({ data: { horseId: horse.id } })
      .then((l) => {
        setLog(l);
        setLogError(null);
      })
      .catch((e: unknown) => setLogError(e instanceof Error ? e.message : String(e)));
  }, [horse.id]);
  useEffect(() => {
    setLog(null);
    reload();
  }, [reload]);

  const phase = phaseIn(plan.phases, TODAY);

  return (
    <div className="vd-glow min-h-dvh text-fg">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 pb-36 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <div className="mb-3 flex items-center gap-2.5">
          <img src="/brand/vdnz-icon.svg" alt="XSalute by Virtual Dressage NZ" className="size-9 rounded-[10px] ring-1 ring-accent/30" />
          <div className="leading-tight">
            <p className="font-display text-[15px] font-extrabold tracking-[-0.02em] text-fg">
              <span className="text-accent">X</span>Salute{" "}
              <span className="text-[10px] font-semibold tracking-normal text-muted">by Virtual Dressage NZ</span>
            </p>
            <p className="text-[9.5px] font-semibold tracking-[0.22em] text-muted">PLAN · TRAIN · COMPETE · REFLECT</p>
          </div>
        </div>
        {horses.length > 1 && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Horse">
            {horses.map((h) => (
              <button
                key={h.id}
                type="button"
                role="tab"
                aria-selected={h.id === horse.id}
                onClick={() => setHorseId(h.id)}
                className={cn(
                  "shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold",
                  h.id === horse.id ? "border-accent bg-accent/15 text-accent" : "border-line text-muted",
                )}
              >
                {h.name}
              </button>
            ))}
          </div>
        )}
        <header className="mb-4 flex items-end justify-between gap-3">
          <div>
            <Kicker>{horse.level || plan.level} season</Kicker>
            <h1 className="font-display mt-1 text-[1.65rem] leading-[1.05] font-extrabold tracking-[-0.03em] text-fg sm:text-[2rem]">
              {horse.name}’s Training Plan
            </h1>
            <p className="mt-1 text-sm text-muted">
              Main test {plan.mainTest}
              {plan.homeworkTest !== plan.mainTest ? ` · homework ${plan.homeworkTest}` : ""}
            </p>
            {horse.esnzNumber && <p className="mt-0.5 text-xs text-faint">ESNZ {horse.esnzNumber}</p>}
          </div>
          <span className="mb-1 inline-flex rounded-full bg-accent px-3 py-1 text-[11px] font-semibold tracking-wide text-accent-fg uppercase">
            {phase.name}
          </span>
        </header>
        <LocalImportBanner storageKey={storageKey} horse={horse} onImported={setLog} />
        {logError && <p className="mb-3 rounded-lg bg-danger/15 px-3 py-2 text-sm text-danger">{logError}</p>}
        {tab === "today" && <TodayTab key={`today-${horse.id}`} plan={plan} record={record} log={log} horse={horse} onTab={setTab} />}
        {tab === "season" && <SeasonTab key={`season-${horse.id}`} plan={plan} record={record} log={log} horse={horse} />}
        {tab === "tests" && <TestsTab key={`tests-${horse.id}`} plan={plan} record={record} />}
        {tab === "log" && <LogTab key={`log-${horse.id}`} plan={plan} horse={horse} log={log} setLog={setLog} />}
        {tab === "setup" && <SetupTab key={`setup-${horse.id}`} ws={ws} plan={plan} record={record} horse={horse} onEdit={onEditSetup} />}
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur-md" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        <ul className="mx-auto grid max-w-3xl grid-cols-5 px-2 pt-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = tab === t.id;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn("flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded-md text-[11px] font-medium", on ? "text-accent" : "text-muted")}
                >
                  <Icon className="size-5" strokeWidth={on ? 2.2 : 1.8} />
                  {t.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/** Done-ticks live in Postgres (plans.progress); writes are debounced. */
function useDone(horseId: string, log: HorseLog | null) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const packRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    if (log && log.horseId === horseId) {
      setDone(log.progress.done);
      packRef.current = log.progress.pack;
    }
  }, [log, horseId]);
  const toggle = (id: string) => {
    setDone((d) => {
      const next = { ...d, [id]: !d[id] };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void saveProgress({ data: { horseId, progress: { done: next, pack: packRef.current } } });
      }, 600);
      return next;
    });
  };
  return { done, toggle };
}

function SessionRow({ s, done, onToggle }: { s: Session; done: boolean; onToggle: () => void }) {
  return (
    <li className="flex items-start gap-3 rounded-lg bg-bg p-3">
      <button type="button" onClick={onToggle} className="mt-0.5 size-6 shrink-0" aria-label={done ? "Mark not done" : "Mark done"}>
        {done ? <Check className="size-5 text-accent" /> : <Circle className="size-5 text-faint" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={cn("text-sm font-semibold", done && "text-muted line-through")}>
            {format(parseISO(s.day), "EEE d")} · {s.title}
          </p>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", kindClass(s.kind))}>{kindLabel(s.kind)}</span>
        </div>
        <p className="mt-0.5 text-sm text-muted">{s.focus}</p>
      </div>
    </li>
  );
}

function TodayTab({
  plan,
  log,
  horse,
  onTab,
}: {
  plan: GeneratedPlan;
  record: PlanRecord;
  log: HorseLog | null;
  horse: HorseRecord;
  onTab: (t: Tab) => void;
}) {
  const { done, toggle } = useDone(horse.id, log);
  const todayIso = iso(TODAY);
  const inRange = plan.weeks.length > 0 && plan.weeks[0].id <= todayIso;
  const week = weekIn(plan.weeks, TODAY);
  const today = week.sessions.find((s) => s.day === todayIso);
  const next = plan.shows.find((s) => s.end >= todayIso);
  const best = (log?.results ?? []).filter((r) => r.percent != null && r.status === "ok").sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0))[0];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => onTab("season")} className="rounded-xl bg-surface p-4 text-left shadow-[var(--shadow-card)]">
          <Kicker>Next show</Kicker>
          <p className="font-display mt-1 text-xl leading-tight font-medium">{next?.name ?? "—"}</p>
          <p className="mt-2 font-mono text-xs text-accent tabular-nums">
            {next ? (daysUntil(next.start) <= 0 ? "Now" : `${daysUntil(next.start)} days`) : "Add a target show in Setup"}
          </p>
        </button>
        <button type="button" onClick={() => onTab("log")} className="rounded-xl bg-surface p-4 text-left shadow-[var(--shadow-card)]">
          <Kicker>Best score</Kicker>
          <p className="font-display mt-1 text-xl font-medium text-good">{best ? `${best.percent!.toFixed(1)}%` : "—"}</p>
          <p className="mt-2 text-xs text-faint">{best ? `${best.test} · ${best.showName || fmtDay(best.date)}` : "Log a test"}</p>
        </button>
      </div>
      <Card>
        <Kicker>This week · {week.label}</Kicker>
        <h2 className="font-display mt-1 text-xl leading-snug font-medium">{week.headline}</h2>
        {!inRange && <p className="mt-2 text-sm text-muted">Your plan starts {fmtDay(plan.weeks[0]?.id ?? "")}.</p>}
        {week.caution && <p className="mt-2 text-sm text-warn">{week.caution}</p>}
        <ul className="mt-4 flex flex-col gap-2">
          {week.sessions.map((s) => (
            <SessionRow key={s.id} s={s} done={!!done[s.id]} onToggle={() => toggle(s.id)} />
          ))}
        </ul>
      </Card>
      {today && (
        <Card>
          <Kicker>Today</Kicker>
          <h2 className="font-display mt-1 text-xl font-medium">{today.title}</h2>
          <p className="mt-1 text-sm text-muted">{today.focus}</p>
          {today.minutes > 0 && <p className="mt-2 font-mono text-xs text-faint">{today.minutes} min</p>}
          <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-sm leading-relaxed">
            {today.how.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ol>
          {today.note && <p className="mt-3 text-sm text-warn">{today.note}</p>}
        </Card>
      )}
      <Card>
        <Kicker>How we ride this season</Kicker>
        <ul className="mt-3 flex flex-col gap-3">
          {plan.principles.map((p) => (
            <li key={p.title}>
              <p className="text-sm font-semibold">{p.title}</p>
              <p className="mt-0.5 text-sm text-muted">{p.body}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function SeasonTab({ plan, log, horse }: { plan: GeneratedPlan; record: PlanRecord; log: HorseLog | null; horse: HorseRecord }) {
  const { done, toggle } = useDone(horse.id, log);
  const current = weekIn(plan.weeks, TODAY);
  const [idx, setIdx] = useState(() => Math.max(0, plan.weeks.findIndex((w) => w.id === current.id)));
  const week = plan.weeks[Math.min(idx, plan.weeks.length - 1)];
  const phase = phaseIn(plan.phases, TODAY);
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <Kicker>Target shows</Kicker>
        {plan.shows.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No target shows yet. Add some in Setup and the phases will line up with them.</p>
        ) : (
          <ol className="mt-3 flex flex-col gap-2">
            {plan.shows.map((s, i) => (
              <li key={s.id} className="flex items-start gap-3 rounded-lg bg-bg p-3">
                <span className="font-mono mt-0.5 w-5 text-xs text-faint">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{s.name}</p>
                  <p className="text-sm text-muted">
                    {describeWhen(s)}
                    {s.venue ? ` · ${s.venue}` : ""}
                  </p>
                  {s.entriesClose && <p className="text-xs text-faint">Entries usually close {fmtDay(s.entriesClose)} — confirm on EVO Events</p>}
                </div>
                <span className="text-xs text-faint">{daysUntil(s.start) < 0 ? "Done" : `${daysUntil(s.start)}d`}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
      <Card>
        <Kicker>Phases</Kicker>
        <ul className="mt-3 flex flex-col gap-3">
          {plan.phases.map((p) => {
            const on = p.id === phase.id;
            return (
              <li key={p.id} className={cn("rounded-lg p-3", on ? "bg-accent text-accent-fg" : "bg-bg")}>
                <p className="text-sm font-semibold">
                  {p.name}
                  <span className={cn("ml-2 text-xs font-normal", on ? "text-accent-fg/80" : "text-muted")}>
                    {format(parseISO(p.start), "d MMM")} – {format(parseISO(p.end), "d MMM")}
                  </span>
                </p>
                <p className={cn("mt-1 text-sm", on ? "text-accent-fg/90" : "text-muted")}>{p.intent}</p>
                <p className={cn("mt-2 text-xs", on ? "text-accent-fg/80" : "text-faint")}>School: {p.schoolAbove}</p>
              </li>
            );
          })}
        </ul>
      </Card>
      {week && (
        <Card>
          <div className="flex items-center justify-between gap-2">
            <div>
              <Kicker>Week plan</Kicker>
              <h2 className="font-display mt-1 text-xl font-medium">{week.label}</h2>
            </div>
            <div className="flex gap-1">
              <button type="button" aria-label="Previous week" disabled={idx <= 0} onClick={() => setIdx(idx - 1)} className="grid size-11 cursor-pointer place-items-center rounded-lg border border-line disabled:opacity-40">
                <ChevronLeft className="size-5" />
              </button>
              <button type="button" aria-label="Next week" disabled={idx >= plan.weeks.length - 1} onClick={() => setIdx(idx + 1)} className="grid size-11 cursor-pointer place-items-center rounded-lg border border-line disabled:opacity-40">
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>
          <p className="mt-2 text-sm text-muted">{week.headline}</p>
          {week.id === current.id && <p className="mt-1 text-xs font-semibold text-accent">This week</p>}
          {week.caution && <p className="mt-2 text-sm text-warn">{week.caution}</p>}
          <ul className="mt-4 flex flex-col gap-2">
            {week.sessions.map((s) => (
              <SessionRow key={s.id} s={s} done={!!done[s.id]} onToggle={() => toggle(s.id)} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function TestsTab({ plan, record }: { plan: GeneratedPlan; record: PlanRecord }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <Kicker>Your tests</Kicker>
        <ul className="mt-3 flex flex-col gap-2">
          {plan.tests.map((t) => (
            <li key={t} className="flex items-center justify-between rounded-lg bg-bg p-3 text-sm">
              <span className="font-semibold">{t}</span>
              <span className="text-xs text-muted">
                {t === plan.mainTest ? "Main test — from memory" : t === plan.homeworkTest ? "Homework — from the sheet" : ""}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Official test sheets are on the{" "}
          <a className="text-accent underline" href="https://www.nzequestrian.org.nz/dressage/" target="_blank" rel="noreferrer">
            ESNZ dressage page
          </a>
          .
        </p>
      </Card>
      <FreestyleCard record={record} />
    </div>
  );
}

function FreestyleCard({ record }: { record: PlanRecord }) {
  const ref = record.freestyle ?? record.config.freestyle ?? null;
  const [url, setUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let u: string | null = null;
    if (!ref) return;
    void getMediaBlob(ref.mediaId).then((b) => {
      if (!b) return setMissing(true);
      u = URL.createObjectURL(b);
      setUrl(u);
    });
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [ref]);
  if (!ref) return null;
  return (
    <Card>
      <div className="flex items-center gap-2">
        <Music className="size-4 text-accent" />
        <Kicker>Freestyle music</Kicker>
      </div>
      <p className="mt-2 text-sm font-semibold">{ref.fileName}</p>
      <p className="text-xs text-muted">
        {ref.durationSec ? fmtDuration(ref.durationSec) : "Length unknown"} · {(ref.size / 1024 / 1024).toFixed(1)} MB
      </p>
      {url && <audio className="mt-3 w-full" controls src={url} />}
      {missing && <p className="mt-2 text-sm text-muted">The file is saved on the device you uploaded it from. Re-upload it in Setup to play it here.</p>}
    </Card>
  );
}

function LogTab({ plan, horse, log, setLog }: { plan: GeneratedPlan; horse: HorseRecord; log: HorseLog | null; setLog: (l: HorseLog) => void }) {
  const [showName, setShowName] = useState(plan.shows.find((s) => s.start <= iso(TODAY))?.name ?? plan.shows[0]?.name ?? "");
  const [test, setTest] = useState(plan.mainTest);
  const [date, setDate] = useState(iso(TODAY));
  const [percent, setPercent] = useState("");
  const [place, setPlace] = useState("");
  const [notes, setNotes] = useState("");
  const [noteText, setNoteText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<HorseLog>) {
    setBusy(true);
    setErr(null);
    try {
      setLog(await fn());
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!log) return <Card><p className="text-sm text-muted">Loading…</p></Card>;
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <Kicker>Log a score</Kicker>
        <form
          className="mt-3 grid gap-2 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const pct = Number(percent.replace(",", "."));
            if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return setErr("Enter a percentage between 0 and 100.");
            void run(() =>
              saveResult({
                data: {
                  horseId: horse.id,
                  result: { id: `r-${Date.now()}`, showName, date, test, percent: pct, place, notes, level: plan.level, status: "ok" },
                },
              }),
            ).then((ok) => ok && (setPercent(""), setPlace(""), setNotes("")));
          }}
        >
          <input className={inputCls} list="rider-shows" placeholder="Show" value={showName} onChange={(e) => setShowName(e.target.value)} />
          <datalist id="rider-shows">
            {plan.shows.map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>
          <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <select className={inputCls} value={test} onChange={(e) => setTest(e.target.value)}>
            {plan.tests.map((t) => (
              <option key={t}>{t}</option>
            ))}
            <option value="Other">Other</option>
          </select>
          <input className={inputCls} inputMode="decimal" placeholder="Percent e.g. 64.5" value={percent} onChange={(e) => setPercent(e.target.value)} />
          <input className={inputCls} placeholder="Place (optional)" value={place} onChange={(e) => setPlace(e.target.value)} />
          <input className={inputCls} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <PrimaryButton type="submit" disabled={busy} className="sm:col-span-2">Save score</PrimaryButton>
        </form>
        {err && <p className="mt-2 text-sm text-danger">{err}</p>}
        <ul className="mt-4 flex flex-col gap-2">
          {log.results.length === 0 && <li className="text-sm text-muted">No scores yet.</li>}
          {log.results.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-3 rounded-lg bg-bg p-3 text-sm">
              <div className="min-w-0">
                <p className="font-semibold">
                  {r.test || "Test"} · {r.percent != null ? `${r.percent.toFixed(2)}%` : r.status}
                  {r.place && <span className="font-normal text-muted"> · {r.place}</span>}
                </p>
                <p className="text-xs text-muted">
                  {[r.showName, fmtDay(r.date)].filter(Boolean).join(" · ")}
                  {r.source === "evo_csv" && <span className="ml-1 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">EVO import</span>}
                </p>
                {r.notes && <p className="mt-1 text-xs text-faint">{r.notes}</p>}
              </div>
              {r.source !== "evo_csv" && (
                <button type="button" aria-label="Delete score" className="cursor-pointer text-muted hover:text-danger" onClick={() => void run(() => deleteEntry({ data: { horseId: horse.id, kind: "result", id: r.id } }))}>
                  <Trash2 className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <Kicker>Ride notes</Kicker>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!noteText.trim()) return;
            void run(() => saveNote({ data: { horseId: horse.id, note: { id: `n-${Date.now()}`, date: iso(TODAY), text: noteText.trim() } } })).then(
              (ok) => ok && setNoteText(""),
            );
          }}
        >
          <input className={inputCls} placeholder="How did today’s ride feel?" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
          <button type="submit" disabled={busy} className="cursor-pointer rounded-lg bg-accent px-4 text-sm font-bold text-accent-fg">Add</button>
        </form>
        <ul className="mt-3 flex flex-col gap-2">
          {log.notes.map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-3 rounded-lg bg-bg p-3 text-sm">
              <div>
                <p className="text-xs text-faint">{fmtDay(n.date)}</p>
                <p className="whitespace-pre-line">{n.text}</p>
              </div>
              <button type="button" aria-label="Delete note" className="cursor-pointer text-muted hover:text-danger" onClick={() => void run(() => deleteEntry({ data: { horseId: horse.id, kind: "note", id: n.id } }))}>
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <SheetsCard plan={plan} horse={horse} log={log} setLog={setLog} />
    </div>
  );
}

function SheetsCard({ plan, horse, log, setLog }: { plan: GeneratedPlan; horse: HorseRecord; log: HorseLog; setLog: (l: HorseLog) => void }) {
  const [files, setFiles] = useState<{ blob: Blob; dataUrl: string }[]>([]);
  const [test, setTest] = useState(plan.mainTest);
  const [showName, setShowName] = useState(plan.shows[0]?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add(list: FileList | null) {
    if (!list) return;
    setErr(null);
    try {
      const next = [...files];
      for (const f of Array.from(list).slice(0, MAX_SHEET_PHOTOS - files.length)) next.push(await compressSheetPhoto(f));
      setFiles(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  async function read() {
    setBusy(true);
    setErr(null);
    try {
      const res = await summariseSheet({
        data: {
          images: files.map((f) => ({ imageBase64: f.dataUrl.slice(f.dataUrl.indexOf(",") + 1), mime: "image/jpeg" })),
          testHint: test,
          showName,
          horseName: horse.name,
          level: horse.level || plan.level,
        },
      });
      if (!res.ok) return setErr(res.error);
      const id = `s-${Date.now()}`;
      const photos = files.map((_, i) => ({ id: i === 0 ? id : `${id}-${i + 1}` }));
      for (let i = 0; i < files.length; i++) await putMediaBlob(photos[i].id, files[i].blob);
      const sheet = res.sheet;
      const saved = await saveSheet({
        data: {
          horseId: horse.id,
          sheet: { id, kind: "sheet", showName, date: iso(TODAY), test: sheet.test && sheet.test !== "unknown" ? sheet.test : test, note: "", mime: "image/jpeg", sheet, photos },
        },
      });
      setLog(saved);
      setFiles([]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Kicker>Judge sheets</Kicker>
      <p className="mt-2 text-sm text-muted">Photograph the sheet (up to {MAX_SHEET_PHOTOS} pages). We read it and save the summary to your account; the photos stay on this device.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input className={inputCls} placeholder="Show" value={showName} onChange={(e) => setShowName(e.target.value)} />
        <select className={inputCls} value={test} onChange={(e) => setTest(e.target.value)}>
          {plan.tests.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-line px-3 py-3 text-sm font-semibold text-ink-soft">
        <ImagePlus className="size-4" /> {files.length ? `${files.length} photo${files.length === 1 ? "" : "s"} — add more` : "Add sheet photos"}
        <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => void add(e.target.files).then(() => (e.target.value = ""))} />
      </label>
      {files.length > 0 && (
        <PrimaryButton type="button" className="mt-2" disabled={busy} onClick={() => void read()}>
          {busy ? "Reading the sheet…" : "Read the sheet"}
        </PrimaryButton>
      )}
      {err && <p className="mt-2 text-sm text-danger">{err}</p>}
      <ul className="mt-4 flex flex-col gap-3">
        {log.sheets.map((x) => (
          <li key={x.id} className="rounded-lg bg-bg p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">
                {x.test}
                {x.sheet?.percent != null && ` · ${x.sheet.percent}%`}
                <span className="font-normal text-muted"> · {[x.showName, fmtDay(x.date)].filter(Boolean).join(" · ")}</span>
              </p>
              <button type="button" aria-label="Delete sheet" className="cursor-pointer text-muted hover:text-danger" onClick={() => void deleteEntry({ data: { horseId: horse.id, kind: "sheet", id: x.id } }).then(setLog)}>
                <Trash2 className="size-4" />
              </button>
            </div>
            {x.sheet?.summary && <p className="mt-1 text-muted">{x.sheet.summary}</p>}
            {x.sheet?.workOns?.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {x.sheet.workOns.map((w) => (
                  <li key={w.title}>
                    <span className="font-semibold">{w.title}</span> — {w.how}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function SetupTab({ ws, plan, record, horse, onEdit }: { ws: Workspace; plan: GeneratedPlan; record: PlanRecord; horse: HorseRecord; onEdit: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <Kicker>{horse.name}</Kicker>
        <dl className="mt-3 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-sm">
          <dt className="text-faint">Rider grade</dt>
          <dd>{ws.riderGrade}</dd>
          <dt className="text-faint">Level</dt>
          <dd>{horse.level || plan.level}</dd>
          <dt className="text-faint">ESNZ</dt>
          <dd>{horse.esnzNumber || "—"}</dd>
          <dt className="text-faint">Tests</dt>
          <dd>{plan.tests.join(", ")}</dd>
          <dt className="text-faint">Shows</dt>
          <dd>{plan.shows.map((s) => s.name).join(", ") || "—"}</dd>
          <dt className="text-faint">Goals</dt>
          <dd>{plan.goals.map((g) => GOALS.find((o) => o.id === g)?.label).join(", ") || "—"}</dd>
          <dt className="text-faint">Plan built</dt>
          <dd>{fmtDay(record.updatedAt.slice(0, 10))}</dd>
        </dl>
        <PrimaryButton type="button" className="mt-4" onClick={onEdit}>
          Change horses, tests, shows or goals
        </PrimaryButton>
        <p className="mt-2 text-xs text-muted">Rebuilding keeps your scores, notes and judge sheets.</p>
      </Card>
    </div>
  );
}

/**
 * Riders who used the earlier beta had their scores in this device's
 * localStorage (`xsalute-plan:<id>`). Offer a one-off import; localStorage is
 * left untouched either way.
 */
function LocalImportBanner({ storageKey, horse, onImported }: { storageKey: string; horse: HorseRecord; onImported: (l: HorseLog) => void }) {
  const dismissKey = `${storageKey}:import-dismissed`;
  const [snap, setSnap] = useState<LegacySnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    try {
      if (localStorage.getItem(dismissKey)) return;
      const raw = localStorage.getItem(storageKey);
      // The earlier beta copied the example rider's data into new riders' keys
      // on shared devices — an unchanged copy is not theirs, so don't offer it.
      if (raw && raw === localStorage.getItem("samson-super5-plan")) return;
      const s = snapshotFromStorage(raw);
      if (s && !snapshotIsEmpty(s)) setSnap(s);
    } catch {
      /* storage unavailable */
    }
  }, [storageKey, dismissKey]);
  const counts = useMemo(() => (snap ? snapshotCounts(snap) : null), [snap]);
  if (!snap || !counts) return msg ? <p className="mb-3 rounded-lg bg-accent/15 px-3 py-2 text-sm text-accent">{msg}</p> : null;
  const dismiss = () => {
    try {
      localStorage.setItem(dismissKey, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setSnap(null);
  };
  return (
    <Panel className="mb-4 space-y-2">
      <p className="text-sm font-semibold">Found data from the earlier beta on this device</p>
      <p className="text-xs text-muted">
        {counts.scores} scores, {counts.notes} notes, {counts.sheets} judge sheets. Import them into {horse.name}? (If these
        are the example rider’s, skip this.) Nothing is removed from this device.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          className="cursor-pointer rounded-lg bg-accent px-3 py-2 text-sm font-bold text-accent-fg"
          onClick={() => {
            setBusy(true);
            void importLocalForHorse({ data: { horseId: horse.id, snapshot: snap } })
              .then((l) => {
                onImported(l);
                setMsg(`Imported into ${horse.name}.`);
                dismiss();
              })
              .catch((e: unknown) => setMsg(e instanceof Error ? e.message : String(e)))
              .finally(() => setBusy(false));
          }}
        >
          Import into {horse.name}
        </button>
        <button type="button" className="cursor-pointer rounded-lg border border-line px-3 py-2 text-sm" onClick={dismiss}>
          Skip
        </button>
      </div>
    </Panel>
  );
}
