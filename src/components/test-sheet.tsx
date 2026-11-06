import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FreestyleCard } from "@/components/freestyle-player";
import { cn } from "@/lib/utils";
import {
  COLLECTIVES,
  MFS_SHEET,
  NOVICE_INSTRUCTIONS,
  NOVICE_PURPOSE,
  SET_TESTS,
  marksFor,
  type Draw,
  type Movement,
  type Pace,
  type SetTest,
  type TestTabId,
} from "@/lib/esnz-tests";
import { MFS_FLOOR, PACE_LABEL } from "@/lib/freestyle-floor";
import {
  BOT,
  CORNER_RX,
  CORNER_RY,
  CX,
  LEFT,
  LETTER_IDS,
  M_PX,
  RIGHT,
  TOP,
  circleCenter,
  halfArc,
  label,
  loopPath,
  linePath,
  returningHalfArc,
  track,
} from "@/lib/arena-geom";

function ptsTo(d: Draw): string[] {
  switch (d.t) {
    case "line":
      return d.pts;
    case "diag":
    case "yield":
    case "loop":
    case "half":
      return [d.from, d.to];
    case "return-half":
      return [d.from, "X", d.to];
    case "circle":
    case "stretch":
    case "halt":
    case "change":
      return [d.at];
  }
}

function strokeFor(pace: Pace | undefined, accent: boolean) {
  if (!accent) return "var(--color-ink-soft)";
  switch (pace) {
    case "walk":
    case "free":
      return "var(--color-warn)";
    case "canter":
    case "medium-canter":
      return "var(--color-ink-soft)";
    default:
      return "var(--color-accent)";
  }
}

function dashFor(d: Draw, pace?: Pace) {
  if (d.t === "diag" || d.t === "stretch") return "6 4";
  if (d.t === "yield" || pace === "yield") return "2 3";
  if (pace === "medium" || pace === "medium-canter" || pace === "free") return "6 4";
  return undefined;
}

function MovementPath({ draw, accent, pace }: { draw: Draw[]; accent?: boolean; pace?: Pace }) {
  const stroke = strokeFor(pace, !!accent);
  const width = accent ? 2.4 : 1.6;
  return (
    <g fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round">
      {draw.map((d, i) => {
        const key = `${d.t}-${i}`;
        const dash = dashFor(d, pace);
        if (d.t === "line") {
          return <path key={key} d={linePath(d.pts)} strokeWidth={width} strokeDasharray={dash} />;
        }
        if (d.t === "diag" || d.t === "yield") {
          const a = track(d.from);
          const b = track(d.to);
          return (
            <line
              key={key}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              strokeWidth={width}
              strokeDasharray={d.t === "yield" ? "2 3" : "6 4"}
            />
          );
        }
        if (d.t === "loop") {
          return <path key={key} d={loopPath(d.from, d.to)} strokeWidth={width} />;
        }
        if (d.t === "half" || d.t === "return-half") {
          const dPath =
            d.t === "half"
              ? halfArc(d.from, d.to, d.bulge)
              : returningHalfArc(d.from, d.to, d.bulge);
          return <path key={key} d={dPath} strokeWidth={width} strokeDasharray={dash} />;
        }
        if (d.t === "circle" || d.t === "stretch") {
          const m = d.t === "stretch" ? 20 : d.m;
          const c = circleCenter(d.at, m / 2);
          return (
            <ellipse
              key={key}
              cx={c.x}
              cy={c.y}
              rx={(m / 2) * M_PX.x}
              ry={(m / 2) * M_PX.y}
              strokeWidth={width}
              strokeDasharray={d.t === "stretch" ? "6 4" : dash}
            />
          );
        }
        if (d.t === "halt") {
          const p = track(d.at);
          return (
            <g key={key}>
              <line x1={p.x - 7} y1={p.y} x2={p.x + 7} y2={p.y} strokeWidth={2.6} />
              <line x1={p.x} y1={p.y - 5} x2={p.x} y2={p.y + 5} strokeWidth={1.4} opacity={0.7} />
            </g>
          );
        }
        if (d.t === "change") {
          const p = track(d.at);
          return (
            <g key={key}>
              <circle cx={p.x} cy={p.y} r="5" fill="var(--color-surface)" strokeWidth={2} />
              <path
                d={`M ${p.x - 5} ${p.y} L ${p.x} ${p.y - 6} L ${p.x + 5} ${p.y}`}
                strokeWidth={1.8}
              />
            </g>
          );
        }
        return null;
      })}
    </g>
  );
}

function TestArena({ movement, ghostMoves }: { movement: Movement; ghostMoves?: Movement[] }) {
  const used = useMemo(() => {
    const set = new Set<string>();
    for (const d of movement.draw) for (const id of ptsTo(d)) set.add(id);
    for (const s of movement.steps) {
      for (const tok of s.at.split(/[\s&]+/)) {
        const t = tok.replace(/[^A-Z]/g, "");
        if (t.length === 1) set.add(t);
      }
    }
    return set;
  }, [movement]);

  return (
    <svg
      viewBox="0 0 220 272"
      className="h-auto w-full"
      role="img"
      aria-label={`Arena diagram, movement ${movement.n}`}
    >
      <rect
        x={LEFT}
        y={TOP}
        width={RIGHT - LEFT}
        height={BOT - TOP}
        rx={CORNER_RX}
        ry={CORNER_RY}
        fill="var(--color-sunken)"
        stroke="var(--color-accent)"
        strokeWidth="1.6"
      />
      <line
        x1={CX}
        y1={TOP}
        x2={CX}
        y2={BOT}
        stroke="var(--color-line)"
        strokeWidth="0.8"
        strokeDasharray="3 3"
      />
      <line
        x1={LEFT}
        y1={134}
        x2={RIGHT}
        y2={134}
        stroke="var(--color-line)"
        strokeWidth="0.8"
        strokeDasharray="3 3"
      />
      {ghostMoves
        ? ghostMoves.map((gm) => (
            <g key={gm.n} opacity={0.18} strokeDasharray="3 3" aria-hidden="true">
              <MovementPath draw={gm.draw} pace={gm.pace} />
            </g>
          ))
        : null}
      <g data-active-movement={`${movement.n}`}>
        <MovementPath draw={movement.draw} accent pace={movement.pace} />
      </g>
      {LETTER_IDS.map((id) => {
        const p = label(id);
        const on = used.has(id);
        return (
          <g key={id}>
            <circle
              cx={p.x}
              cy={p.y}
              r={on ? 10 : 8}
              fill={on ? "var(--color-accent)" : "var(--color-surface)"}
              stroke="var(--color-accent)"
              strokeWidth="1"
            />
            <text
              x={p.x}
              y={p.y + 3.4}
              textAnchor="middle"
              fontSize={on ? 10 : 9}
              fontFamily="var(--font-sans)"
              fontWeight="700"
              fill={on ? "var(--color-accent-fg)" : "var(--color-fg)"}
            >
              {id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Coeff({ n }: { n: number }) {
  if (n <= 1) return null;
  return (
    <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-accent uppercase">
      ×{n}
    </span>
  );
}

function Caller({
  movements,
  idx,
  setIdx,
  kicker,
  title,
  meta,
  purpose,
  judge,
  trail,
}: {
  movements: Movement[];
  idx: number;
  setIdx: (n: number) => void;
  kicker: string;
  title: string;
  meta: string;
  purpose?: string;
  judge?: boolean;
  trail?: "last";
}) {
  const movement = movements[Math.min(idx, movements.length - 1)] ?? movements[0];
  // Set tests show only their selected movement, like the official panels.
  // The freestyle's own floorplan retains a single, subtle previous-movement
  // trail so its bespoke sequence remains readable.
  const ghostMoves = trail === "last" ? movements.slice(Math.max(0, idx - 1), idx) : undefined;

  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
            {kicker}
          </p>
          <h2 className="font-display mt-1 text-xl font-medium">{title}</h2>
          <p className="mt-1 font-mono text-xs text-faint">{meta}</p>
        </div>
        <p className="font-mono shrink-0 pt-1 text-xs text-faint tabular-nums">
          {movement.n}/{movements.length}
        </p>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="size-11"
          disabled={idx <= 0}
          onClick={() => setIdx(Math.max(0, idx - 1))}
          aria-label="Previous movement"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1 rounded-lg bg-bg px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-lg leading-tight font-medium tracking-[-0.02em]">
              {movement.steps
                .map((s) => s.at)
                .filter(Boolean)
                .join(" · ") || `Movement ${movement.n}`}
            </p>
            <Coeff n={movement.coeff ?? 1} />
            {movement.pace && (
              <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted uppercase">
                {PACE_LABEL[movement.pace]}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm leading-snug">{movement.steps.map((s) => s.do).join(". ")}</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="size-11"
          disabled={idx >= movements.length - 1}
          onClick={() => setIdx(Math.min(movements.length - 1, idx + 1))}
          aria-label="Next movement"
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>

      <div className="mx-auto mt-3 max-w-[18rem] px-1">
        <TestArena movement={movement} ghostMoves={ghostMoves} />
      </div>
      {judge && movement.directive && (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          <span className="font-medium text-fg">Judge: </span>
          {movement.directive}
        </p>
      )}
      {purpose && <p className="mt-2 text-sm text-muted">{purpose}</p>}
    </section>
  );
}

function MovementList({
  movements,
  idx,
  setIdx,
  heading,
  intro,
  leave,
}: {
  movements: Movement[];
  idx: number;
  setIdx: (n: number) => void;
  heading: string;
  intro?: string;
  leave?: string;
}) {
  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
        Official sheet
      </p>
      <h2 className="font-display mt-1 text-xl font-medium">{heading}</h2>
      {intro && <p className="mt-2 text-sm text-muted">{intro}</p>}
      <ol className="mt-4 flex flex-col gap-1">
        {movements.map((mv, i) => {
          const on = i === idx;
          return (
            <li key={mv.n}>
              <button
                type="button"
                onClick={() => setIdx(i)}
                className={cn(
                  "flex w-full gap-3 rounded-lg p-3 text-left transition-colors duration-150",
                  on ? "bg-accent text-accent-fg" : "bg-bg",
                )}
              >
                <span
                  className={cn(
                    "font-mono mt-0.5 w-6 shrink-0 text-xs tabular-nums",
                    on ? "text-accent-fg/80" : "text-faint",
                  )}
                >
                  {mv.n}
                </span>
                <div className="min-w-0 flex-1">
                  <ul className="space-y-0.5">
                    {mv.steps.map((s, si) => (
                      <li key={si} className="text-sm leading-snug">
                        {s.at ? (
                          <>
                            <span className="font-semibold">{s.at}</span>
                            <span className={on ? "text-accent-fg/90" : "text-muted"}> {s.do}</span>
                          </>
                        ) : (
                          <span className={on ? "text-accent-fg/90" : "text-muted"}>{s.do}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {mv.coeff === 2 && !on && (
                    <p className="mt-1 text-[10px] font-semibold tracking-wide text-accent uppercase">
                      Coefficient 2
                    </p>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ol>
      {leave && <p className="mt-3 text-sm font-medium">{leave}</p>}
    </section>
  );
}

function SetSheet({ test }: { test: SetTest }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [test.id]);

  const marks = marksFor(test);

  return (
    <div className="flex flex-col gap-4">
      <Caller
        movements={test.movements}
        idx={idx}
        setIdx={setIdx}
        kicker={test.role}
        title={test.name}
        meta={`${test.year} · ${test.arena} · ${test.time}`}
        purpose={test.purpose}
        judge
      />

      <MovementList
        movements={test.movements}
        idx={idx}
        setIdx={setIdx}
        heading={`${test.movements.length} movements · ${marks.total} marks`}
        intro={`Introduces ${test.introduces}. ${NOVICE_INSTRUCTIONS} Draw time ${test.drawTime}.`}
        leave={test.leave}
      />

      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
          Collective marks
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {COLLECTIVES.map((c) => (
            <li
              key={c.name}
              className="flex items-start justify-between gap-3 rounded-lg bg-bg p-3"
            >
              <div>
                <p className="text-sm font-semibold">{c.name}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{c.detail}</p>
              </div>
              <Coeff n={c.coeff} />
            </li>
          ))}
        </ul>
        <p className="mt-3 font-mono text-xs text-faint tabular-nums">
          Technical {marks.tech} · Collectives {marks.coll} · Total {marks.total}
        </p>
      </section>

      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
          School it
        </p>
        <ul className="mt-3 flex flex-col gap-3">
          {test.keys.map((k) => (
            <li key={k.move} className="rounded-lg bg-bg p-3">
              <p className="text-sm font-semibold">{k.move}</p>
              <p className="mt-1 text-sm text-muted">
                <span className="font-medium text-fg">Judge: </span>
                {k.judge}
              </p>
              <p className="mt-1 text-sm text-muted">
                <span className="font-medium text-fg">School: </span>
                {k.school}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function MfsSheet() {
  const s = MFS_SHEET;
  const [idx, setIdx] = useState(0);
  const floor = MFS_FLOOR.movements;

  return (
    <div className="flex flex-col gap-4">
      <Caller
        movements={floor}
        idx={idx}
        setIdx={setIdx}
        kicker="Your floorplan"
        title={MFS_FLOOR.name}
        meta={`${MFS_FLOOR.show} · ${MFS_FLOOR.horse} · ${MFS_FLOOR.time}`}
        purpose={MFS_FLOOR.purpose}
        trail="last"
      />

      <FreestyleCard />

      <MovementList
        movements={floor}
        idx={idx}
        setIdx={setIdx}
        heading={`${floor.length} movements`}
        intro="Tap a movement to put it on the arena. Prev/next walks the floorplan in order."
      />

      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
          Compulsory movements
        </p>
        <h2 className="font-display mt-1 text-xl font-medium">
          Technical execution · {s.technicalTotal}
        </h2>
        <ol className="mt-3 flex flex-col gap-1">
          {s.compulsory.map((mv) => (
            <li key={mv.n} className="flex items-start gap-3 rounded-lg bg-bg p-3">
              <span className="font-mono mt-0.5 w-6 shrink-0 text-xs text-faint tabular-nums">
                {mv.n}
              </span>
              <p className="min-w-0 flex-1 text-sm leading-snug">{mv.move}</p>
              <Coeff n={mv.coeff} />
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
          Artistic presentation
        </p>
        <h2 className="font-display mt-1 text-xl font-medium">Artistic · {s.artisticTotal}</h2>
        <ol className="mt-3 flex flex-col gap-1">
          {s.artistic.map((mv) => (
            <li key={mv.n} className="flex items-start gap-3 rounded-lg bg-bg p-3">
              <span className="font-mono mt-0.5 w-6 shrink-0 text-xs text-faint tabular-nums">
                {mv.n}
              </span>
              <p className="min-w-0 flex-1 text-sm leading-snug">{mv.move}</p>
              <Coeff n={mv.coeff} />
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
          What you may show
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-bg p-3">
            <p className="text-sm font-semibold">Permitted</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted">
              {s.permitted.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg bg-bg p-3">
            <p className="text-sm font-semibold">Not permitted</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted">
              {s.notPermitted.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">{s.penalties}</p>
      </section>
    </div>
  );
}

export function TestsPanel() {
  const [active, setActive] = useState<TestTabId>("2b");
  const test = SET_TESTS.find((t) => t.id === active);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-surface p-1 shadow-[var(--shadow-card)]">
        {(["2a", "2b", "2c", "mfs"] as const).map((id) => {
          const tabLabel = id === "mfs" ? "MFS" : id.toUpperCase();
          const on = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={cn(
                "h-11 rounded-lg text-sm font-semibold tracking-wide",
                on ? "bg-accent text-accent-fg" : "text-muted",
              )}
            >
              {tabLabel}
            </button>
          );
        })}
      </div>

      {test && <SetSheet test={test} />}
      {active === "mfs" && <MfsSheet />}

      <p className="px-1 text-xs leading-relaxed text-faint">
        {NOVICE_PURPOSE} Working sheet from ESNZ Novice tests effective 1 September 2023. Official
        test sheets take precedence.{" "}
        <a
          href="https://www.nzequestrian.org.nz/disciplines/dressage/resources/dressage-tests/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-accent"
        >
          ESNZ tests
          <ExternalLink className="size-3" />
        </a>
      </p>
    </div>
  );
}
