import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  GraduationCap,
  Home,
  ImagePlus,
  Music,
  NotebookPen,
  Settings2,
  Target,
  Trash2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { FloorPlanPicker } from "@/components/floor-plan";
import { DeviceFreestyleBar } from "@/components/freestyle-player";
import { CoachTab } from "@/components/rider-coach";
import { ArenaCaller } from "@/components/arena-caller";
import { CoachCueEditor, useCallerCues } from "@/components/coach-cues";
import { callerSheet, TestArena, TestsPanel } from "@/components/test-sheet";
import { compressSheetPhoto, putMediaBlob } from "@/lib/media-db";
import { openMedia, syncLocalMedia, type MediaRef } from "@/lib/media-upload";
import { describeWhen, GOALS, type GeneratedPlan } from "@/lib/plan-builder";
import { resolveRide } from "@/lib/result-summary";
import type { EvoRow } from "@/lib/evo-csv";
import { parseEvoResultsPaste, type EvoPasteResult } from "@/lib/evo-paste";
import {
  deleteEntry,
  getHorseLog,
  getWorkspace,
  importLocalForHorse,
  importOwnEvoResults,
  keepEvoResults,
  rejectEvoResults,
  saveNote,
  saveProgress,
  saveHorseFloorPlan,
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
  type PendingEvoResult,
  type PlanRecord,
  type Progress,
  type Workspace,
} from "@/lib/rider-types";
import { applyCoachVisits, packKey, packingList, playableFreestyle } from "@/lib/rider-workspace";
import { isPublishedTest, testIdForName } from "@/lib/test-registry";
import { MAX_SHEET_PHOTOS } from "@/lib/review-types";
import {
  daysUntil,
  kindLabel,
  phaseIn,
  TODAY,
  iso,
  weekIn,
  type Kind,
  type Session,
} from "@/lib/season";
import { summariseSheet } from "@/lib/summarise-sheet";
import { cn } from "@/lib/utils";
import { BrandShell, inputCls, Kicker, Panel, PrimaryButton, Title } from "./beta-ui";
import { PlanResults } from "./plan-results";
import { fmtDay, fmtDuration, SetupWizard } from "./setup-wizard";
import { TrainingTargets } from "./training-targets";

type Tab = "today" | "season" | "tests" | "coach" | "log" | "setup";
const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "today", label: "Today", icon: Home },
  { id: "season", label: "Season", icon: CalendarDays },
  { id: "tests", label: "Tests", icon: Target },
  { id: "coach", label: "Coach", icon: GraduationCap },
  { id: "log", label: "Log", icon: NotebookPen },
  { id: "setup", label: "Setup", icon: Settings2 },
];

function kindClass(kind: Kind) {
  switch (kind) {
    case "coach":
      return "bg-accent text-accent-fg";
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
              Let’s build a season plan for your own horse
              {ws.applicationHorses.length > 1 ? "s" : ""}. It takes about two minutes. Everything
              you log is saved to your account, not just this device.
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
  return (
    <RiderApp
      ws={ws}
      horses={planned}
      storageKey={storageKey}
      onEditSetup={() => setEditing(true)}
      onWorkspace={setWs}
    />
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={cn("rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5", className)}
    >
      {children}
    </section>
  );
}

function RiderApp({
  ws,
  horses,
  storageKey,
  onEditSetup,
  onWorkspace,
}: {
  ws: Workspace;
  horses: HorseRecord[];
  storageKey: string;
  onEditSetup: () => void;
  onWorkspace: (ws: Workspace) => void;
}) {
  const [tab, setTab] = useState<Tab>("today");
  const [horseId, setHorseId] = useState(horses[0].id);
  const horse = horses.find((h) => h.id === horseId) ?? horses[0];
  const record = ws.plans[horse.id];
  const basePlan = record.plan as GeneratedPlan;
  const [log, setLog] = useState<HorseLog | null>(null);
  const [logError, setLogError] = useState<string | null>(null);
  const horseIdRef = useRef(horse.id);
  horseIdRef.current = horse.id;

  const mediaKey = [
    horses
      .map((item) => {
        const plan = ws.plans[item.id];
        const music = plan?.freestyle?.mediaId ?? plan?.config.freestyle?.mediaId ?? "";
        const floor = plan?.config.floorPlan?.mediaId ?? "";
        return `${item.id}:${music}:${floor}`;
      })
      .join("|"),
    log?.sheets
      .filter((sheet) => sheet.kind === "video")
      .map((sheet) => sheet.id)
      .join(",") ?? "",
  ].join(";");

  useEffect(() => {
    const refs: MediaRef[] = [];
    for (const item of horses) {
      const plan = ws.plans[item.id];
      const music = plan?.freestyle ?? plan?.config.freestyle;
      if (music?.mediaId) {
        refs.push({
          id: music.mediaId,
          kind: "music",
          fileName: music.fileName,
          mime: music.mime || "audio/mpeg",
          horseId: item.id,
        });
      }
      const floor = plan?.config.floorPlan;
      if (floor?.mediaId) {
        refs.push({
          id: floor.mediaId,
          kind: "floorplan",
          fileName: floor.fileName,
          mime: floor.mime || "application/pdf",
          horseId: item.id,
        });
      }
    }
    if (log) {
      for (const sheet of log.sheets) {
        if (sheet.kind !== "video") continue;
        refs.push({
          id: sheet.id,
          kind: "video",
          fileName: `${sheet.test || "test"}.mp4`,
          mime: sheet.mime || "video/mp4",
          horseId: log.horseId,
        });
      }
    }
    syncLocalMedia(refs);
    // mediaKey already changes when the horse, file or video list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaKey]);

  useEffect(() => {
    let dead = false;
    setLog(null);
    getHorseLog({ data: { horseId: horse.id } })
      .then((l) => {
        if (dead || l.horseId !== horse.id) return;
        setLog(l);
        setLogError(null);
      })
      .catch((e: unknown) => {
        if (dead) return;
        setLogError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      dead = true;
    };
  }, [horse.id]);

  const adoptLog = useCallback((next: HorseLog) => {
    if (next.horseId !== horseIdRef.current) return;
    setLog((current) => {
      if (current && current.horseId !== next.horseId) return current;
      if (current) return { ...next, progress: current.progress };
      return next;
    });
    setLogError(null);
  }, []);

  const rememberProgress = useCallback((progress: Progress) => {
    setLog((current) =>
      current && current.horseId === horseIdRef.current ? { ...current, progress } : current,
    );
  }, []);

  const plan = useMemo(
    () => applyCoachVisits(basePlan, log?.horseId === horse.id ? log.coachVisits : []),
    [basePlan, horse.id, log],
  );
  const phase = phaseIn(plan.phases, TODAY);

  return (
    <div className="vd-glow min-h-dvh text-fg">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 pb-36 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <div className="mb-3 flex items-center gap-2.5">
          <img
            src="/brand/vdnz-icon.svg"
            alt="XSalute by Virtual Dressage NZ"
            className="size-9 rounded-[10px] ring-1 ring-accent/30"
          />
          <div className="leading-tight">
            <p className="font-display text-[15px] font-extrabold tracking-[-0.02em] text-fg">
              <span className="text-accent">X</span>Salute{" "}
              <span className="text-[10px] font-semibold tracking-normal text-muted">
                by Virtual Dressage NZ
              </span>
            </p>
            <p className="text-[9.5px] font-semibold tracking-[0.22em] text-muted">
              PLAN · TRAIN · COMPETE · REFLECT
            </p>
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
                  h.id === horse.id
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-line text-muted",
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
            {horse.esnzNumber && (
              <p className="mt-0.5 text-xs text-faint">ESNZ {horse.esnzNumber}</p>
            )}
          </div>
          <span className="mb-1 inline-flex rounded-full bg-accent px-3 py-1 text-[11px] font-semibold tracking-wide text-accent-fg uppercase">
            {phase.name}
          </span>
        </header>
        <RiderMusic horse={horse} record={record} />
        <LocalImportBanner storageKey={storageKey} horse={horse} onImported={setLog} />
        {logError && (
          <p className="mb-3 rounded-lg bg-danger/15 px-3 py-2 text-sm text-danger">{logError}</p>
        )}
        {tab === "today" && (
          <TodayTab
            key={`today-${horse.id}`}
            plan={plan}
            log={log}
            horse={horse}
            onTab={setTab}
            onProgress={rememberProgress}
          />
        )}
        {tab === "season" && (
          <SeasonTab
            key={`season-${horse.id}`}
            plan={plan}
            log={log}
            horse={horse}
            onProgress={rememberProgress}
            onLog={adoptLog}
          />
        )}
        {tab === "tests" && (
          <TestsTab
            key={`tests-${horse.id}`}
            plan={plan}
            record={record}
            isAdmin={ws.isOwner}
            approvedTestIds={ws.approvedTestIds}
            onWorkspace={onWorkspace}
          />
        )}
        {tab === "coach" && (
          <CoachTab
            key={`coach-${horse.id}`}
            horse={horse}
            plan={plan}
            log={log}
            onLog={adoptLog}
            onError={setLogError}
            sheets={
              log && log.horseId === horse.id ? (
                <SheetsCard plan={plan} horse={horse} log={log} setLog={adoptLog} />
              ) : (
                <Card>
                  <p className="text-sm text-muted">Loading…</p>
                </Card>
              )
            }
          />
        )}
        {tab === "log" && (
          <LogTab
            key={`log-${horse.id}`}
            plan={plan}
            horse={horse}
            log={log}
            setLog={adoptLog}
            onError={setLogError}
            onProgress={rememberProgress}
          />
        )}
        {tab === "setup" && (
          <SetupTab
            key={`setup-${horse.id}`}
            ws={ws}
            plan={plan}
            record={record}
            horse={horse}
            onEdit={onEditSetup}
          />
        )}
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur-md"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <ul className="mx-auto grid max-w-3xl grid-cols-6 px-1 pt-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = tab === t.id;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded-md text-[10px] font-medium sm:text-[11px]",
                    on ? "text-accent" : "text-muted",
                  )}
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

/** Done ticks and packing ticks live in Postgres (plans.progress), per horse. */
function useHorseProgress(
  horseId: string,
  log: HorseLog | null,
  onProgress: (p: Progress) => void,
) {
  const [progress, setProgress] = useState<Progress>({ done: {}, pack: {} });
  const latest = useRef<Progress>(progress);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ horseId: string; progress: Progress } | null>(null);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  useEffect(() => {
    if (log && log.horseId === horseId) {
      setProgress(log.progress);
      latest.current = log.progress;
    }
  }, [log, horseId]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      const queued = pending.current;
      pending.current = null;
      if (queued)
        void saveProgress({ data: { horseId: queued.horseId, progress: queued.progress } });
    };
  }, []);

  function queue(next: Progress) {
    latest.current = next;
    pending.current = { horseId, progress: next };
    onProgressRef.current(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      pending.current = null;
      void saveProgress({ data: { horseId, progress: next } });
    }, 600);
  }

  const toggleDone = (id: string) => {
    const current = latest.current;
    queue({ done: { ...current.done, [id]: !current.done[id] }, pack: current.pack });
    setProgress(latest.current);
  };
  const togglePack = (id: string) => {
    const current = latest.current;
    queue({ done: current.done, pack: { ...current.pack, [id]: !current.pack[id] } });
    setProgress(latest.current);
  };
  return { done: progress.done, pack: progress.pack, toggleDone, togglePack };
}

function SessionRow({ s, done, onToggle }: { s: Session; done: boolean; onToggle: () => void }) {
  return (
    <li className="flex items-start gap-3 rounded-lg bg-bg p-3">
      <button
        type="button"
        onClick={onToggle}
        className="mt-0.5 size-6 shrink-0"
        aria-label={done ? "Mark not done" : "Mark done"}
      >
        {done ? <Check className="size-5 text-accent" /> : <Circle className="size-5 text-faint" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={cn("text-sm font-semibold", done && "text-muted line-through")}>
            {format(parseISO(s.day), "EEE d")} · {s.title}
          </p>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
              kindClass(s.kind),
            )}
          >
            {kindLabel(s.kind)}
          </span>
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
  onProgress,
}: {
  plan: GeneratedPlan;
  log: HorseLog | null;
  horse: HorseRecord;
  onTab: (t: Tab) => void;
  onProgress: (p: Progress) => void;
}) {
  const { done, toggleDone } = useHorseProgress(horse.id, log, onProgress);
  const todayIso = iso(TODAY);
  const inRange = plan.weeks.length > 0 && plan.weeks[0].id <= todayIso;
  const week = weekIn(plan.weeks, TODAY);
  const today = week.sessions.find((s) => s.day === todayIso);
  const next = plan.shows.find((s) => s.end >= todayIso);
  const best = (log?.results ?? [])
    .filter((r) => r.percent != null && r.status === "ok")
    .sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0))[0];
  const nextVisit = (log?.horseId === horse.id ? log.coachVisits : []).find(
    (v) => (v.endDate || v.date) >= todayIso,
  );
  const visitDays = nextVisit ? daysUntil(nextVisit.date) : 0;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onTab("season")}
          className="rounded-xl bg-surface p-4 text-left shadow-[var(--shadow-card)]"
        >
          <Kicker>Next show</Kicker>
          <p className="font-display mt-1 text-xl leading-tight font-medium">{next?.name ?? "—"}</p>
          <p className="mt-2 font-mono text-xs text-accent tabular-nums">
            {next
              ? daysUntil(next.start) <= 0
                ? "Now"
                : `${daysUntil(next.start)} days`
              : "Add a target competition in Setup"}
          </p>
        </button>
        <button
          type="button"
          onClick={() => onTab("log")}
          className="rounded-xl bg-surface p-4 text-left shadow-[var(--shadow-card)]"
        >
          <Kicker>Best score</Kicker>
          <p className="font-display mt-1 text-xl font-medium text-good">
            {best ? `${best.percent!.toFixed(1)}%` : "—"}
          </p>
          <p className="mt-2 text-xs text-faint">
            {best ? `${best.test} · ${best.showName || fmtDay(best.date)}` : "Log a test"}
          </p>
        </button>
      </div>
      {nextVisit && (
        <button
          type="button"
          onClick={() => onTab("coach")}
          className="rounded-xl bg-surface p-4 text-left shadow-[var(--shadow-card)]"
        >
          <Kicker>Next coach</Kicker>
          <p className="font-display mt-1 text-xl leading-tight font-medium">
            {nextVisit.title || "Coach"}
          </p>
          <p className="mt-2 text-sm text-muted">
            {fmtDay(nextVisit.date)}
            {nextVisit.endDate !== nextVisit.date ? ` – ${fmtDay(nextVisit.endDate)}` : ""}
            {" · "}
            {visitDays > 0 ? `${visitDays} days` : visitDays === 0 ? "Today" : "This visit"}
          </p>
          {nextVisit.focus && <p className="mt-1 text-sm text-muted">{nextVisit.focus}</p>}
        </button>
      )}
      <TrainingTargets horseId={horse.id} tests={plan.tests} />
      <Card>
        <Kicker>This week · {week.label}</Kicker>
        <h2 className="font-display mt-1 text-xl leading-snug font-medium">{week.headline}</h2>
        {!inRange && (
          <p className="mt-2 text-sm text-muted">
            Your plan starts {fmtDay(plan.weeks[0]?.id ?? "")}.
          </p>
        )}
        {week.caution && <p className="mt-2 text-sm text-warn">{week.caution}</p>}
        <ul className="mt-4 flex flex-col gap-2">
          {week.sessions.map((s) => (
            <SessionRow key={s.id} s={s} done={!!done[s.id]} onToggle={() => toggleDone(s.id)} />
          ))}
        </ul>
      </Card>
      {today && (
        <Card>
          <Kicker>Today</Kicker>
          <h2 className="font-display mt-1 text-xl font-medium">{today.title}</h2>
          <p className="mt-1 text-sm text-muted">{today.focus}</p>
          {today.minutes > 0 && (
            <p className="mt-2 font-mono text-xs text-faint">{today.minutes} min</p>
          )}
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

function SeasonTab({
  plan,
  log,
  horse,
  onProgress,
  onLog,
}: {
  plan: GeneratedPlan;
  log: HorseLog | null;
  horse: HorseRecord;
  onProgress: (p: Progress) => void;
  onLog: (log: HorseLog) => void;
}) {
  const { done, toggleDone } = useHorseProgress(horse.id, log, onProgress);
  const current = weekIn(plan.weeks, TODAY);
  const [idx, setIdx] = useState(() =>
    Math.max(
      0,
      plan.weeks.findIndex((w) => w.id === current.id),
    ),
  );
  const week = plan.weeks[Math.min(idx, plan.weeks.length - 1)];
  const phase = phaseIn(plan.phases, TODAY);
  return (
    <div className="flex flex-col gap-4">
      <TrainingTargets horseId={horse.id} tests={plan.tests} editor />
      <PlanResults
        results={log && log.horseId === horse.id ? log.results : null}
        horseId={horse.id}
        horseLevel={horse.level || plan.level}
        onUpdated={onLog}
      />
      <Card>
        <Kicker>Target competitions</Kicker>
        {plan.shows.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            No target competitions yet. Add some in Setup and the phases will line up with them.
          </p>
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
                  {s.entriesClose && (
                    <p
                      className={cn(
                        "text-xs",
                        daysUntil(s.entriesClose) >= 0 && daysUntil(s.entriesClose) <= 7
                          ? "font-semibold text-warn"
                          : "text-faint",
                      )}
                    >
                      {daysUntil(s.entriesClose) < 0
                        ? `Entries closed ${fmtDay(s.entriesClose)}`
                        : daysUntil(s.entriesClose) === 0
                          ? "Entries close today"
                          : `Entries close in ${daysUntil(s.entriesClose)} days · ${fmtDay(s.entriesClose)}`}
                    </p>
                  )}
                </div>
                <span className="text-xs text-faint">
                  {daysUntil(s.start) < 0 ? "Done" : `${daysUntil(s.start)}d`}
                </span>
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
              <li
                key={p.id}
                className={cn("rounded-lg p-3", on ? "bg-accent text-accent-fg" : "bg-bg")}
              >
                <p className="text-sm font-semibold">
                  {p.name}
                  <span
                    className={cn(
                      "ml-2 text-xs font-normal",
                      on ? "text-accent-fg/80" : "text-muted",
                    )}
                  >
                    {format(parseISO(p.start), "d MMM")} – {format(parseISO(p.end), "d MMM")}
                  </span>
                </p>
                <p className={cn("mt-1 text-sm", on ? "text-accent-fg/90" : "text-muted")}>
                  {p.intent}
                </p>
                <p className={cn("mt-2 text-xs", on ? "text-accent-fg/80" : "text-faint")}>
                  School: {p.schoolAbove}
                </p>
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
              <button
                type="button"
                aria-label="Previous week"
                disabled={idx <= 0}
                onClick={() => setIdx(idx - 1)}
                className="grid size-11 cursor-pointer place-items-center rounded-lg border border-line disabled:opacity-40"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Next week"
                disabled={idx >= plan.weeks.length - 1}
                onClick={() => setIdx(idx + 1)}
                className="grid size-11 cursor-pointer place-items-center rounded-lg border border-line disabled:opacity-40"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>
          <p className="mt-2 text-sm text-muted">{week.headline}</p>
          {week.id === current.id && (
            <p className="mt-1 text-xs font-semibold text-accent">This week</p>
          )}
          {week.caution && <p className="mt-2 text-sm text-warn">{week.caution}</p>}
          <ul className="mt-4 flex flex-col gap-2">
            {week.sessions.map((s) => (
              <SessionRow key={s.id} s={s} done={!!done[s.id]} onToggle={() => toggleDone(s.id)} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function TestsTab({
  plan,
  record,
  isAdmin,
  approvedTestIds,
  onWorkspace,
}: {
  plan: GeneratedPlan;
  record: PlanRecord;
  isAdmin: boolean;
  approvedTestIds: string[];
  onWorkspace: (ws: Workspace) => void;
}) {
  const shown = plan.tests.filter((test) => isAdmin || isPublishedTest(test, approvedTestIds));
  const [calling, setCalling] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const called = calling ? callerSheet(calling) : null;
  const edited = editing ? callerSheet(editing) : null;
  const callBriefs =
    called?.movements.map((movement) => ({
      n: movement.n,
      label: movement.steps.map((step) => [step.at, step.do].filter(Boolean).join(" ")).join(". "),
    })) ?? [];
  const editBriefs =
    edited?.movements.map((movement) => ({
      n: movement.n,
      label: movement.steps.map((step) => [step.at, step.do].filter(Boolean).join(" ")).join(". "),
    })) ?? [];
  const coaching = useCallerCues(
    !!calling,
    record.horseId,
    calling ? testIdForName(calling) : "",
    called?.title ?? "",
    callBriefs,
  );
  const editedCues = useCallerCues(
    !!editing,
    record.horseId,
    editing ? testIdForName(editing) : "",
    edited?.title ?? "",
    editBriefs,
  );
  const floorPlan = record.config.floorPlan ?? null;
  const showFloor =
    plan.level === "Level 2" ||
    plan.tests.some((test) => /freestyle|mfs/i.test(test)) ||
    !!floorPlan;
  return (
    <div className="flex flex-col gap-4">
      <TestsPanel
        isAdmin={isAdmin}
        horseLevel={plan.level}
        horseTests={plan.tests}
        horseId={record.horseId}
      />
      {showFloor && (
        <Card>
          <FloorPlanPicker
            plan={floorPlan}
            horseId={record.horseId}
            onChange={async (next) => {
              onWorkspace(
                await saveHorseFloorPlan({
                  data: { horseId: record.horseId, floorPlan: next },
                }),
              );
            }}
          />
        </Card>
      )}
      <Card>
        <Kicker>Your tests</Kicker>
        <ul className="mt-3 flex flex-col gap-2">
          {shown.map((t) => (
            <li key={t} className="flex items-center justify-between gap-3 rounded-lg bg-bg p-3 text-sm">
              <span className="min-w-0 font-semibold">
                {t}
                {isAdmin && !isPublishedTest(t, approvedTestIds) && (
                  <span className="ml-2 text-xs font-semibold tracking-wide text-warn uppercase">
                    Draft
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2">
                {callerSheet(t) && (
                  <>
                    {isAdmin && (
                      <button
                        type="button"
                        className="min-h-11 text-xs font-semibold text-accent"
                        onClick={() => setEditing(editing === t ? null : t)}
                      >
                        Cues
                      </button>
                    )}
                    <button
                      type="button"
                      className="min-h-11 rounded-lg bg-accent px-3 text-xs font-semibold text-accent-fg"
                      onClick={() => setCalling(t)}
                    >
                      Caller
                    </button>
                  </>
                )}
                <span className="text-xs text-muted">
                  {t === plan.mainTest
                    ? "Main test — from memory"
                    : t === plan.homeworkTest
                      ? "Homework — from the sheet"
                      : ""}
                </span>
              </span>
            </li>
          ))}
          {shown.length === 0 && (
            <li className="text-sm text-muted">No published tests on this horse yet.</li>
          )}
        </ul>
        {isAdmin && edited && editing && (
          <CoachCueEditor
            horseId={record.horseId}
            testId={testIdForName(editing)}
            movements={editBriefs}
            cues={editedCues.cues}
            onSaved={editedCues.replace}
          />
        )}
        {called && (
          <ArenaCaller
            title={called.title}
            movements={called.movements}
            cues={coaching.cues}
            onRefresh={() => void coaching.refresh()}
            refreshing={coaching.refreshing}
            refreshError={coaching.error}
            onClose={() => setCalling(null)}
          >
            {(movement) => (
              <TestArena movement={movement} arena={called.arena} size={called.size} />
            )}
          </ArenaCaller>
        )}
        <p className="mt-3 text-xs text-muted">
          Official test sheets are on the{" "}
          <a
            className="text-accent underline"
            href="https://www.nzequestrian.org.nz/dressage/"
            target="_blank"
            rel="noreferrer"
          >
            ESNZ dressage page
          </a>
          .
        </p>
      </Card>
      <TrainingTargets horseId={record.horseId} tests={plan.tests} />
      <FreestyleCard record={record} />
    </div>
  );
}

function RiderMusic({ horse, record }: { horse: HorseRecord; record: PlanRecord }) {
  const track = playableFreestyle(record.freestyle ?? record.config.freestyle);
  const mediaId = track?.mediaId ?? "";
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let dead = false;
    let release = () => {};
    setSrc(null);
    if (!mediaId) return;
    void openMedia(mediaId)
      .then((opened) => {
        if (dead) {
          opened?.revoke();
          return;
        }
        if (!opened) return;
        release = opened.revoke;
        setSrc(opened.url);
      })
      .catch(() => undefined);
    return () => {
      dead = true;
      release();
    };
  }, [mediaId]);
  if (!track || !src) return null;
  return (
    <DeviceFreestyleBar
      src={src}
      title={track.title}
      horse={horse.name}
      durationHint={record.freestyle?.durationSec ?? record.config.freestyle?.durationSec}
    />
  );
}

function FreestyleCard({ record }: { record: PlanRecord }) {
  const ref = record.freestyle ?? record.config.freestyle ?? null;
  const [url, setUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let release = () => {};
    let dead = false;
    if (!ref) return;
    void openMedia(ref.mediaId).then((opened) => {
      if (dead) {
        opened?.revoke();
        return;
      }
      if (!opened) return setMissing(true);
      release = opened.revoke;
      setUrl(opened.url);
    });
    return () => {
      dead = true;
      release();
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
        {ref.durationSec ? fmtDuration(ref.durationSec) : "Length unknown"} ·{" "}
        {(ref.size / 1024 / 1024).toFixed(1)} MB
      </p>
      {url && <audio className="mt-3 w-full" controls src={url} />}
      {missing && (
        <p className="mt-2 text-sm text-muted">
          This track isn’t on this phone, and it isn’t on your account yet. Add it again in Setup.
        </p>
      )}
    </Card>
  );
}

function LogTab({
  plan,
  horse,
  log,
  setLog,
  onError,
  onProgress,
}: {
  plan: GeneratedPlan;
  horse: HorseRecord;
  log: HorseLog | null;
  setLog: (l: HorseLog) => void;
  onError: (message: string | null) => void;
  onProgress: (p: Progress) => void;
}) {
  const [showName, setShowName] = useState(
    plan.shows.find((s) => s.start <= iso(TODAY))?.name ?? plan.shows[0]?.name ?? "",
  );
  const [test, setTest] = useState(plan.mainTest);
  const [date, setDate] = useState(iso(TODAY));
  const [percent, setPercent] = useState("");
  const [place, setPlace] = useState("");
  const [notes, setNotes] = useState("");
  const [noteText, setNoteText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { pack, togglePack } = useHorseProgress(horse.id, log, onProgress);
  const groups = useMemo(() => packingList(plan.tests), [plan.tests]);
  const packIds = useMemo(
    () => groups.flatMap((g) => g.items.map((item) => packKey(g.id, item.id))),
    [groups],
  );
  const packDone = packIds.filter((id) => pack[id]).length;

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

  if (!log)
    return (
      <Card>
        <p className="text-sm text-muted">Loading…</p>
      </Card>
    );
  return (
    <div className="flex flex-col gap-4">
      <PlanResults
        results={log.results}
        horseId={horse.id}
        horseLevel={horse.level || plan.level}
        onUpdated={setLog}
      />
      <EvoReviewPanel
        pending={log.pendingEvoResults}
        horseId={horse.id}
        onReviewed={setLog}
        onError={onError}
      />
      <Card>
        <Kicker>Log a score</Kicker>
        <form
          className="mt-3 grid gap-2 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const pct = Number(percent.replace(",", "."));
            if (!Number.isFinite(pct) || pct <= 0 || pct > 100)
              return setErr("Enter a percentage between 0 and 100.");
            void run(() =>
              saveResult({
                data: {
                  horseId: horse.id,
                  result: {
                    id: `r-${Date.now()}`,
                    showName,
                    date,
                    test,
                    percent: pct,
                    place,
                    notes,
                    level: plan.level,
                    status: "ok",
                  },
                },
              }),
            ).then((ok) => ok && (setPercent(""), setPlace(""), setNotes("")));
          }}
        >
          <input
            className={inputCls}
            list="rider-shows"
            placeholder="Show"
            value={showName}
            onChange={(e) => setShowName(e.target.value)}
          />
          <datalist id="rider-shows">
            {plan.shows.map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>
          <input
            className={inputCls}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <select className={inputCls} value={test} onChange={(e) => setTest(e.target.value)}>
            {plan.tests.map((t) => (
              <option key={t}>{t}</option>
            ))}
            <option value="Other">Other</option>
          </select>
          <input
            className={inputCls}
            inputMode="decimal"
            placeholder="Percent e.g. 64.5"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
          />
          <input
            className={inputCls}
            placeholder="Place (optional)"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
          />
          <input
            className={inputCls}
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <PrimaryButton type="submit" disabled={busy} className="sm:col-span-2">
            Save score
          </PrimaryButton>
        </form>
        {err && <p className="mt-2 text-sm text-danger">{err}</p>}
        <ul className="mt-4 flex flex-col gap-2">
          {log.results.length === 0 && <li className="text-sm text-muted">No scores yet.</li>}
          {log.results.map((r) => {
            const ride = resolveRide(r);
            return (
            <li
              key={r.id}
              className="flex items-start justify-between gap-3 rounded-lg bg-bg p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-semibold">
                  {ride.family ?? "Test?"} · {r.percent != null ? `${r.percent.toFixed(1)}%` : r.status}
                  {r.place && <span className="font-normal text-muted"> · {r.place}</span>}
                </p>
                <p className="text-xs text-muted">
                  {[r.showName, fmtDay(r.date)].filter(Boolean).join(" · ")}
                </p>
                {r.notes && <p className="mt-1 text-xs text-faint">{r.notes}</p>}
              </div>
              {r.source !== "evo_csv" && (
                <button
                  type="button"
                  aria-label="Delete score"
                  className="cursor-pointer text-muted hover:text-danger"
                  onClick={() =>
                    void run(() =>
                      deleteEntry({ data: { horseId: horse.id, kind: "result", id: r.id } }),
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <Kicker>Pack for the next show</Kicker>
          <span className="font-mono text-xs text-muted tabular-nums">
            {packDone}/{packIds.length}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted">
          Tick this off for {horse.name}. The list is saved with this horse.
        </p>
        <div className="mt-3 space-y-4">
          {groups.map((g) => (
            <div key={g.id}>
              <p className="text-sm font-semibold">{g.title}</p>
              <ul className="mt-2 flex flex-col gap-1">
                {g.items.map((item) => {
                  const id = packKey(g.id, item.id);
                  const on = !!pack[id];
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => togglePack(id)}
                        className="flex min-h-11 w-full items-center gap-3 text-left text-sm"
                      >
                        {on ? (
                          <Check className="size-4 text-accent" />
                        ) : (
                          <Circle className="size-4 text-faint" />
                        )}
                        <span className={on ? "text-muted line-through" : ""}>{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <Kicker>Ride notes</Kicker>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!noteText.trim()) return;
            void run(() =>
              saveNote({
                data: {
                  horseId: horse.id,
                  note: { id: `n-${Date.now()}`, date: iso(TODAY), text: noteText.trim() },
                },
              }),
            ).then((ok) => ok && setNoteText(""));
          }}
        >
          <input
            className={inputCls}
            placeholder="How did today’s ride feel?"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy}
            className="cursor-pointer rounded-lg bg-accent px-4 text-sm font-bold text-accent-fg"
          >
            Add
          </button>
        </form>
        <ul className="mt-3 flex flex-col gap-2">
          {log.notes.map((n) => (
            <li
              key={n.id}
              className="flex items-start justify-between gap-3 rounded-lg bg-bg p-3 text-sm"
            >
              <div>
                <p className="text-xs text-faint">{fmtDay(n.date)}</p>
                <p className="whitespace-pre-line">{n.text}</p>
              </div>
              <button
                type="button"
                aria-label="Delete note"
                className="cursor-pointer text-muted hover:text-danger"
                onClick={() =>
                  void run(() =>
                    deleteEntry({ data: { horseId: horse.id, kind: "note", id: n.id } }),
                  )
                }
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <EvoSelfImportPanel horseId={horse.id} onImported={setLog} />
      <SheetsCard plan={plan} horse={horse} log={log} setLog={setLog} />
    </div>
  );
}

function EvoSelfImportPanel({
  horseId,
  onImported,
}: {
  horseId: string;
  onImported: (log: HorseLog) => void;
}) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<EvoPasteResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function preview() {
    setMessage(null);
    setParsed(parseEvoResultsPaste(text));
  }

  function changeText(value: string) {
    setText(value);
    setParsed(null);
    setMessage(null);
  }

  async function send(rows: EvoRow[]) {
    setBusy(true);
    setMessage(null);
    try {
      const result = await importOwnEvoResults({ data: { horseId, rows } });
      onImported(result.log);
      setText("");
      setParsed(null);
      setMessage(
        `${result.count} score${result.count === 1 ? "" : "s"} sent to Found on EVO Events below${
          result.duplicates
            ? `. ${result.duplicates} already imported, kept or marked not mine and skipped.`
            : "."
        }`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const rows = parsed?.rows ?? [];
  const dates = rows
    .map((row) => row.date)
    .filter(Boolean)
    .sort();
  const riders = [...new Set(rows.map((row) => row.rider.trim()).filter(Boolean))];
  return (
    <Card>
      <Kicker>Optional · paste an EVO table</Kicker>
      <p className="mt-2 text-sm text-muted">
        Scores that match the ESNZ number are already loaded. Paste a copied EVO table only if
        something is missing. You'll choose which extra scores to keep.
      </p>
      <textarea
        value={text}
        onChange={(event) => changeText(event.target.value)}
        rows={6}
        spellCheck={false}
        placeholder="Paste your copied results table here, including the column headings if you selected them."
        className="mt-3 w-full resize-y rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-accent"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <PrimaryButton type="button" onClick={preview} disabled={!text.trim() || busy}>
          Preview results
        </PrimaryButton>
        {text && (
          <button
            type="button"
            disabled={busy}
            className="rounded-lg border border-line px-3 py-2 text-sm"
            onClick={() => changeText("")}
          >
            Clear
          </button>
        )}
      </div>
      {parsed && (
        <div className="mt-3 rounded-lg bg-bg p-3 text-sm">
          <p className="font-semibold">
            {rows.length} dressage score{rows.length === 1 ? "" : "s"} found
          </p>
          {dates.length > 0 && (
            <p className="mt-1 text-xs text-muted">
              {fmtDay(dates[0])} – {fmtDay(dates[dates.length - 1])}
            </p>
          )}
          {riders.length > 0 && (
            <p className="mt-1 text-xs text-muted">Rider names found: {riders.join(", ")}</p>
          )}
          {parsed.skipped > 0 && (
            <p className="mt-1 text-xs text-faint">
              {parsed.skipped} row{parsed.skipped === 1 ? "" : "s"} skipped.
            </p>
          )}
          {parsed.warnings.map((warning) => (
            <p key={warning} className="mt-1 text-xs text-warn">
              {warning}
            </p>
          ))}
          {rows.length > 0 && (
            <PrimaryButton
              type="button"
              className="mt-3"
              disabled={busy}
              onClick={() => void send(rows)}
            >
              {busy ? "Sending…" : "Send to review"}
            </PrimaryButton>
          )}
        </div>
      )}
      {message && (
        <p className="mt-2 text-sm text-muted" role="status">
          {message}
        </p>
      )}
    </Card>
  );
}

function EvoReviewPanel({
  pending,
  horseId,
  onReviewed,
  onError,
}: {
  pending: PendingEvoResult[];
  horseId: string;
  onReviewed: (log: HorseLog) => void;
  onError: (message: string | null) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(pending.map((r) => r.id)));
  const [busy, setBusy] = useState(false);
  const ids = pending.map((r) => r.id);
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));

  async function review(action: "keep" | "reject") {
    const chosen = [...selected];
    if (!chosen.length) return onError("Choose at least one EVO score first.");
    setBusy(true);
    onError(null);
    try {
      const fn = action === "keep" ? keepEvoResults : rejectEvoResults;
      onReviewed(await fn({ data: { horseId, ids: chosen } }));
      setSelected(new Set());
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!pending.length) return null;
  return (
    <Card>
      <Kicker>Found on EVO Events</Kicker>
      <p className="mt-2 text-sm text-muted">
        If this horse had another rider before you, untick their scores.
      </p>
      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          className="size-4 accent-[var(--color-accent)]"
          checked={allSelected}
          disabled={busy}
          onChange={() => setSelected(allSelected ? new Set() : new Set(ids))}
        />
        Select all
      </label>
      <ul className="mt-2 flex flex-col gap-2">
        {pending.map((r) => (
          <li key={r.id}>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-bg p-3">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent)]"
                checked={selected.has(r.id)}
                disabled={busy}
                onChange={() =>
                  setSelected((current) => {
                    const next = new Set(current);
                    if (next.has(r.id)) next.delete(r.id);
                    else next.add(r.id);
                    return next;
                  })
                }
              />
              <span className="min-w-0 flex-1 text-sm">
                <span className="block font-semibold">
                  {r.test || "Test"} · {r.percent != null ? `${r.percent.toFixed(2)}%` : r.status}
                  {r.place && <span className="font-normal text-muted"> · {r.place}</span>}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {[r.showName || "Competition", fmtDay(r.date)].filter(Boolean).join(" · ")}
                </span>
                {r.className && r.className !== r.test && (
                  <span className="mt-0.5 block text-xs text-faint">Class: {r.className}</span>
                )}
                <span className="mt-0.5 block text-xs text-faint">
                  Rider on EVO: {r.riderName || "Not listed"}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <PrimaryButton type="button" disabled={busy} onClick={() => void review("keep")}>
          Keep selected
        </PrimaryButton>
        <button
          type="button"
          disabled={busy}
          onClick={() => void review("reject")}
          className="cursor-pointer rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink-soft disabled:opacity-60"
        >
          Not mine
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        Kept scores appear below. Scores marked “Not mine” are hidden and won’t be suggested again.
      </p>
    </Card>
  );
}

function SheetsCard({
  plan,
  horse,
  log,
  setLog,
}: {
  plan: GeneratedPlan;
  horse: HorseRecord;
  log: HorseLog;
  setLog: (l: HorseLog) => void;
}) {
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
      for (const f of Array.from(list).slice(0, MAX_SHEET_PHOTOS - files.length))
        next.push(await compressSheetPhoto(f));
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
          images: files.map((f) => ({
            imageBase64: f.dataUrl.slice(f.dataUrl.indexOf(",") + 1),
            mime: "image/jpeg",
          })),
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
          sheet: {
            id,
            kind: "sheet",
            showName,
            date: iso(TODAY),
            test: sheet.test && sheet.test !== "unknown" ? sheet.test : test,
            note: "",
            mime: "image/jpeg",
            sheet,
            photos,
          },
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
      <Kicker>Optional · judge sheet photo</Kicker>
      <p className="mt-2 text-sm text-muted">
        A photo is a second way to add a test. It does not replace scores already saved.
        Photograph the sheet (up to {MAX_SHEET_PHOTOS} pages). We read it and save the summary to
        your account; the photos stay on this device.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          className={inputCls}
          placeholder="Show"
          value={showName}
          onChange={(e) => setShowName(e.target.value)}
        />
        <select className={inputCls} value={test} onChange={(e) => setTest(e.target.value)}>
          {plan.tests.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-line px-3 py-3 text-sm font-semibold text-ink-soft">
        <ImagePlus className="size-4" />{" "}
        {files.length
          ? `${files.length} photo${files.length === 1 ? "" : "s"} — add more`
          : "Add sheet photos"}
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => void add(e.target.files).then(() => (e.target.value = ""))}
        />
      </label>
      {files.length > 0 && (
        <PrimaryButton type="button" className="mt-2" disabled={busy} onClick={() => void read()}>
          {busy ? "Reading the sheet…" : "Read the sheet"}
        </PrimaryButton>
      )}
      {err && <p className="mt-2 text-sm text-danger">{err}</p>}
      <ul className="mt-4 flex flex-col gap-3">
        {log.sheets
          .filter((x) => x.kind !== "video")
          .map((x) => (
            <li key={x.id} className="rounded-lg bg-bg p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">
                  {x.test}
                  {x.sheet?.percent != null && ` · ${x.sheet.percent}%`}
                  <span className="font-normal text-muted">
                    {" "}
                    · {[x.showName, fmtDay(x.date)].filter(Boolean).join(" · ")}
                  </span>
                </p>
                <button
                  type="button"
                  aria-label="Delete sheet"
                  className="cursor-pointer text-muted hover:text-danger"
                  onClick={() =>
                    void deleteEntry({ data: { horseId: horse.id, kind: "sheet", id: x.id } }).then(
                      setLog,
                    )
                  }
                >
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

function SetupTab({
  ws,
  plan,
  record,
  horse,
  onEdit,
}: {
  ws: Workspace;
  plan: GeneratedPlan;
  record: PlanRecord;
  horse: HorseRecord;
  onEdit: () => void;
}) {
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
        <p className="mt-2 text-xs text-muted">
          Rebuilding keeps your scores, notes, videos, coach visits and packing list.
        </p>
      </Card>
    </div>
  );
}

/**
 * Riders who used the earlier beta had their scores in this device's
 * localStorage (`xsalute-plan:<id>`). Offer a one-off import; localStorage is
 * left untouched either way.
 */
function LocalImportBanner({
  storageKey,
  horse,
  onImported,
}: {
  storageKey: string;
  horse: HorseRecord;
  onImported: (l: HorseLog) => void;
}) {
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
  if (!snap || !counts)
    return msg ? (
      <p className="mb-3 rounded-lg bg-accent/15 px-3 py-2 text-sm text-accent">{msg}</p>
    ) : null;
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
        {counts.scores} scores, {counts.notes} notes, {counts.sheets} judge sheets. Import them into{" "}
        {horse.name}? (If these are the example rider’s, skip this.) Nothing is removed from this
        device.
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
        <button
          type="button"
          className="cursor-pointer rounded-lg border border-line px-3 py-2 text-sm"
          onClick={dismiss}
        >
          Skip
        </button>
      </div>
    </Panel>
  );
}
