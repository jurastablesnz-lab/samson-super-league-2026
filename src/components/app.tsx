import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  ExternalLink,
  GraduationCap,
  Home,
  MapPin,
  NotebookPen,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { FreestyleBar } from "@/components/freestyle-player";
import { FilmBoard, ReviewNav, SheetBoard, type ReviewView } from "@/components/review";
import { TestsPanel } from "@/components/test-sheet";
import { cn } from "@/lib/utils";
import {
  COACH,
  LEVEL4,
  PACK,
  PAIR,
  PHASES,
  PRINCIPLES,
  RESULTS_NOTE,
  SHOWS,
  SUPER5_POINTS,
  TEST_OPTIONS,
  TODAY,
  WEEKS,
  daysUntil,
  entriesState,
  kindLabel,
  nextCoach,
  nextShow,
  phaseFor,
  weekFor,
  type Kind,
  type Session,
  type Show,
} from "@/lib/season";
import {
  isCountedScore,
  leagueFromScores,
  recordFromScores,
  showLabel,
  testKey,
  usePlan,
  type Level2Record,
  type Score,
  type TabId,
} from "@/lib/store";
import { EVO_HORSE } from "@/lib/records";

const TABS: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: "today", label: "Today", icon: Home },
  { id: "season", label: "Season", icon: CalendarDays },
  { id: "tests", label: "Tests", icon: Target },
  { id: "coach", label: "Coach", icon: GraduationCap },
  { id: "log", label: "Log", icon: NotebookPen },
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

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5", className)}>
      {children}
    </section>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">{children}</p>
  );
}

export function App() {
  const tab = usePlan((s) => s.tab);
  const setTab = usePlan((s) => s.setTab);

  useEffect(() => {
    const current = weekFor(TODAY);
    const idx = WEEKS.findIndex((w) => w.id === current.id);
    if (idx >= 0) usePlan.getState().setWeekIndex(idx);
  }, []);

  return (
    <div className="vd-glow min-h-dvh text-fg">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 pb-36 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <div className="mb-3 flex items-center gap-2.5">
          <img src="/brand/vdnz-icon.svg" alt="Virtual Dressage NZ" className="size-9 rounded-[10px] ring-1 ring-accent/30" />
          <div className="leading-tight">
            <p className="font-display text-[13px] font-extrabold tracking-[-0.01em] text-fg">
              Virtual Dressage <span className="text-accent">NZ</span>
            </p>
            <p className="text-[9.5px] font-semibold tracking-[0.22em] text-muted">PLAN · TRAIN · COMPETE · REFLECT</p>
          </div>
        </div>
        <header className="mb-4 flex items-end justify-between gap-3">
          <div>
            <Kicker>{PAIR.series}</Kicker>
            <h1 className="font-display mt-1 text-[1.65rem] leading-[1.05] font-extrabold tracking-[-0.03em] text-fg sm:text-[2rem]">
              Samson Super League 2026
            </h1>
            <p className="mt-1 text-sm text-muted">
              Compete {PAIR.level} · school {PAIR.school}
            </p>
            <p className="mt-0.5 text-xs text-faint">{PAIR.line}</p>
          </div>
          <PhasePill />
        </header>
        <Dashboard />
        <FreestyleBar />
        {tab === "today" && <Today />}
        {tab === "season" && <Season />}
        {tab === "tests" && <Tests />}
        {tab === "coach" && <Coach />}
        {tab === "log" && <Log />}
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur-md"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <ul className="mx-auto grid max-w-3xl grid-cols-5 px-2 pt-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = tab === t.id;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded-md text-[11px] font-medium transition-colors duration-150",
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

function PhasePill() {
  const phase = phaseFor(TODAY);
  return (
    <span className="mb-1 inline-flex max-w-[9.5rem] rounded-full bg-accent px-3 py-1 text-center text-[11px] font-semibold tracking-wide text-accent-fg uppercase">
      {phase.name}
    </span>
  );
}

function Dashboard() {
  const scores = usePlan((s) => s.scores);
  const setTab = usePlan((s) => s.setTab);
  const record = recordFromScores(scores);
  const show = nextShow();
  const entries = show ? entriesState(show) : null;
  const showDays = show ? daysUntil(show.start) : null;
  const showWhen = show
    ? show.start === show.end
      ? format(parseISO(show.start), "d MMM")
      : `${format(parseISO(show.start), "d")}–${format(parseISO(show.end), "d MMM")}`
    : "";
  const entriesTone =
    entries?.kind === "closed"
      ? "text-muted"
      : entries?.kind === "soon" || entries?.kind === "today"
        ? "text-warn"
        : "text-accent";

  return (
    <section className="mb-4 rounded-xl bg-surface p-3 shadow-[var(--shadow-card)] sm:p-4">
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setTab("log")}
          className="min-h-11 rounded-lg bg-bg px-2 py-3 text-left sm:px-3"
        >
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Best L2</p>
          <p className="font-display mt-1 text-xl leading-none font-medium tabular-nums text-good sm:text-2xl">
            {record.best ? `${record.best.percent.toFixed(1)}%` : "—"}
          </p>
          <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-faint">
            {record.best
              ? `${record.best.test}${
                  record.best.date ? ` · ${format(parseISO(record.best.date), "MMM yyyy")}` : ""
                }`
              : "Log a test"}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setTab("season")}
          className="min-h-11 rounded-lg bg-bg px-2 py-3 text-left sm:px-3"
        >
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Next show</p>
          <p className="font-display mt-1 text-xl leading-none font-medium tracking-[-0.03em] sm:text-2xl">
            {show?.short ?? "—"}
          </p>
          <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-faint">
            {show && showDays != null
              ? `${showWhen} · ${
                  showDays < 0 ? "done" : showDays === 0 ? "today" : `${showDays} day${showDays === 1 ? "" : "s"}`
                }`
              : "Season complete"}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setTab("season")}
          className="min-h-11 rounded-lg bg-bg px-2 py-3 text-left sm:px-3"
        >
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Entries</p>
          <p className={cn("font-display mt-1 text-xl leading-none font-medium tabular-nums sm:text-2xl", entriesTone)}>
            {entries?.when ?? "—"}
          </p>
          <p className={cn("mt-1.5 line-clamp-2 text-xs leading-snug", entriesTone === "text-warn" ? "text-warn" : "text-faint")}>
            {entries
              ? entries.kind === "closed"
                ? "Closed · late entries on Evo Events"
                : entries.kind === "today"
                  ? "Close today · 5pm"
                  : `${entries.headline} · confirm on Evo Events`
              : "—"}
          </p>
        </button>
      </div>
    </section>
  );
}

function RecordGlance() {
  const scores = usePlan((s) => s.scores);
  const record = recordFromScores(scores);
  if (!record.best) {
    return (
      <p className="mt-3 text-sm text-muted">
        No Level 2 scores yet. Add a test on the Log tab after the next show.
      </p>
    );
  }
  return (
    <p className="mt-3 text-sm">
      Level 2 record · best {record.best.percent.toFixed(1)}%
      <span className="text-muted"> · worst {record.worst!.percent.toFixed(1)}%</span>
      <span className="text-muted">
        {" "}
        · {record.count} test{record.count === 1 ? "" : "s"}
      </span>
    </p>
  );
}

function Today() {
  const week = weekFor(TODAY);
  const show = nextShow();
  const coach = nextCoach();
  const done = usePlan((s) => s.done);
  const toggle = usePlan((s) => s.toggleDone);
  const scores = usePlan((s) => s.scores);
  const league = leagueFromScores(scores);
  const todayIso = format(TODAY, "yyyy-MM-dd");
  const todaySession = week.sessions.find((s) => s.day === todayIso) ?? week.sessions[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {coach && (
          <Countdown
            kicker="Next coach"
            title={format(parseISO(coach.dates[0]), "d MMM")}
            days={daysUntil(coach.dates[0])}
            detail={coach.title.split("—")[1]?.trim() ?? coach.subtitle}
            onClick={() => usePlan.getState().setTab("coach")}
          />
        )}
        {show && (
          <Countdown
            kicker="Next Super 5"
            title={show.short}
            days={daysUntil(show.start)}
            detail={show.venue}
            onClick={() => usePlan.getState().setTab("season")}
          />
        )}
      </div>

      <Card>
        <Kicker>This week · {week.label}</Kicker>
        <h2 className="font-display mt-1 text-xl leading-snug font-medium">{week.headline}</h2>
        {week.caution && <p className="mt-2 text-sm text-warn">{week.caution}</p>}
        <ul className="mt-4 flex flex-col gap-2">
          {week.sessions.map((s) => (
            <SessionRow key={s.id} session={s} done={!!done[s.id]} onToggle={() => toggle(s.id)} />
          ))}
        </ul>
      </Card>

      <Card>
        <Kicker>Today</Kicker>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-medium">{todaySession.title}</h2>
            <p className="mt-1 text-sm text-muted">{todaySession.focus}</p>
          </div>
          <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", kindClass(todaySession.kind))}>
            {kindLabel(todaySession.kind)}
          </span>
        </div>
        {todaySession.minutes > 0 && (
          <p className="mt-2 font-mono text-xs text-faint tabular-nums">{todaySession.minutes} min</p>
        )}
        <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-sm leading-relaxed">
          {todaySession.how.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ol>
        {todaySession.note && <p className="mt-3 text-sm text-warn">{todaySession.note}</p>}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <Kicker>Super 5 points</Kicker>
          <span className="font-mono text-sm tabular-nums">
            {league.total} pts · {league.counting.length}/5
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-sunken">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-400"
            style={{ width: `${Math.min(100, (league.total / 50) * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-muted">
          Best five 2B scores count. 70% = 10, 65% = 7, 60% = 5. Target a season in the 35–50 band.
        </p>
        <RecordGlance />
        <Button variant="outline" size="sm" className="mt-3" onClick={() => usePlan.getState().setTab("log")}>
          Log a score
        </Button>
      </Card>

      <Card>
        <Kicker>How we ride this season</Kicker>
        <ul className="mt-3 flex flex-col gap-3">
          {PRINCIPLES.map((p) => (
            <li key={p.title}>
              <p className="text-sm font-semibold">{p.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted">{p.body}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Countdown({
  kicker,
  title,
  days,
  detail,
  onClick,
}: {
  kicker: string;
  title: string;
  days: number;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl bg-surface p-4 text-left shadow-[var(--shadow-card)]">
      <Kicker>{kicker}</Kicker>
      <p className="font-display mt-1 text-2xl leading-none font-medium tracking-[-0.03em]">{title}</p>
      <p className="mt-2 font-mono text-xs text-accent tabular-nums">
        {days < 0 ? "Done" : days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"}`}
      </p>
      <p className="mt-1 line-clamp-2 text-sm text-muted">{detail}</p>
    </button>
  );
}

function SessionRow({
  session,
  done,
  onToggle,
}: {
  session: Session;
  done: boolean;
  onToggle: () => void;
}) {
  const d = parseISO(session.day);
  return (
    <li className="flex items-start gap-3 rounded-lg bg-bg p-3">
      <button
        type="button"
        onClick={onToggle}
        className="relative mt-0.5 size-6 shrink-0 after:absolute after:top-1/2 after:left-1/2 after:size-11 after:-translate-x-1/2 after:-translate-y-1/2"
        aria-label={done ? "Mark not done" : "Mark done"}
      >
        {done ? <Check className="size-5 text-accent" /> : <Circle className="size-5 text-faint" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={cn("text-sm font-semibold", done && "text-muted line-through")}>
            {format(d, "EEE d")} · {session.title}
          </p>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", kindClass(session.kind))}>
            {kindLabel(session.kind)}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-muted">{session.focus}</p>
      </div>
    </li>
  );
}

function Season() {
  const idx = usePlan((s) => s.weekIndex);
  const setIdx = usePlan((s) => s.setWeekIndex);
  const done = usePlan((s) => s.done);
  const toggle = usePlan((s) => s.toggleDone);
  const week = WEEKS[Math.min(idx, WEEKS.length - 1)] ?? WEEKS[0];
  const currentId = weekFor(TODAY).id;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <Kicker>Campaign</Kicker>
        <h2 className="font-display mt-1 text-xl font-medium">Five Super 5 scores, then Nationals</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          North Island league, Level 2. NHB, Taihape and Taranaki all count. Dates for area shows follow
          the usual Premier League pattern — confirm each one on Evo Events. Nationals is locked: 12–14
          March 2027, Taupō.
        </p>
        <ol className="mt-4 flex flex-col gap-3">
          {SHOWS.map((show) => (
            <ShowCard
              key={show.id}
              show={show}
              index={show.optional ? 0 : SHOWS.filter((s) => !s.optional).indexOf(show) + 1}
            />
          ))}
        </ol>
      </Card>

      <Card>
        <Kicker>Phases</Kicker>
        <ul className="mt-3 flex flex-col gap-3">
          {PHASES.map((p) => {
            const on = phaseFor(TODAY).id === p.id;
            return (
              <li key={p.id} className={cn("rounded-lg p-3", on ? "bg-accent text-accent-fg" : "bg-bg")}>
                <p className="text-sm font-semibold">
                  {p.name}
                  <span className={cn("ml-2 text-xs font-normal", on ? "text-accent-fg/80" : "text-muted")}>
                    {format(parseISO(p.start), "d MMM")} – {format(parseISO(p.end), "d MMM")}
                  </span>
                </p>
                <p className={cn("mt-1 text-sm leading-relaxed", on ? "text-accent-fg/90" : "text-muted")}>
                  {p.intent}
                </p>
                <p className={cn("mt-2 text-xs leading-relaxed", on ? "text-accent-fg/80" : "text-faint")}>
                  School: {p.schoolAbove}
                </p>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-2">
          <div>
            <Kicker>Week plan</Kicker>
            <h2 className="font-display mt-1 text-xl font-medium">{week.label}</h2>
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-11"
              disabled={idx <= 0}
              onClick={() => setIdx(Math.max(0, idx - 1))}
              aria-label="Previous week"
            >
              <ChevronLeft className="size-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-11"
              disabled={idx >= WEEKS.length - 1}
              onClick={() => setIdx(Math.min(WEEKS.length - 1, idx + 1))}
              aria-label="Next week"
            >
              <ChevronRight className="size-5" />
            </Button>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted">{week.headline}</p>
        {week.id === currentId && <p className="mt-1 text-xs font-semibold text-accent">This week</p>}
        {week.caution && <p className="mt-2 text-sm text-warn">{week.caution}</p>}
        <ul className="mt-4 flex flex-col gap-2">
          {week.sessions.map((s) => (
            <SessionRow key={s.id} session={s} done={!!done[s.id]} onToggle={() => toggle(s.id)} />
          ))}
        </ul>
        {week.sessions.some((s) => s.how.length > 0 && (s.kind === "coach" || s.kind === "show")) && (
          <div className="mt-4 space-y-3">
            {week.sessions
              .filter((s) => s.kind === "coach" || s.kind === "show" || s.kind === "travel")
              .map((s) => (
                <div key={s.id + "-d"} className="rounded-lg bg-bg p-3">
                  <p className="text-sm font-semibold">{s.title}</p>
                  <ol className="mt-1 list-decimal space-y-1 pl-4 text-sm text-muted">
                    {s.how.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ol>
                </div>
              ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ShowCard({ show, index }: { show: Show; index: number }) {
  const [open, setOpen] = useState(false);
  const days = daysUntil(show.start);
  const entries = entriesState(show);
  return (
    <li className={cn("rounded-lg bg-bg p-3", show.optional && "opacity-80")}>
      <button type="button" className="flex w-full items-start gap-3 text-left" onClick={() => setOpen((v) => !v)}>
        <span className="font-mono mt-0.5 w-6 text-xs text-faint tabular-nums">{show.optional ? "—" : index}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{show.short}</p>
          <p className="text-sm text-muted">
            {format(parseISO(show.start), "d MMM")}
            {show.start !== show.end ? `–${format(parseISO(show.end), "d")}` : ""} · {show.venue}
          </p>
          <p className={cn("mt-0.5 text-xs", entries.kind === "soon" || entries.kind === "today" ? "text-warn" : "text-faint")}>
            {entries.kind === "closed" ? `Entries closed ${entries.when}` : `Entries close ${entries.when}`}
          </p>
        </div>
        <span className="shrink-0 text-xs text-faint tabular-nums">
          {days < 0 ? "Done" : show.optional ? "Optional" : `${days}d`}
        </span>
      </button>
      {open && (
        <div className="mt-3 space-y-2 border-t border-line pt-3 text-sm leading-relaxed">
          <p className="text-muted">{show.dateNote}</p>
          <p>
            <MapPin className="mr-1 inline size-3.5" /> {show.travel}
          </p>
          <p>{show.stay}</p>
          <p className="font-medium">{show.goal}</p>
          <p className="text-muted">{show.tests.join(" · ")}</p>
          <ul className="list-disc space-y-1 pl-4 text-muted">
            {show.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

function Tests() {
  return (
    <div className="flex flex-col gap-4">
      <TestsPanel />
      <Card>
        <Kicker>School above the level</Kicker>
        <h2 className="font-display mt-1 text-xl font-medium">Level 4 gymnastic</h2>
        <p className="mt-2 text-sm text-muted">
          Three sessions a week in Foundation, Consolidate and Strength. Park it ten days before a Super 5.
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {LEVEL4.map((m) => (
            <li key={m.title} className="rounded-lg bg-bg p-3">
              <p className="text-sm font-semibold">{m.title}</p>
              <p className="mt-1 text-sm text-muted">{m.why}</p>
              <p className="mt-1 text-sm">{m.how}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Coach() {
  const [view, setView] = useState<ReviewView>("visits");
  return (
    <div className="flex flex-col gap-4">
      <ReviewNav view={view} setView={setView} />
      {view === "visits" && <CoachVisits />}
      {view === "videos" && <FilmBoard />}
      {view === "sheets" && <SheetBoard />}
    </div>
  );
}

function CoachVisits() {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <Kicker>Three visits</Kicker>
        <h2 className="font-display mt-1 text-xl font-medium">Use her, then ride the plan</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          14 Oct is a polish, 4 Nov is a debrief, 5–6 Dec is the training peak. Film every time. Competition videos
          and photographed judge sheets are on Videos and Sheets. Do not invent a fourth programme at home the next
          morning.
        </p>
      </Card>
      {COACH.map((c) => (
        <Card key={c.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Kicker>{c.dates.map((d) => format(parseISO(d), "d MMM")).join(" · ")}</Kicker>
              <h2 className="font-display mt-1 text-xl font-medium">{c.title.split("—")[1]?.trim() ?? c.title}</h2>
            </div>
            <Sparkles className="size-5 shrink-0 text-accent" />
          </div>
          <p className="mt-2 text-sm text-muted">{c.subtitle}</p>
          <ul className="mt-4 flex flex-col gap-3">
            {c.agenda.map((a) => (
              <li key={a.title} className="rounded-lg bg-bg p-3">
                <p className="text-sm font-semibold">{a.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{a.detail}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            <span className="font-semibold">Film: </span>
            {c.film}
          </p>
          <div className="mt-3">
            <p className="text-sm font-semibold">Homework</p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-muted">
              {c.homework.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
          <div className="mt-3 rounded-lg bg-sunken p-3">
            <p className="text-sm font-semibold">Leave it</p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-muted">
              {c.doNot.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
        </Card>
      ))}
    </div>
  );
}

function RecordBoard({ record }: { record: Level2Record }) {
  const twoB = record.byTest.find((t) => t.key === "2B");
  return (
    <Card>
      <Kicker>Jura Samson · Level 2 record</Kicker>
      <h2 className="font-display mt-1 text-xl font-medium">
        {record.best ? `${record.best.percent.toFixed(1)}% best` : "No scores yet"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{RESULTS_NOTE}</p>
      <a
        href={EVO_HORSE.url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-accent"
      >
        Open on EvoEvents
        <ExternalLink className="size-3.5" />
      </a>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat
          label="Best"
          value={record.best ? `${record.best.percent.toFixed(1)}%` : "—"}
          hint={record.best ? `${record.best.test} · ${showLabel(record.best)}` : "Add a test"}
          good
        />
        <Stat
          label="Worst"
          value={record.worst ? `${record.worst.percent.toFixed(1)}%` : "—"}
          hint={record.worst && record.count > 1 ? showLabel(record.worst) : "—"}
        />
        <Stat
          label="Tests"
          value={String(record.count)}
          hint={record.count ? `avg ${record.avg.toFixed(1)}%` : "waiting"}
        />
      </div>
      {twoB?.best && (
        <p className="mt-3 text-sm text-muted">
          2B personal best {twoB.best.percent.toFixed(1)}%
          {twoB.worst && twoB.count > 1 ? ` · Super 5 last season 62.7%` : ""}
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-lg bg-bg">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
              <th className="px-3 py-2">Test</th>
              <th className="px-3 py-2 text-right">Best</th>
              <th className="px-3 py-2 text-right">Worst</th>
            </tr>
          </thead>
          <tbody>
            {record.byTest.map((row) => (
              <tr key={row.key} className="border-t border-line">
                <td className="px-3 py-2 font-medium">
                  {row.key}
                  <span className="ml-2 text-xs font-normal text-faint">
                    {row.count ? `${row.count}` : "—"}
                  </span>
                </td>
                <td className="font-mono px-3 py-2 text-right tabular-nums text-good">
                  {row.best ? `${row.best.percent.toFixed(1)}%` : "—"}
                </td>
                <td className="font-mono px-3 py-2 text-right tabular-nums">
                  {row.worst && row.count > 1 ? `${row.worst.percent.toFixed(1)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Stat({
  label,
  value,
  hint,
  good,
}: {
  label: string;
  value: string;
  hint: string;
  good?: boolean;
}) {
  return (
    <div className="rounded-lg bg-bg px-3 py-3">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">{label}</p>
      <p className={cn("font-display mt-1 text-xl font-medium tabular-nums", good && "text-good")}>{value}</p>
      <p className="mt-0.5 truncate text-xs text-faint">{hint}</p>
    </div>
  );
}

function ScoreRow({
  score,
  isBest,
  isWorst,
  isPb,
  isTestPb,
  onRemove,
}: {
  score: Score;
  isBest: boolean;
  isWorst: boolean;
  isPb: boolean;
  isTestPb: boolean;
  onRemove: () => void;
}) {
  const eliminated = score.status === "E";
  const mark = eliminated ? "E" : isCountedScore(score) ? `${score.percent.toFixed(1)}%` : "—";
  return (
    <li className="flex items-start justify-between gap-2 rounded-lg bg-bg p-3 text-sm">
      <div className="min-w-0">
        <p className="font-medium">
          {showLabel(score)} · {score.test} · {mark}
        </p>
        <p className="mt-0.5 text-xs text-faint">
          {score.date ? format(parseISO(score.date), "d MMM yyyy") : "No date"}
          {score.place ? ` · ${score.place}` : ""}
          {score.level && score.level !== "L2" ? ` · ${score.level}` : ""}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {score.official && (
            <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-semibold text-muted">
              EvoEvents
            </span>
          )}
          {eliminated && (
            <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-semibold text-muted">
              Eliminated
            </span>
          )}
          {isBest && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-fg">Best</span>
          )}
          {isPb && !isBest && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">PB</span>
          )}
          {isTestPb && !isBest && (
            <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-semibold text-muted">
              {testKey(score.test)} PB
            </span>
          )}
          {isWorst && (
            <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-semibold text-muted">Worst</span>
          )}
        </div>
        {score.notes && <p className="mt-1 text-muted">{score.notes}</p>}
      </div>
      {!score.official && (
        <button type="button" className="relative size-6 shrink-0 after:absolute after:inset-[-12px]" onClick={onRemove} aria-label="Remove score">
          <Trash2 className="size-4 text-muted" />
        </button>
      )}
    </li>
  );
}

function CareerList({ scores }: { scores: Score[] }) {
  const [filter, setFilter] = useState<"L2" | "all">("L2");
  const rows = useMemo(() => {
    const list = scores.filter((s) => (filter === "all" ? true : s.level === "L2" || !s.level));
    return [...list].sort((a, b) => {
      const da = a.date ?? "";
      const db = b.date ?? "";
      if (da !== db) return db.localeCompare(da);
      return b.id.localeCompare(a.id);
    });
  }, [scores, filter]);

  const years = useMemo(() => {
    const map = new Map<string, Score[]>();
    for (const s of rows) {
      const y = s.date ? s.date.slice(0, 4) : "Undated";
      const bucket = map.get(y) ?? [];
      bucket.push(s);
      map.set(y, bucket);
    }
    return [...map.entries()];
  }, [rows]);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Kicker>Official outings</Kicker>
          <h2 className="font-display mt-1 text-xl font-medium">EvoEvents career</h2>
        </div>
        <div className="flex gap-1">
          {(["L2", "all"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={cn(
                "h-11 rounded-full px-3 text-sm font-medium",
                filter === id ? "bg-accent text-accent-fg" : "bg-bg text-fg",
              )}
            >
              {id === "all" ? "All" : "Level 2"}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 text-sm text-muted">
        {EVO_HORSE.colour} {EVO_HORSE.breed.toLowerCase()} gelding, {EVO_HORSE.heightCm}cm.{" "}
        {EVO_HORSE.sire} × {EVO_HORSE.dam}. Breeding not verified on EvoEvents.
      </p>
      <div className="mt-4 flex flex-col gap-4">
        {years.map(([year, list]) => (
          <div key={year}>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">{year}</p>
            <ul className="mt-2 flex flex-col gap-2">
              {list.map((s) => {
                const mark =
                  s.status === "E" ? "E" : isCountedScore(s) ? `${s.percent.toFixed(1)}%` : "—";
                return (
                  <li key={s.id}>
                    <a
                      href={s.eventUrl ?? EVO_HORSE.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start justify-between gap-3 rounded-lg bg-bg p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {s.test} · {mark}
                          {s.place ? ` · ${s.place}` : ""}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-faint">
                          {s.date ? format(parseISO(s.date), "d MMM") : ""} · {showLabel(s)}
                        </p>
                      </div>
                      <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-faint" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Log() {
  const scores = usePlan((s) => s.scores);
  const addScore = usePlan((s) => s.addScore);
  const removeScore = usePlan((s) => s.removeScore);
  const notes = usePlan((s) => s.notes);
  const addNote = usePlan((s) => s.addNote);
  const removeNote = usePlan((s) => s.removeNote);
  const pack = usePlan((s) => s.pack);
  const togglePack = usePlan((s) => s.togglePack);
  const league = leagueFromScores(scores);
  const record = recordFromScores(scores);
  const [showId, setShowId] = useState(SHOWS[1].id);
  const [pastName, setPastName] = useState("");
  const [test, setTest] = useState<(typeof TEST_OPTIONS)[number]>("2B Super 5");
  const [percent, setPercent] = useState("68.0");
  const [place, setPlace] = useState("");
  const [scoreDate, setScoreDate] = useState(format(TODAY, "yyyy-MM-dd"));
  const [scoreNotes, setScoreNotes] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteDate, setNoteDate] = useState(format(TODAY, "yyyy-MM-dd"));
  const [flash, setFlash] = useState<string | null>(null);

  const packDone = useMemo(() => {
    const ids = PACK.flatMap((g) => g.items.map((i) => `${g.id}:${i}`));
    const n = ids.filter((id) => pack[id]).length;
    return { n, t: ids.length };
  }, [pack]);

  const sortedScores = useMemo(() => {
    return [...scores].sort((a, b) => {
      const da = a.date ?? "";
      const db = b.date ?? "";
      if (da !== db) return db.localeCompare(da);
      return b.id.localeCompare(a.id);
    });
  }, [scores]);

  return (
    <div className="flex flex-col gap-4">
      <RecordBoard record={record} />
      <CareerList scores={scores} />

      <Card>
        <Kicker>League</Kicker>
        <h2 className="font-display mt-1 text-xl font-medium">{league.total} points</h2>
        <p className="mt-1 text-sm text-muted">
          {league.counting.length} counting score{league.counting.length === 1 ? "" : "s"}
          {league.counting.length ? ` · avg ${league.avg.toFixed(2)}%` : ""}. Ties broken on average of the top five.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {SUPER5_POINTS.map((p) => (
            <li key={p.min} className="rounded-full bg-sunken px-3 py-1 text-xs font-medium">
              {p.label} · {p.pts} pts
            </li>
          ))}
        </ul>
        {league.super5.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No Super 5 scores yet. Add 2B percentages after BOP.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {league.super5.map((s, i) => (
              <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg bg-bg px-3 py-2 text-sm">
                <span>
                  {showLabel(s)} · {s.test}
                  {i < 5 && <span className="ml-2 text-xs text-accent">counts</span>}
                </span>
                <span className="font-mono tabular-nums">
                  {s.percent.toFixed(2)}% · {s.pts} pts
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <Kicker>Add a result</Kicker>
        <p className="mt-2 text-sm text-muted">
          Super 5 2B scores feed this season's league. Past EvoEvents tests are already on the board.
        </p>
        <form
          className="mt-3 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const pct = Number(percent);
            if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return;
            const name = showId === "past" ? pastName.trim() : undefined;
            if (showId === "past" && !name) return;
            const prevBest = record.best?.percent ?? -Infinity;
            const testBest = record.byTest.find((t) => t.key === testKey(test))?.best?.percent ?? -Infinity;
            addScore({
              showId,
              showName: name,
              date: scoreDate,
              test,
              percent: pct,
              notes: scoreNotes,
              place: place.trim() || undefined,
            });
            if (pct > prevBest) setFlash(`New personal best · ${pct.toFixed(2)}%`);
            else if (pct > testBest) setFlash(`New ${testKey(test)} personal best · ${pct.toFixed(2)}%`);
            else setFlash(null);
            setScoreNotes("");
            setPlace("");
          }}
        >
          <label className="text-sm">
            Date
            <input
              type="date"
              value={scoreDate}
              onChange={(e) => setScoreDate(e.target.value)}
              className="mt-1 h-11 w-full rounded-md bg-bg px-3 text-sm shadow-[var(--shadow-card)]"
            />
          </label>
          <label className="text-sm">
            Show
            <select
              className="mt-1 h-11 w-full rounded-md bg-bg px-3 text-sm shadow-[var(--shadow-card)]"
              value={showId}
              onChange={(e) => setShowId(e.target.value)}
            >
              {SHOWS.filter((s) => !s.optional).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.short}
                </option>
              ))}
              <option value="past">Past show / other</option>
            </select>
          </label>
          {showId === "past" && (
            <label className="text-sm">
              Show name
              <input
                value={pastName}
                onChange={(e) => setPastName(e.target.value)}
                placeholder="e.g. Dressage Central Districts, Feb 2025"
                className="mt-1 h-11 w-full rounded-md bg-bg px-3 text-sm shadow-[var(--shadow-card)]"
              />
            </label>
          )}
          <label className="text-sm">
            Test
            <select
              className="mt-1 h-11 w-full rounded-md bg-bg px-3 text-sm shadow-[var(--shadow-card)]"
              value={test}
              onChange={(e) => setTest(e.target.value as (typeof TEST_OPTIONS)[number])}
            >
              {TEST_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Percentage
              <input
                inputMode="decimal"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                className="mt-1 h-11 w-full rounded-md bg-bg px-3 font-mono text-sm shadow-[var(--shadow-card)] tabular-nums"
              />
            </label>
            <label className="text-sm">
              Place
              <input
                inputMode="numeric"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="optional"
                className="mt-1 h-11 w-full rounded-md bg-bg px-3 font-mono text-sm shadow-[var(--shadow-card)] tabular-nums"
              />
            </label>
          </div>
          <label className="text-sm">
            Judge notes
            <textarea
              value={scoreNotes}
              onChange={(e) => setScoreNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md bg-bg px-3 py-2 text-sm shadow-[var(--shadow-card)]"
              placeholder="Throughness, accuracy, that stretch circle…"
            />
          </label>
          <Button type="submit">Save score</Button>
          {flash && <p className="text-sm font-semibold text-good">{flash}</p>}
        </form>
        {sortedScores.filter((s) => !s.official).length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {sortedScores
              .filter((s) => !s.official)
              .map((s) => (
              <ScoreRow
                key={s.id}
                score={s}
                isBest={record.best?.id === s.id}
                isWorst={record.worst?.id === s.id && record.count > 1}
                isPb={record.pbIds.has(s.id)}
                isTestPb={record.testPbIds.has(s.id)}
                onRemove={() => removeScore(s.id)}
              />
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <Kicker>Pack for the next show</Kicker>
          <span className="font-mono text-xs text-muted tabular-nums">
            {packDone.n}/{packDone.t}
          </span>
        </div>
        <div className="mt-3 space-y-4">
          {PACK.map((g) => (
            <div key={g.id}>
              <p className="text-sm font-semibold">{g.title}</p>
              <ul className="mt-2 flex flex-col gap-1">
                {g.items.map((item) => {
                  const id = `${g.id}:${item}`;
                  const on = !!pack[id];
                  return (
                    <li key={id}>
                      <button type="button" onClick={() => togglePack(id)} className="flex min-h-11 w-full items-center gap-3 text-left text-sm">
                        {on ? <Check className="size-4 text-accent" /> : <Circle className="size-4 text-faint" />}
                        <span className={on ? "text-muted line-through" : ""}>{item}</span>
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
          className="mt-3 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!noteText.trim()) return;
            addNote(noteDate, noteText.trim());
            setNoteText("");
          }}
        >
          <input
            type="date"
            value={noteDate}
            onChange={(e) => setNoteDate(e.target.value)}
            className="h-11 rounded-md bg-bg px-3 text-sm shadow-[var(--shadow-card)]"
          />
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            placeholder="How he felt, what the coach said, what to repeat…"
            className="rounded-md bg-bg px-3 py-2 text-sm shadow-[var(--shadow-card)]"
          />
          <Button type="submit" variant="secondary">
            Add note
          </Button>
        </form>
        <ul className="mt-4 flex flex-col gap-2">
          {notes.length === 0 && <li className="text-sm text-muted">Nothing logged yet.</li>}
          {notes.map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-2 rounded-lg bg-bg p-3">
              <div>
                <p className="text-xs text-faint">{format(parseISO(n.date), "d MMM yyyy")}</p>
                <p className="mt-1 text-sm leading-relaxed">{n.text}</p>
              </div>
              <button type="button" className="relative size-6 after:absolute after:inset-[-12px]" onClick={() => removeNote(n.id)} aria-label="Delete note">
                <Trash2 className="size-4 text-muted" />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <p className="px-1 pb-2 text-xs leading-relaxed text-faint">
        Training plan only — not veterinary advice. Super 5 conditions: top five scores, 2B from memory, points on
        percentage bands. Confirm 2026–27 Premier League dates and entries on Evo Events.
      </p>
    </div>
  );
}
