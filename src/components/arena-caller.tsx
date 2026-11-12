import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  clampGap,
  hearsNext,
  movementCall,
  primeCallerSpeech,
  speechStatusMessage,
  voiceScore,
  type SpeechSink,
  SPEECH_SILENT_HINT,
} from "@/lib/arena-caller";
import type { CallClip } from "@/lib/arena-caller";
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
  try {
    const w = window as Window & {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  } catch {
    return null;
  }
}

function sinkFor(
  synth: SpeechSynthesis,
  voice: SpeechSynthesisVoice | null,
  onBlocked: () => void,
): SpeechSink {
  return {
    get paused() {
      return synth.paused;
    },
    cancel: () => synth.cancel(),
    resume: () => synth.resume(),
    speak: (text: string) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-NZ";
      utterance.rate = 0.95;
      if (voice) utterance.voice = voice;
      utterance.onerror = () => onBlocked();
      synth.speak(utterance);
    },
  };
}

/**
 * Full-screen caller. The first speak() happens inside the tap. iOS ignores
 * speech that starts later, including from an effect.
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
  const [armed, setArmed] = useState(false);
  const [directives, setDirectives] = useState(false);
  const [coach, setCoach] = useState(true);
  const [auto, setAuto] = useState(false);
  const [gap, setGap] = useState(8);
  const [phase, setPhase] = useState<"speaking" | "waiting">("waiting");
  const [canHear, setCanHear] = useState(false);
  const [speechStatus, setSpeechStatus] = useState<string | null>(null);
  const directivesRef = useRef(directives);
  const coachRef = useRef(coach);
  const autoRef = useRef(auto);
  const gapRef = useRef(gap);
  const indexRef = useRef(index);
  const cuesRef = useRef(cues);
  const movementsRef = useRef(movements);
  const timerRef = useRef<number | null>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  directivesRef.current = directives;
  coachRef.current = coach;
  autoRef.current = auto;
  gapRef.current = gap;
  indexRef.current = index;
  cuesRef.current = cues;
  movementsRef.current = movements;
  const movement = movements[Math.min(index, Math.max(0, movements.length - 1))];
  const letters = movement?.steps
    .map((step) => step.at)
    .filter(Boolean)
    .join(" · ");
  const instruction = movement?.steps
    .map((step) => step.do)
    .filter(Boolean)
    .join(". ");
  const spokenCue = movement ? cues.find((cue) => cue.n === movement.n) : undefined;

  function clipsFor(at: number): CallClip[] {
    const current = movementsRef.current[at];
    if (!current) return [];
    const cue = cuesRef.current.find((item) => item.n === current.n);
    return movementCall(current, directivesRef.current, coachRef.current && cue?.text ? cue : null);
  }

  function stopRecognition() {
    try {
      recRef.current?.stop();
    } catch {
      // Already stopped, or this browser has no recognition.
    }
    recRef.current = null;
  }

  function listenAfterSpeech() {
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setCanHear(false);
      return;
    }
    try {
      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-NZ";
      rec.onresult = (event) => {
        try {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (hearsNext(event.results[i][0].transcript)) go(indexRef.current + 1);
          }
        } catch {
          setCanHear(false);
        }
      };
      rec.onend = () => undefined;
      rec.onerror = () => setCanHear(false);
      recRef.current = rec;
      rec.start();
      setCanHear(true);
    } catch {
      setCanHear(false);
    }
  }

  function speakAt(at: number) {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    stopRecognition();
    try {
      audioRef.current?.pause();
    } catch {
      // The previous clip had already ended.
    }
    const clips = clipsFor(at);
    const texts = clips.filter((clip) => !clip.audioUrl && clip.text.trim()).map((clip) => clip.text);
    const synth = typeof window === "undefined" ? undefined : window.speechSynthesis;
    let finished = false;
    const wait = () => {
      if (finished) return;
      finished = true;
      setPhase("waiting");
      listenAfterSpeech();
      if (autoRef.current && at < movementsRef.current.length - 1) {
        timerRef.current = window.setTimeout(() => go(at + 1), clampGap(gapRef.current) * 1000);
      }
    };
    const outcome = primeCallerSpeech(
      synth
        ? sinkFor(synth, voiceRef.current, () => {
            setSpeechStatus(speechStatusMessage("blocked"));
            wait();
          })
        : null,
      texts,
    );
    for (const clip of clips) {
      if (!clip.audioUrl) continue;
      try {
        const audio = new Audio(clip.audioUrl);
        audioRef.current = audio;
        audio.onended = wait;
        void audio.play().catch(() => {
          setSpeechStatus(speechStatusMessage("blocked"));
          wait();
        });
      } catch {
        setSpeechStatus(speechStatusMessage("blocked"));
      }
    }
    setSpeechStatus(speechStatusMessage(outcome));
    setPhase(clips.length ? "speaking" : "waiting");
    if (!texts.length || outcome !== "ok") wait();
    else window.setTimeout(wait, Math.max(2500, texts.join(" ").length * 70));
  }

  function go(next: number, replay = false) {
    const last = Math.max(0, movementsRef.current.length - 1);
    const clamped = Math.min(last, Math.max(0, next));
    if (!replay && clamped === indexRef.current && armed) return;
    speakAt(clamped);
    indexRef.current = clamped;
    setIndex(clamped);
    setArmed(true);
  }

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) {
      setSpeechStatus(speechStatusMessage("unavailable"));
      return;
    }
    const remember = () => {
      try {
        const voices = synth.getVoices();
        voiceRef.current = [...voices].sort((a, b) => voiceScore(b) - voiceScore(a))[0] ?? null;
      } catch {
        voiceRef.current = null;
      }
    };
    remember();
    synth.addEventListener?.("voiceschanged", remember);
    let lock: { release: () => Promise<void> } | null = null;
    let dropped = false;
    try {
      void navigator.wakeLock
        ?.request("screen")
        .then((sentinel) => {
          if (dropped) void sentinel.release().catch(() => undefined);
          else lock = sentinel;
        })
        .catch(() => undefined);
    } catch {
      // Wake Lock is optional. A throw here must not kill the caller.
    }
    return () => {
      dropped = true;
      synth.removeEventListener?.("voiceschanged", remember);
      try {
        void lock?.release();
      } catch {
        // Already released.
      }
      stopRecognition();
      try {
        synth.cancel();
      } catch {
        // Nothing was speaking.
      }
    };
  }, []);

  if (!movement) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-bg text-fg"
      role="dialog"
      aria-label={`Caller for ${title}`}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button type="button" className="min-h-11 text-sm font-semibold text-accent" onClick={onClose}>
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
      <div className="flex min-h-0 flex-1 flex-col px-4 pt-2">
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
        {!armed ? (
          <button
            type="button"
            className="mt-4 min-h-16 w-full rounded-xl bg-accent text-lg font-semibold text-accent-fg"
            onClick={() => go(0, true)}
          >
            Tap to start
          </button>
        ) : (
          <button
            type="button"
            className="mt-4 min-h-16 w-full rounded-xl border border-line text-base font-semibold"
            onClick={() => go(index + 1)}
            aria-label="Next movement"
          >
            Next
          </button>
        )}
        <p className="mt-auto py-3 text-center text-sm text-muted">
          {speechStatus ??
            (phase === "speaking"
              ? "Reading this movement"
              : canHear
                ? "Say next, or tap"
                : "Tap for the next movement")}
          {auto ? ` · auto ${clampGap(gap)}s` : ""}
        </p>
        <p className="pb-2 text-center text-xs text-muted">{SPEECH_SILENT_HINT}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          className="min-h-12 rounded-lg border border-line text-sm font-semibold disabled:opacity-40"
          disabled={!armed || index <= 0}
          onClick={() => go(index - 1)}
        >
          Back
        </button>
        <button
          type="button"
          className="min-h-12 rounded-lg border border-line text-sm font-semibold disabled:opacity-40"
          disabled={!armed}
          onClick={() => go(index, true)}
        >
          Repeat
        </button>
        {refreshError && <p className="col-span-2 text-xs text-danger">{refreshError}</p>}
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
