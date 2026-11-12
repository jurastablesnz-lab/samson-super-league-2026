import { useEffect, useRef, useState, type ReactNode } from "react";
import { clampGap, hearsNext, movementCall, voiceScore } from "@/lib/arena-caller";
import type { Movement } from "@/lib/tests/types";

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecEvent = {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }>;
};

function recognitionCtor(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function bestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  if (voices.length === 0) return null;
  return [...voices].sort((a, b) => voiceScore(b) - voiceScore(a))[0] ?? null;
}

function speakText(text: string, token: { cancelled: boolean }): Promise<void> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth || token.cancelled) return resolve();
    let started = false;
    const start = () => {
      if (started || token.cancelled) return resolve();
      started = true;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-NZ";
      utterance.rate = 0.95;
      const voice = bestVoice();
      if (voice) utterance.voice = voice;
      const finish = () => resolve();
      utterance.onend = finish;
      utterance.onerror = finish;
      synth.cancel();
      synth.resume();
      synth.speak(utterance);
    };
    if (synth.getVoices().length === 0) {
      const onVoices = () => {
        synth.removeEventListener("voiceschanged", onVoices);
        start();
      };
      synth.addEventListener("voiceschanged", onVoices);
      window.setTimeout(start, 250);
      return;
    }
    start();
  });
}

function playFile(url: string, token: { cancelled: boolean }): Promise<void> {
  return new Promise((resolve) => {
    if (token.cancelled) return resolve();
    const audio = new Audio(url);
    const finish = () => resolve();
    audio.onended = finish;
    audio.onerror = finish;
    void audio.play().catch(finish);
  });
}

/**
 * Full-screen caller. Speech is browser TTS unless a movement has audioUrl.
 * "Next" is heard where the browser allows it, and tapping always advances.
 */
export function ArenaCaller({
  title,
  movements,
  cues = [],
  onClose,
  onRefresh,
  refreshing = false,
  refreshError = null,
  children,
}: {
  title: string;
  movements: Movement[];
  cues?: { n: number; text: string; audioUrl?: string }[];
  onClose: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  refreshError?: string | null;
  children: (movement: Movement) => ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [play, setPlay] = useState(0);
  const [directives, setDirectives] = useState(false);
  const [coach, setCoach] = useState(true);
  const coachRef = useRef(coach);
  const [auto, setAuto] = useState(false);
  const [gap, setGap] = useState(8);
  const [phase, setPhase] = useState<"speaking" | "waiting">("speaking");
  const [canHear, setCanHear] = useState(() => recognitionCtor() != null);
  const directivesRef = useRef(directives);
  const autoRef = useRef(auto);
  const gapRef = useRef(gap);
  const indexRef = useRef(index);
  const tokenRef = useRef({ cancelled: false });
  const timerRef = useRef<number | null>(null);
  const recRef = useRef<SpeechRec | null>(null);
  directivesRef.current = directives;
  coachRef.current = coach;
  autoRef.current = auto;
  gapRef.current = gap;
  indexRef.current = index;
  const movement = movements[Math.min(index, Math.max(0, movements.length - 1))];
  const letters = movement?.steps
    .map((step) => step.at)
    .filter(Boolean)
    .join(" · ");
  const instruction = movement?.steps
    .map((step) => step.do)
    .filter(Boolean)
    .join(". ");

  function clearWait() {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    try {
      recRef.current?.stop();
    } catch {
      // Already stopped.
    }
  }

  function go(next: number, replay = false) {
    clearWait();
    tokenRef.current.cancelled = true;
    window.speechSynthesis?.cancel();
    const clamped = Math.min(movements.length - 1, Math.max(0, next));
    if (replay || clamped !== indexRef.current) {
      if (clamped === indexRef.current) setPlay((n) => n + 1);
      else setIndex(clamped);
    }
  }

  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    let dropped = false;
    void navigator.wakeLock
      ?.request("screen")
      .then((sentinel) => {
        if (dropped) void sentinel.release();
        else lock = sentinel;
      })
      .catch(() => undefined);
    return () => {
      dropped = true;
      void lock?.release();
      clearWait();
      tokenRef.current.cancelled = true;
      window.speechSynthesis?.cancel();
    };
  }, []);

  const spokenCue = movement ? cues.find((cue) => cue.n === movement.n) : undefined;
  useEffect(() => {
    if (!movement) return;
    const token = { cancelled: false };
    tokenRef.current = token;
    setPhase("speaking");
    clearWait();
    const personal = cues.find((cue) => cue.n === movement.n);
    const clips = movementCall(
      movement,
      directivesRef.current,
      coachRef.current ? personal : null,
    );
    void (async () => {
      for (const clip of clips) {
        if (token.cancelled) return;
        if (clip.audioUrl) await playFile(clip.audioUrl, token);
        else await speakText(clip.text, token);
      }
      if (token.cancelled) return;
      setPhase("waiting");
      if (autoRef.current && indexRef.current < movements.length - 1) {
        timerRef.current = window.setTimeout(
          () => go(indexRef.current + 1),
          clampGap(gapRef.current) * 1000,
        );
      }
      const Ctor = recognitionCtor();
      if (!Ctor || !canHear) return;
      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-NZ";
      rec.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (hearsNext(event.results[i][0].transcript)) go(indexRef.current + 1);
        }
      };
      rec.onend = () => {
        if (!token.cancelled && canHear) {
          try {
            rec.start();
          } catch {
            // The browser ended the session and refused a restart.
          }
        }
      };
      rec.onerror = () => undefined;
      recRef.current = rec;
      try {
        rec.start();
      } catch {
        setCanHear(false);
      }
    })();
    return () => {
      token.cancelled = true;
      clearWait();
      window.speechSynthesis?.cancel();
    };
    // Directives and the gap are read when this movement starts.
    // A cue that arrives after the caller opens is spoken with this movement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, play, spokenCue?.text, spokenCue?.audioUrl]);

  if (!movement) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-bg text-fg"
      role="dialog"
      aria-label={`Caller for ${title}`}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          className="min-h-11 text-sm font-semibold text-accent"
          onClick={onClose}
        >
          Close
        </button>
        {onRefresh && (
          <button
            type="button"
            className="min-h-11 text-sm font-semibold text-ink-soft disabled:opacity-50"
            disabled={refreshing}
            onClick={onRefresh}
          >
            {refreshing ? "Refreshing…" : "Refresh coaching"}
          </button>
        )}
        <p className="font-mono text-sm text-muted tabular-nums">
          {index + 1} of {movements.length}
        </p>
      </div>
      <button
        type="button"
        className="flex min-h-0 flex-1 flex-col px-4 pt-2 text-left"
        onClick={() => go(index + 1)}
        aria-label="Next movement"
      >
        <p className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">{title}</p>
        <p className="font-display mt-1 text-3xl leading-tight font-medium">
          {letters || `Movement ${movement.n}`}
        </p>
        <p className="mt-2 text-xl leading-snug">{instruction}</p>
        {coach && spokenCue?.text && (
          <p className="mt-3 text-base leading-relaxed text-accent">{spokenCue.text}</p>
        )}
        {directives && movement.directive.trim() && (
          <p className="mt-3 text-base leading-relaxed text-muted">{movement.directive}</p>
        )}
        <div className="mx-auto mt-4 w-full max-w-sm">{children(movement)}</div>
        <p className="mt-auto py-3 text-center text-sm text-muted">
          {phase === "speaking"
            ? "Reading this movement"
            : canHear
              ? "Say next, or tap"
              : "Tap for the next movement"}
          {auto ? ` · auto ${clampGap(gap)}s` : ""}
        </p>
      </button>
      <div
        className="grid grid-cols-2 gap-2 border-t border-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="min-h-12 rounded-lg border border-line text-sm font-semibold disabled:opacity-40"
          disabled={index <= 0}
          onClick={() => go(index - 1)}
        >
          Back
        </button>
        <button
          type="button"
          className="min-h-12 rounded-lg border border-line text-sm font-semibold"
          onClick={() => go(index, true)}
        >
          Repeat
        </button>
        {refreshError && (
          <p className="col-span-2 text-xs text-danger">{refreshError}</p>
        )}
        <label className="col-span-2 flex min-h-11 items-center justify-between gap-3 text-sm">
          <span>Coach cues</span>
          <input
            type="checkbox"
            className="size-5"
            checked={coach}
            onChange={(event) => setCoach(event.target.checked)}
          />
        </label>
        <label className="col-span-2 flex min-h-11 items-center justify-between gap-3 text-sm">
          <span>Directive ideas</span>
          <input
            type="checkbox"
            className="size-5"
            checked={directives}
            onChange={(event) => setDirectives(event.target.checked)}
          />
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-5"
            checked={auto}
            onChange={(event) => setAuto(event.target.checked)}
          />
          Auto
        </label>
        <label className="flex min-h-11 items-center justify-end gap-2 text-sm">
          Gap
          <input
            type="number"
            min={2}
            max={60}
            inputMode="numeric"
            value={gap}
            onChange={(event) => setGap(clampGap(Number(event.target.value)))}
            className="w-16 rounded-lg border border-line bg-surface px-2 py-2 text-right tabular-nums"
            aria-label="Seconds before the next movement"
          />
          s
        </label>
      </div>
    </div>
  );
}
