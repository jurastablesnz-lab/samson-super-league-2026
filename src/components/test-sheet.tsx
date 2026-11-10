import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { getPublishedTests, setTestPublished } from "@/lib/test-publication";
import { catalogTests, type CatalogTest } from "@/lib/test-registry";
import { Button } from "@/components/ui/button";
import { FreestyleCard } from "@/components/freestyle-player";
import { cn } from "@/lib/utils";
import {
  ADVANCED_FS,
  ADVANCED_MEDIUM_FS,
  ADVANCED_MEDIUM_PURPOSE,
  ADVANCED_PURPOSE,
  COLLECTIVES,
  MFS_SHEET,
  ELEMENTARY_FS,
  ELEMENTARY_PURPOSE,
  GRADE_1_FS,
  GRADE_2_FS,
  GRADE_3_FS,
  GRADE_4_FS,
  GRADE_V_FS,
  GRADE_V_PURPOSE,
  INTERMEDIATE_I_FS,
  SET_7_TESTS,
  SET_EVENTING_TESTS,
  SET_G1_TESTS,
  SET_G2_TESTS,
  SET_G3_TESTS,
  SET_G4_TESTS,
  SET_GV_TESTS,
  MEDIUM_FS,
  MEDIUM_PURPOSE,
  SET_0_TESTS,
  SET_1_TESTS,
  SET_3_TESTS,
  SET_4_TESTS,
  SET_5_TESTS,
  SET_6_TESTS,
  NOVICE_INSTRUCTIONS,
  NOVICE_PURPOSE,
  SET_TESTS,
  marksFor,
  type Draw,
  type Movement,
  type Pace,
  type SetTest,
} from "@/lib/esnz-tests";
import { MFS_FLOOR, PACE_LABEL } from "@/lib/freestyle-floor";
import {
  CORNER_RX,
  CORNER_RY,
  CX,
  LEFT,
  arenaLetters,
  arenaSizeOf,
  withArena,
  type ArenaSize,
  M_PX,
  RIGHT,
  circleCenter,
  halfArc,
  halfTurnPath,
  arcPath,
  lateralWorkPath,
  label,
  loopOrVeePath,
  halfPirouettePath,
  linePath,
  markerAt,
  sameSideThroughX,
  veePath,
  markerPoint,
  pirouettePath,
  pointOn,
  quarterTurnPath,
  approachTravel,
  reinBackPath,
  returningHalfArc,
  serpentinePath,
  track,
  zigzagPath,
} from "@/lib/arena-geom";

function ptsTo(d: Draw): string[] {
  switch (d.t) {
    case "line":
      return d.pts;
    case "diag":
    case "yield":
    case "arc":
    case "loop":
    case "half":
      return [d.from, d.to];
    case "return-half":
      return [d.from, "X", d.to];
    case "half-turn":
      return [d.at, d.side];
    case "serpentine":
      return [d.from, d.to === "X" ? "X" : d.from === "C" ? "A" : "C"];
    case "zigzag":
      return [d.from, d.to];
    case "pirouette":
      if ("turn" in d && d.turn === "half") return [d.from, d.to];
      if ("turn" in d && d.turn === "full") return [d.from, d.to];
      if ("turn" in d && d.turn === "quarter") return [d.at, d.from, d.aim];
      return "at" in d ? [d.at] : [];
    case "change":
      return "at" in d ? [d.at] : [d.from, d.to];
    case "circle":
    case "stretch":
    case "halt":
    case "rein-back":
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
  if (pace === "extended" || pace === "extended-canter") return "9 3 2 3";
  if (pace === "medium" || pace === "medium-canter" || pace === "free") return "6 4";
  return undefined;
}

export function MovementPath({
  draw,
  accent,
  pace,
  lateral,
  size,
}: {
  draw: Draw[];
  accent?: boolean;
  pace?: Pace;
  lateral?: Movement["lateral"];
  size?: ArenaSize;
}) {
  const stroke = strokeFor(pace, !!accent);
  const width = accent ? 2.4 : 1.6;
  return withArena(size ?? "60x20", () => (
    <g fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round">
      {lateral ? (
        <path
          className="lateral-work"
          data-lateral={lateral.kind}
          data-direction={lateral.direction}
          d={lateralWorkPath(
            lateral.line ? lateral.pts : [lateral.from, lateral.to],
            lateral.kind,
            lateral.direction,
          )}
          strokeWidth={accent ? 2 : 1.4}
          stroke="var(--color-ink-soft)"
          strokeLinecap="round"
        />
      ) : null}
      {draw.map((d, i) => {
        const key = `${d.t}-${i}`;
        const dash = dashFor(d, pace);
        if (d.t === "line") {
          return <path key={key} d={linePath(d.pts)} strokeWidth={width} strokeDasharray={dash} />;
        }
        if (d.t === "diag" && sameSideThroughX(d.from, d.to)) {
          return (
            <path
              key={key}
              d={veePath(d.from, d.to)}
              strokeWidth={width}
              strokeDasharray={dash}
              strokeLinejoin="miter"
            />
          );
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
          const vee = !d.insetM && sameSideThroughX(d.from, d.to);
          return (
            <path
              key={key}
              d={loopOrVeePath(d.from, d.to, d.insetM)}
              strokeWidth={width}
              strokeDasharray={dash}
              strokeLinejoin={vee ? "miter" : undefined}
            />
          );
        }
        if (d.t === "half-turn")
          return (
            <path key={key} d={halfTurnPath(d.side)} strokeWidth={width} strokeDasharray={dash} />
          );
        if (d.t === "rein-back") {
          let along: "x" | "y" = "y";
          for (const other of draw) {
            if (other.t !== "line") continue;
            const at = other.pts.indexOf(d.at);
            if (at < 0) continue;
            const neighbor = other.pts[at - 1] ?? other.pts[at + 1];
            if (!neighbor) continue;
            const here = track(d.at);
            const next = track(neighbor);
            along = Math.abs(next.x - here.x) >= Math.abs(next.y - here.y) ? "x" : "y";
            break;
          }
          return <path key={key} d={reinBackPath(d.at, d.steps ?? 4, along)} strokeWidth={width} />;
        }
        if (d.t === "pirouette") {
          if ("turn" in d && d.turn === "full") {
            const p = pointOn(d.from, d.to, d.along);
            const radius = (d.diameterM ?? 3) / 2;
            return (
              <ellipse
                key={key}
                cx={p.x}
                cy={p.y}
                rx={radius * M_PX.x}
                ry={radius * M_PX.y}
                strokeWidth={width}
                strokeDasharray={dash}
              />
            );
          }
          const dPath =
            "turn" in d && d.turn === "quarter"
              ? quarterTurnPath(d.at, d.from, d.aim, d.direction)
              : "turn" in d && d.turn === "half"
                ? halfPirouettePath(d.from, d.to, d.along, d.direction, d.diameterM ?? 2)
                : "at" in d
                  ? pirouettePath(d.at, d.direction)
                  : halfPirouettePath(d.from, d.to, d.along, d.direction, d.diameterM ?? 2);
          return <path key={key} d={dPath} strokeWidth={width} strokeDasharray={dash} />;
        }
        if (d.t === "arc")
          return (
            <path
              key={key}
              d={arcPath(d.from, d.to, d.bulge)}
              strokeWidth={width}
              strokeDasharray={dash}
            />
          );
        if (d.t === "half" || d.t === "return-half") {
          const prev = draw[i - 1];
          const inferred =
            prev?.t === "line" && prev.pts.at(-1) === d.from
              ? approachTravel(prev.pts.at(-2), d.from)
              : undefined;
          const travel = (d.t === "half" ? d.travel : undefined) ?? inferred;
          const dPath =
            d.t === "half"
              ? halfArc(d.from, d.to, d.bulge, d.hand, travel)
              : returningHalfArc(d.from, d.to, d.bulge, travel);
          return <path key={key} d={dPath} strokeWidth={width} strokeDasharray={dash} />;
        }
        if (d.t === "circle" || d.t === "stretch") {
          const between = d.t === "circle" && d.betweenQuarterlines;
          const m = d.t === "stretch" ? 20 : between ? 10 : d.m;
          const c = between
            ? circleCenter(d.at, 10)
            : circleCenter(d.at, m / 2, d.t === "circle" ? d.side : undefined);
          return (
            <ellipse
              key={key}
              cx={c.x}
              cy={c.y}
              rx={(m / 2) * M_PX.x}
              ry={(m / 2) * M_PX.y}
              strokeWidth={width}
              strokeDasharray={d.t === "stretch" ? "6 4" : between ? "2 2" : dash}
            />
          );
        }
        if (d.t === "halt") {
          const p = track(d.at);
          const floor = track("A").y;
          const y1 = p.y + 5 > floor ? p.y - 8 : p.y - 5;
          const y2 = p.y + 5 > floor ? p.y : p.y + 5;
          return (
            <g key={key}>
              <line x1={p.x - 7} y1={p.y} x2={p.x + 7} y2={p.y} strokeWidth={2.6} />
              <line x1={p.x} y1={y1} x2={p.x} y2={y2} strokeWidth={1.4} opacity={0.7} />
            </g>
          );
        }
        if (d.t === "zigzag") {
          return (
            <path
              key={key}
              d={zigzagPath(d.from, d.to, d.legs, d.sideM, d.start)}
              strokeWidth={width}
              strokeDasharray={dash}
            />
          );
        }
        if (d.t === "serpentine") {
          return (
            <path
              key={key}
              d={serpentinePath(d.from, d.first, d.loops ?? 3, d.to)}
              strokeWidth={width}
              strokeDasharray={dash}
            />
          );
        }
        if (d.t === "change") {
          const placed = "at" in d ? markerAt(d.at) : markerPoint(pointOn(d.from, d.to, d.along));
          const travel =
            "at" in d
              ? { x: 0, y: -1 }
              : (() => {
                  const a = pointOn(d.from, d.to, 0);
                  const b = pointOn(d.from, d.to, 1);
                  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
                  return { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
                })();
          const tip = { x: placed.x + travel.x * 6, y: placed.y + travel.y * 6 };
          const left = { x: placed.x + travel.y * 5, y: placed.y - travel.x * 5 };
          const right = { x: placed.x - travel.y * 5, y: placed.y + travel.x * 5 };
          return (
            <g key={key}>
              <circle
                cx={placed.x}
                cy={placed.y}
                r="5"
                fill="var(--color-surface)"
                strokeWidth={2}
              />
              <path
                d={`M ${left.x.toFixed(1)} ${left.y.toFixed(1)} L ${tip.x.toFixed(1)} ${tip.y.toFixed(1)} L ${right.x.toFixed(1)} ${right.y.toFixed(1)}`}
                strokeWidth={1.8}
              />
            </g>
          );
        }
        return null;
      })}
    </g>
  ));
}

export function TestArena({
  movement,
  ghostMoves,
  arena,
  size,
}: {
  movement: Movement;
  ghostMoves?: Movement[];
  arena?: string;
  size?: ArenaSize;
}) {
  const resolved = size ?? arenaSizeOf(arena);
  return <ArenaFigure movement={movement} ghostMoves={ghostMoves} size={resolved} />;
}

function ArenaFigure({
  movement,
  ghostMoves,
  size,
}: {
  movement: Movement;
  ghostMoves?: Movement[];
  size: ArenaSize;
}) {
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

  return withArena(size, () => (
    <svg
      viewBox="0 0 220 272"
      className="h-auto w-full"
      style={{ background: "var(--color-surface)" }}
      role="img"
      aria-label={`Arena diagram, movement ${movement.n}`}
    >
      <rect
        x={LEFT}
        y={track("C").y}
        width={RIGHT - LEFT}
        height={track("A").y - track("C").y}
        rx={CORNER_RX}
        ry={CORNER_RY}
        fill="var(--color-sunken)"
        stroke="var(--color-accent)"
        strokeWidth="1.6"
      />
      <line
        x1={CX}
        y1={track("C").y}
        x2={CX}
        y2={track("A").y}
        stroke="var(--color-line)"
        strokeWidth="0.8"
        strokeDasharray="3 3"
      />
      <line
        x1={LEFT}
        y1={track("X").y}
        x2={RIGHT}
        y2={track("X").y}
        stroke="var(--color-line)"
        strokeWidth="0.8"
        strokeDasharray="3 3"
      />
      {ghostMoves
        ? ghostMoves.map((gm) => (
            <g key={gm.n} opacity={0.18} strokeDasharray="3 3" aria-hidden="true">
              <MovementPath draw={gm.draw} pace={gm.pace} lateral={gm.lateral} size={size} />
            </g>
          ))
        : null}
      <g data-active-movement={`${movement.n}`}>
        <MovementPath
          draw={movement.draw}
          accent
          pace={movement.pace}
          lateral={movement.lateral}
          size={size}
        />
      </g>
      {arenaLetters(size).map((id) => {
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
  ));
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
  arena,
  size,
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
  arena?: string;
  size?: ArenaSize;
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
        <TestArena movement={movement} ghostMoves={ghostMoves} arena={arena} size={size} />
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
        kicker={test.role ?? test.name}
        title={test.name}
        meta={`${test.year} · ${test.arena} · ${test.time}`}
        purpose={test.purpose}
        judge
        arena={test.arena}
        size={test.arenaSize}
      />

      <MovementList
        movements={test.movements}
        idx={idx}
        setIdx={setIdx}
        heading={`${test.movements.length} movements · ${marks.total} marks`}
        intro={`Introduces ${test.introduces}. ${test.instructions ?? NOVICE_INSTRUCTIONS} Draw time ${test.drawTime}.`}
        leave={test.leave}
      />

      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
          Collective marks
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {(test.collectives ?? COLLECTIVES).map((c) => (
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
          {(test.keys ?? []).map((k) => (
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

function FreestyleTable({
  sheet: s,
}: {
  sheet: {
    name: string;
    year: string;
    arena: string;
    time: string;
    bridle: string;
    technicalTotal: number;
    artisticTotal: number;
    compulsory: { n: number; move: string; coeff: number }[];
    artistic: { n: number; move: string; coeff: number }[];
    permitted: string[];
    notPermitted: string[];
    penalties: string;
  };
}) {
  const Row = ({ n, text, coeff }: { n: number; text: string; coeff: number }) => (
    <li className="flex items-start gap-3 rounded-lg bg-bg p-3">
      <span className="font-mono text-xs text-faint">{n}</span>
      <p className="flex-1 text-sm">{text}</p>
      <Coeff n={coeff} />
    </li>
  );
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-surface p-4">
        <h2 className="font-display text-xl">{s.name}</h2>
        <p className="mt-2 text-sm text-muted">
          {s.year} · {s.arena}m · {s.time} · {s.bridle}
        </p>
      </div>
      <section className="rounded-xl bg-surface p-4">
        <h2 className="font-display text-xl">Technical execution · {s.technicalTotal}</h2>
        <ol className="mt-3 flex flex-col gap-1">
          {s.compulsory.map((m) => (
            <Row key={m.n} n={m.n} text={m.move} coeff={m.coeff} />
          ))}
        </ol>
      </section>
      <section className="rounded-xl bg-surface p-4">
        <h2 className="font-display text-xl">Artistic presentation · {s.artisticTotal}</h2>
        <ol className="mt-3 flex flex-col gap-1">
          {s.artistic.map((m) => (
            <Row key={m.n} n={m.n} text={m.move} coeff={m.coeff} />
          ))}
        </ol>
      </section>
      <section className="rounded-xl bg-surface p-4">
        <h3 className="font-semibold">Permitted</h3>
        <ul className="mt-2 list-disc pl-5 text-sm text-muted">
          {s.permitted.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <h3 className="mt-4 font-semibold">Not permitted</h3>
        <ul className="mt-2 list-disc pl-5 text-sm text-muted">
          {s.notPermitted.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">{s.penalties}</p>
      </section>
    </div>
  );
}

const ALL_SET_TESTS = [
  ...SET_0_TESTS,
  ...SET_1_TESTS,
  ...SET_TESTS,
  ...SET_3_TESTS,
  ...SET_4_TESTS,
  ...SET_5_TESTS,
  ...SET_6_TESTS,
  ...SET_GV_TESTS,
  ...SET_G1_TESTS,
  ...SET_G2_TESTS,
  ...SET_G3_TESTS,
  ...SET_G4_TESTS,
  ...SET_7_TESTS,
  ...SET_EVENTING_TESTS,
];

const MORE_FREESTYLES: Record<string, Parameters<typeof FreestyleTable>[0]["sheet"]> = {
  "g1-fs": GRADE_1_FS,
  "g2-fs": GRADE_2_FS,
  "g3-fs": GRADE_3_FS,
  "g4-fs": GRADE_4_FS,
  "int-i-fs": INTERMEDIATE_I_FS,
};

type FreestyleSheet = {
  name: string;
  time: string;
  arena: string;
  technicalTotal: number;
  artisticTotal: number;
  compulsory: { n: number; move: string; coeff: number }[];
  permitted: string[];
  notPermitted: string[];
  penalties?: string;
};

const FREESTYLE_SHEETS: Record<string, FreestyleSheet> = {
  mfs: MFS_SHEET,
  "elementary-fs": ELEMENTARY_FS,
  "medium-fs": MEDIUM_FS,
  "adv-medium-fs": ADVANCED_MEDIUM_FS,
  "advanced-fs": ADVANCED_FS,
  "int-i-fs": INTERMEDIATE_I_FS,
  "g1-fs": GRADE_1_FS,
  "g2-fs": GRADE_2_FS,
  "g3-fs": GRADE_3_FS,
  "g4-fs": GRADE_4_FS,
  "gv-fs": GRADE_V_FS,
};

function AdminTestPreview({
  item,
  approved,
  busy,
  onToggle,
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: {
  item: CatalogTest;
  approved: boolean;
  busy: boolean;
  onToggle: (approved: boolean) => void;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const setTest = ALL_SET_TESTS.find((test) => test.id === item.id);
  const freestyle = FREESTYLE_SHEETS[item.id];
  const floor = item.id === "mfs" ? MFS_FLOOR.movements : [];
  const marks = setTest ? marksFor(setTest) : null;
  const arena = setTest?.arena ?? freestyle?.arena ?? (floor.length ? MFS_FLOOR.arena : "");
  const time = setTest?.time ?? freestyle?.time ?? (floor.length ? MFS_FLOOR.time : "");
  const total = marks
    ? String(marks.total)
    : freestyle
      ? String(freestyle.technicalTotal + freestyle.artisticTotal)
      : "";
  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [item.id]);

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-bg text-fg"
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
    >
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-8">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 self-start text-sm font-semibold text-accent"
          >
            Back to the list
          </button>
          <PreviewActions
            approved={approved}
            busy={busy}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            onToggle={onToggle}
            onPrevious={onPrevious}
            onNext={onNext}
          />
          <header>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
              {approved ? "Published" : "Draft"}
            </p>
            <h2 className="font-display mt-1 text-2xl leading-tight font-medium">{item.name}</h2>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <Fact label="Level" value={item.levels.join(", ") || "—"} />
              <Fact label="Arena" value={arena || "—"} />
              <Fact label="Total marks" value={total || "—"} />
              <Fact label="Riding time" value={time || "—"} />
            </dl>
          </header>
          {setTest &&
            setTest.movements.map((movement) => (
              <MovementPreview key={movement.n} movement={movement} arena={setTest.arena} />
            ))}
          {floor.map((movement) => (
            <MovementPreview
              key={`floor-${movement.n}`}
              movement={movement}
              arena={MFS_FLOOR.arena}
            />
          ))}
          {setTest && (
            <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)]">
              <h3 className="font-display text-lg font-medium">Collectives</h3>
              <ul className="mt-3 flex flex-col gap-2">
                {(setTest.collectives ?? COLLECTIVES).map((mark) => (
                  <li key={mark.name} className="rounded-lg bg-bg p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold">{mark.name}</p>
                      <p className="shrink-0 text-xs font-semibold text-accent">
                        Coefficient {mark.coeff}
                      </p>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{mark.detail}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {freestyle && <FreestyleFacts sheet={freestyle} />}
          {!setTest && !freestyle && (
            <p className="text-sm leading-relaxed text-muted">
              This name is in the registry, and the movement sheet is not loaded yet. You can still
              publish it for riders to select.
            </p>
          )}
          <PreviewActions
            approved={approved}
            busy={busy}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            onToggle={onToggle}
            onPrevious={onPrevious}
            onNext={onNext}
          />
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface px-3 py-2">
      <dt className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm leading-snug">{value}</dd>
    </div>
  );
}

function MovementPreview({ movement, arena }: { movement: Movement; arena: string }) {
  const letters = movement.steps.map((step) => step.at).filter(Boolean);
  return (
    <article className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-xs text-faint">Movement {movement.n}</p>
        <p className="text-xs font-semibold text-accent">Coefficient {movement.coeff ?? 1}</p>
      </div>
      {letters.length > 0 && <p className="mt-2 text-sm font-semibold">{letters.join(" · ")}</p>}
      <div className="mt-1 space-y-1">
        {movement.steps.map((step, index) => (
          <p key={index} className="text-sm leading-snug">
            {step.at ? <span className="font-semibold">{step.at} </span> : null}
            {step.do}
          </p>
        ))}
      </div>
      {movement.directive && (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          <span className="font-medium text-fg">Directive: </span>
          {movement.directive}
        </p>
      )}
      <div className="mx-auto mt-3 max-w-[16rem]">
        <TestArena movement={movement} arena={arena} />
      </div>
    </article>
  );
}

function FreestyleFacts({ sheet }: { sheet: FreestyleSheet }) {
  return (
    <>
      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)]">
        <h3 className="font-display text-lg font-medium">Compulsory</h3>
        <ol className="mt-3 flex flex-col gap-2">
          {sheet.compulsory.map((move) => (
            <li key={move.n} className="rounded-lg bg-bg p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <p>
                  <span className="font-mono mr-2 text-xs text-faint">{move.n}</span>
                  {move.move}
                </p>
                <p className="shrink-0 text-xs font-semibold text-accent">
                  Coefficient {move.coeff}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)]">
        <h3 className="font-display text-lg font-medium">Permitted</h3>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted">
          {sheet.permitted.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <h3 className="font-display mt-4 text-lg font-medium">Not permitted</h3>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted">
          {sheet.notPermitted.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </>
  );
}

function PreviewActions({
  approved,
  busy,
  hasPrevious,
  hasNext,
  onToggle,
  onPrevious,
  onNext,
}: {
  approved: boolean;
  busy: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
  onToggle: (approved: boolean) => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => onToggle(!approved)}
        className="min-h-11 cursor-pointer rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg disabled:opacity-50"
      >
        {busy ? "Saving…" : approved ? "Unapprove" : "Approve"}
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!hasPrevious}
          onClick={onPrevious}
          className="min-h-11 cursor-pointer rounded-lg border border-line px-3 text-sm font-semibold disabled:opacity-40"
        >
          Previous test
        </button>
        <button
          type="button"
          disabled={!hasNext}
          onClick={onNext}
          className="min-h-11 cursor-pointer rounded-lg border border-line px-3 text-sm font-semibold disabled:opacity-40"
        >
          Next test
        </button>
      </div>
    </div>
  );
}

function PublicationBar({
  name,
  approved,
  busy,
  onToggle,
}: {
  name: string;
  approved: boolean;
  busy: boolean;
  onToggle: (approved: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3 shadow-[var(--shadow-card)]">
      <p className="text-sm">
        <span className={cn("font-semibold", approved ? "text-good" : "text-warn")}>
          {approved ? "Published" : "Draft"}
        </span>
        <span className="text-muted"> · {name}</span>
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => onToggle(!approved)}
        className="cursor-pointer rounded-lg border border-line px-3 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {busy ? "Saving…" : approved ? "Unapprove" : "Approve"}
      </button>
    </div>
  );
}

export function TestCatalog() {
  const [approvedIds, setApprovedIds] = useState<string[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getPublishedTests()
      .then((result) => setApprovedIds(result.ids))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);
  const approved = new Set(approvedIds ?? []);
  const tests = catalogTests();
  const openIndex = tests.findIndex((item) => item.id === openId);
  const openTest = openIndex >= 0 ? tests[openIndex] : null;

  async function toggle(testId: string, next: boolean) {
    setBusyId(testId);
    setError(null);
    try {
      setApprovedIds((await setTestPublished({ data: { testId, approved: next } })).ids);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mt-5 rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
        Test publication
      </p>
      <h2 className="font-display mt-1 text-xl font-medium">
        Publish a test before riders can see it
      </h2>
      <p className="mt-2 text-sm text-muted">
        Draft tests stay off rider plans and off the add-test list. Approving publishes that test
        for every rider.
      </p>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <ul className="mt-4 flex flex-col gap-2">
        {catalogTests().map((item) => {
          const on = approved.has(item.id);
          return (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-bg px-3 py-2"
            >
              <button
                type="button"
                onClick={() => setOpenId(item.id)}
                className="min-h-11 min-w-0 flex-1 cursor-pointer py-1 text-left"
              >
                <p className="text-sm font-semibold">
                  {item.name}{" "}
                  {!on && (
                    <span className="text-xs font-semibold tracking-wide text-warn uppercase">
                      Draft
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-faint">{item.levels.join(" · ") || "Sheet"}</p>
              </button>
              <button
                type="button"
                disabled={approvedIds === null || busyId === item.id}
                onClick={() => void toggle(item.id, !on)}
                className="shrink-0 cursor-pointer rounded-lg border border-line px-3 py-2 text-xs font-semibold disabled:opacity-50"
              >
                {busyId === item.id ? "Saving…" : on ? "Unapprove" : "Approve"}
              </button>
            </li>
          );
        })}
      </ul>
      {openTest && (
        <AdminTestPreview
          item={openTest}
          approved={approved.has(openTest.id)}
          busy={busyId === openTest.id}
          onToggle={(next) => void toggle(openTest.id, next)}
          onClose={() => setOpenId(null)}
          hasPrevious={openIndex > 0}
          hasNext={openIndex >= 0 && openIndex < tests.length - 1}
          onPrevious={() => openIndex > 0 && setOpenId(tests[openIndex - 1].id)}
          onNext={() => openIndex < tests.length - 1 && setOpenId(tests[openIndex + 1].id)}
        />
      )}
    </section>
  );
}

export function TestsPanel({ isAdmin = false }: { isAdmin?: boolean }) {
  const [active, setActive] = useState("2b");
  const [approvedIds, setApprovedIds] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getPublishedTests()
      .then((result) => setApprovedIds(result.ids))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);
  const approved = useMemo(() => new Set(approvedIds ?? []), [approvedIds]);
  const diagrams = catalogTests().filter((item) => item.viewId);
  const visible = diagrams.filter(
    (item) => isAdmin || (approvedIds !== null && approved.has(item.id)),
  );
  useEffect(() => {
    const shown = catalogTests().filter(
      (item) =>
        item.viewId && (isAdmin || (approvedIds !== null && new Set(approvedIds).has(item.id))),
    );
    if (!shown.some((item) => item.viewId === active) && shown[0]?.viewId)
      setActive(shown[0].viewId);
  }, [active, approvedIds, isAdmin]);
  const test = ALL_SET_TESTS.find((item) => item.id === active);
  const activeMeta = diagrams.find((item) => item.viewId === active);
  const others = catalogTests().filter((item) => !item.viewId);

  async function toggle(testId: string, next: boolean) {
    setBusy(true);
    setError(null);
    try {
      setApprovedIds((await setTestPublished({ data: { testId, approved: next } })).ids);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }
  const footerPurpose =
    test?.purpose ??
    (active === "mfs"
      ? MFS_SHEET.purpose
      : active === "medium-fs"
        ? MEDIUM_PURPOSE
        : active === "elementary-fs"
          ? ELEMENTARY_PURPOSE
          : active === "adv-medium-fs"
            ? ADVANCED_MEDIUM_PURPOSE
            : active === "advanced-fs"
              ? ADVANCED_PURPOSE
              : active === "gv-fs"
                ? GRADE_V_PURPOSE
                : MORE_FREESTYLES[active]
                  ? "Freestyle to the official test sheet."
                  : NOVICE_PURPOSE);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-surface p-1 shadow-[var(--shadow-card)]">
        {visible.map((item) => {
          const id = item.viewId ?? item.id;
          const tabLabel =
            id === "mfs"
              ? "MFS"
              : id === "medium-fs"
                ? "L4 MFS"
                : id === "elementary-fs"
                  ? "L3 MFS"
                  : id === "adv-medium-fs"
                    ? "L5 MFS"
                    : id === "advanced-fs"
                      ? "L6 MFS"
                      : id === "gv-fs"
                        ? "GV FS"
                        : id.toUpperCase();
          const on = active === id;
          const draft = isAdmin && approvedIds !== null && !approved.has(id);
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
              {draft ? " · Draft" : ""}
            </button>
          );
        })}
      </div>
      {approvedIds === null && !error && <p className="text-sm text-muted">Loading tests…</p>}
      {visible.length === 0 && approvedIds !== null && (
        <p className="text-sm text-muted">Published test sheets will appear here.</p>
      )}
      {isAdmin && activeMeta && approvedIds !== null && (
        <PublicationBar
          name={activeMeta.name}
          approved={approved.has(activeMeta.id)}
          busy={busy}
          onToggle={(next) => void toggle(activeMeta.id, next)}
        />
      )}
      {error && <p className="text-sm text-danger">{error}</p>}

      {test && visible.some((item) => item.viewId === test.id) && <SetSheet test={test} />}
      {active === "mfs" && visible.some((item) => item.viewId === "mfs") && <MfsSheet />}
      {active === "medium-fs" && visible.some((item) => item.viewId === "medium-fs") && (
        <FreestyleTable sheet={MEDIUM_FS} />
      )}
      {active === "elementary-fs" && visible.some((item) => item.viewId === "elementary-fs") && (
        <FreestyleTable sheet={ELEMENTARY_FS} />
      )}
      {active === "adv-medium-fs" && visible.some((item) => item.viewId === "adv-medium-fs") && (
        <FreestyleTable sheet={ADVANCED_MEDIUM_FS} />
      )}
      {active === "advanced-fs" && visible.some((item) => item.viewId === "advanced-fs") && (
        <FreestyleTable sheet={ADVANCED_FS} />
      )}
      {active === "gv-fs" && visible.some((item) => item.viewId === "gv-fs") && (
        <FreestyleTable sheet={GRADE_V_FS} />
      )}
      {MORE_FREESTYLES[active] && visible.some((item) => item.viewId === active) && (
        <FreestyleTable sheet={MORE_FREESTYLES[active]} />
      )}

      {isAdmin && approvedIds !== null && others.length > 0 && (
        <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)]">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
            Other tests
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {others.map((item) => (
              <li key={item.id}>
                <PublicationBar
                  name={item.name}
                  approved={approved.has(item.id)}
                  busy={busy}
                  onToggle={(next) => void toggle(item.id, next)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="px-1 text-xs leading-relaxed text-faint">
        {footerPurpose} Official test sheets take precedence.{" "}
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
