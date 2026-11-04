import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { FREESTYLE } from "@/lib/season";

let shared: HTMLAudioElement | null = null;

function getAudio() {
  if (typeof window === "undefined") return null;
  if (!shared) {
    shared = new Audio(FREESTYLE.src);
    shared.preload = "metadata";
  }
  return shared;
}

function fmt(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function useFreestyleAudio() {
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(FREESTYLE.duration);

  useEffect(() => {
    const a = getAudio();
    if (!a) return;

    const sync = () => {
      setPlaying(!a.paused && !a.ended);
      setCurrent(a.currentTime);
      if (Number.isFinite(a.duration) && a.duration > 0) setDuration(a.duration);
    };

    a.addEventListener("play", sync);
    a.addEventListener("pause", sync);
    a.addEventListener("ended", sync);
    a.addEventListener("timeupdate", sync);
    a.addEventListener("loadedmetadata", sync);
    a.addEventListener("durationchange", sync);
    sync();

    return () => {
      a.removeEventListener("play", sync);
      a.removeEventListener("pause", sync);
      a.removeEventListener("ended", sync);
      a.removeEventListener("timeupdate", sync);
      a.removeEventListener("loadedmetadata", sync);
      a.removeEventListener("durationchange", sync);
    };
  }, []);

  const play = () => {
    const a = getAudio();
    if (!a) return;
    void a.play().catch(() => setPlaying(false));
  };

  const pause = () => getAudio()?.pause();

  const replay = () => {
    const a = getAudio();
    if (!a) return;
    a.currentTime = 0;
    void a.play().catch(() => setPlaying(false));
  };

  const seek = (time: number) => {
    const a = getAudio();
    if (!a) return;
    a.currentTime = time;
    setCurrent(time);
  };

  return { playing, current, duration, play, pause, replay, seek };
}

export function FreestyleBar() {
  const { playing, current, duration, play, pause, replay, seek } = useFreestyleAudio();
  const max = duration > 0 ? duration : 1;

  return (
    <div className="vd-player mb-5 rounded-xl bg-accent px-3 py-3 text-accent-fg sm:px-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={playing ? pause : play}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-fg text-accent"
          aria-label={playing ? "Pause freestyle music" : "Play freestyle music"}
        >
          {playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
        </button>
        <button
          type="button"
          onClick={replay}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-fg/15 text-accent-fg"
          aria-label="Replay freestyle from the start"
        >
          <RotateCcw className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold tracking-[0.14em] uppercase">{FREESTYLE.title}</p>
          <p className="truncate text-xs text-accent-fg/75">{FREESTYLE.horse}</p>
        </div>
        <span className="font-mono shrink-0 text-xs tabular-nums">
          {fmt(current)}
          <span className="text-accent-fg/60"> / {fmt(duration)}</span>
        </span>
      </div>
      <label className="mt-2 block">
        <span className="sr-only">Freestyle playback position</span>
        <input
          type="range"
          min={0}
          max={max}
          step={0.1}
          value={Math.min(current, max)}
          onChange={(e) => seek(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-accent-fg/20 accent-accent-fg"
        />
      </label>
    </div>
  );
}

export function FreestyleCard({ className }: { className?: string }) {
  const { playing, current, duration, play, pause, replay, seek } = useFreestyleAudio();
  const max = duration > 0 ? duration : 1;
  const overWindow = duration > 0 && duration > 4 * 60 + 30;

  return (
    <section className={cn("vd-player rounded-xl bg-accent p-4 text-accent-fg shadow-[var(--shadow-card)] sm:p-5", className)}>
      <p className="text-[11px] font-semibold tracking-[0.16em] uppercase">{FREESTYLE.series}</p>
      <h2 className="font-display mt-1 text-xl leading-snug font-medium">{FREESTYLE.title}</h2>
      <p className="mt-1 text-sm text-accent-fg/80">{FREESTYLE.horse} · finish between {FREESTYLE.timeAllowed}</p>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={playing ? pause : play}
          className="inline-flex h-11 min-w-28 items-center justify-center gap-2 rounded-md bg-accent-fg px-4 text-sm font-medium text-accent"
          aria-label={playing ? "Pause freestyle music" : "Play freestyle music"}
        >
          {playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={replay}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent-fg/15 px-4 text-sm font-medium text-accent-fg"
          aria-label="Replay freestyle from the start"
        >
          <RotateCcw className="size-4" />
          Replay
        </button>
        <span className="font-mono ml-auto text-xs tabular-nums">
          {fmt(current)} / {fmt(duration || 0)}
        </span>
      </div>

      <label className="mt-3 block">
        <span className="sr-only">Freestyle playback position</span>
        <input
          type="range"
          min={0}
          max={max}
          step={0.1}
          value={Math.min(current, max)}
          onChange={(e) => seek(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-accent-fg/20 accent-accent-fg"
        />
      </label>

      {overWindow && (
        <p className="mt-3 text-sm text-accent-fg/80">
          This file runs {fmt(duration)}. Zilco Level 2 must finish between 4:00 and 4:30 — if the extra is
          silence or padding, trim it before the first show.
        </p>
      )}
    </section>
  );
}
