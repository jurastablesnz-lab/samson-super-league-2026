import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  chooseVoice,
  clampGap,
  hearsNext,
  interruptCallerSpeech,
  movementCall,
  primeCallerSpeech,
  speechStatusMessage,
  SPEECH_SILENT_HINT,
} from "@/lib/arena-caller";
import type { CallClip } from "@/lib/arena-caller";
import { callerSpeechLines, resolveClipUrl, speechText, TEST_SOUND_TEXT } from "@/lib/caller-speech";
import { prefetchCallerSpeech } from "@/lib/caller-prefetch";
import type { Movement } from "@/lib/tests/types";

const UNLOCK_BEEP =
  "data:audio/wav;base64,UklGRhQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YfAAAACAgoaIhHtxa3B+kqChkXZcUFt5n7m4nXVSRFJ1nbi5oHhURE9xmra6o3xXRE1tlrW7poBaRUtqk7O8qYRdRkpmj7G8rIhgR0hji668rotjSEdgiKy8sY9mSkZdhKm8s5NqS0VagKa7tZZtTURXfKO6tppxT0RUeKC5uJ11UkRSdZ24uaB4VERPcZq2uqN8V0RNbZa1u6aAWkVLapOzvKmEXUZKZo+xvKyIYEdIY4uuvK6LY0hHYIisvLGPZkpGXYSpvLOTaktFWoCmu7WWbU1EV3yjuLOXc1hQXnqXpqORemdianuMlJOKfnZ0eH6DhII=";

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
  cues?: { n: number; text: string; audioUrl?: string; spoken?: string }[];
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
  const [voiceLine, setVoiceLine] = useState("Voice: not started");
  const [voiceBlocked, setVoiceBlocked] = useState(false);
  const [debug, setDebug] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("debug") === "1";
  });
  const [diagLines, setDiagLines] = useState<string[]>([]);
  const [voiceCount, setVoiceCount] = useState(0);
  const [voiceLabel, setVoiceLabel] = useState("default (lang unset)");
  const [recState, setRecState] = useState("idle");
  const [lastError, setLastError] = useState("");
  const [prep, setPrep] = useState<{ done: number; total: number } | null>(null);
  const [prepNote, setPrepNote] = useState<string | null>(null);
  const [ttsVoice, setTtsVoice] = useState("");
  const [lastVoice, setLastVoice] = useState("none");
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
  const urlsRef = useRef<Record<string, string>>({});
  const ttsVoiceRef = useRef("");
  const utterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const startTimerRef = useRef<number | null>(null);
  const titleTaps = useRef(0);
  const speakGen = useRef(0);
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

  function logDiag(line: string) {
    setDiagLines((prev) => [...prev.slice(-11), line]);
  }

  function noteVoice(engine: string, text: string) {
    const snippet = speechText(text).slice(0, 80);
    setLastVoice(engine);
    logDiag(`${engine}: ${snippet}`);
  }

  function clipsFor(at: number): CallClip[] {
    const current = movementsRef.current[at];
    if (!current) return [];
    const cue = cuesRef.current.find((item) => item.n === current.n);
    return movementCall(current, directivesRef.current, {
      text: coachRef.current && cue?.text ? cue.text : "",
      audioUrl: coachRef.current ? cue?.audioUrl : undefined,
      spoken: cue?.spoken,
    });
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
      setRecState("unsupported");
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
        } catch (err) {
          setCanHear(false);
          setRecState("error");
          setLastError(err instanceof Error ? err.message : String(err));
        }
      };
      rec.onend = () => setRecState("idle");
      rec.onerror = () => {
        setCanHear(false);
        setRecState("error");
      };
      recRef.current = rec;
      rec.start();
      setCanHear(true);
      setRecState("listening");
    } catch (err) {
      setCanHear(false);
      setRecState("error");
      setLastError(err instanceof Error ? err.message : String(err));
    }
  }

  function quietAudio() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.onended = null;
    audio.onerror = null;
    audio.onplaying = null;
    try {
      audio.pause();
    } catch {
      // The previous clip had already ended.
    }
  }

  function speakBrowser(text: string, onDone: () => void) {
    const line = speechText(text);
    if (!line) {
      onDone();
      return;
    }
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(line);
    const voice = voiceRef.current;
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    utterance.rate = 0.95;
    utterancesRef.current = [utterance];
    let heard = false;
    let done = false;
    const finishLine = () => {
      if (done) return;
      done = true;
      if (startTimerRef.current != null) window.clearTimeout(startTimerRef.current);
      onDone();
    };
    utterance.onstart = () => {
      heard = true;
      if (startTimerRef.current != null) window.clearTimeout(startTimerRef.current);
      setVoiceBlocked(false);
      setVoiceLine("Voice: speaking");
      logDiag("start");
    };
    utterance.onend = () => {
      setVoiceLine("Voice: ended");
      logDiag("end");
      finishLine();
    };
    utterance.onerror = (event) => {
      const code = event.error || "unknown";
      setLastError(code);
      logDiag(`error:${code}`);
      if (code !== "interrupted" && code !== "canceled") {
        setVoiceLine(`Voice: error ${code}`);
        setVoiceBlocked(true);
        setSpeechStatus("Voice blocked");
      }
      finishLine();
    };
    const outcome = primeCallerSpeech(
      synth
        ? {
            resume: () => synth.resume(),
            speak: () => synth.speak(utterance),
          }
        : null,
      [line],
    );
    noteVoice("phone", line);
    if (outcome !== "ok") {
      setVoiceLine(outcome === "unavailable" ? "Voice: not started" : "Voice: blocked");
      setVoiceBlocked(true);
      setSpeechStatus(speechStatusMessage(outcome));
      finishLine();
      return;
    }
    setPhase("speaking");
    if (!heard) {
      startTimerRef.current = window.setTimeout(() => {
        if (heard || done) return;
        setVoiceBlocked(true);
        setSpeechStatus("Voice blocked");
        setVoiceLine("Voice: blocked");
        logDiag("no start within 1.5s");
        interruptCallerSpeech(window.speechSynthesis);
        finishLine();
      }, 1500);
    }
  }

  function playClips(clips: CallClip[], at: number) {
    quietAudio();
    stopRecognition();
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    if (startTimerRef.current != null) window.clearTimeout(startTimerRef.current);
    startTimerRef.current = null;
    const gen = ++speakGen.current;
    const audio = audioRef.current;
    let finished = false;
    const finish = () => {
      if (finished || gen !== speakGen.current) return;
      finished = true;
      setPhase("waiting");
      setVoiceLine((line) => (line.startsWith("Voice: error") || line === "Voice: blocked" ? line : "Voice: ended"));
      listenAfterSpeech();
      if (autoRef.current && at < movementsRef.current.length - 1) {
        timerRef.current = window.setTimeout(() => go(at + 1), clampGap(gapRef.current) * 1000);
      }
    };
    const step = (i: number, inGesture: boolean) => {
      if (gen !== speakGen.current) return;
      const clip = clips[i];
      if (!clip) return finish();
      const url = resolveClipUrl(clip, urlsRef.current);
      if (url && audio) {
        let committed = false;
        const fallback = () => {
          if (committed || gen !== speakGen.current) return;
          committed = true;
          quietAudio();
          speakBrowser(clip.text, () => step(i + 1, false));
        };
        const mark = () => {
          if (gen !== speakGen.current || committed) return;
          committed = true;
          if (startTimerRef.current != null) window.clearTimeout(startTimerRef.current);
          setVoiceBlocked(false);
          setSpeechStatus(null);
          setVoiceLine("Voice: speaking");
          noteVoice(ttsVoiceRef.current || "xai", clip.text);
        };
        audio.onended = () => {
          if (gen !== speakGen.current) return;
          setVoiceLine("Voice: ended");
          step(i + 1, false);
        };
        audio.onerror = () => fallback();
        audio.onplaying = mark;
        audio.src = url;
        const pending = audio.play();
        setPhase("speaking");
        pending?.then(mark).catch(() => fallback());
        startTimerRef.current = window.setTimeout(() => {
          if (committed || gen !== speakGen.current) return;
          setVoiceBlocked(true);
          setSpeechStatus("Voice blocked");
          setVoiceLine("Voice: blocked");
          logDiag("no start within 1.5s");
          fallback();
        }, 1500);
        return;
      }
      if (inGesture && audio) {
        try {
          audio.src = UNLOCK_BEEP;
          void audio.play();
        } catch (err) {
          setLastError(err instanceof Error ? err.message : String(err));
        }
      }
      if (!clip.text.trim()) {
        step(i + 1, inGesture);
        return;
      }
      speakBrowser(clip.text, () => step(i + 1, false));
    };
    if (!clips.length) {
      if (audio) {
        try {
          audio.src = UNLOCK_BEEP;
          void audio.play();
        } catch {
          // Nothing to say. The element is still unlocked for a later line.
        }
      }
      finish();
      return;
    }
    step(0, true);
  }

  function speakAt(at: number) {
    playClips(clipsFor(at), at);
  }

  function go(next: number, replay = false) {
    const last = Math.max(0, movementsRef.current.length - 1);
    const clamped = Math.min(last, Math.max(0, next));
    if (!replay && clamped === indexRef.current && armed) return;
    try {
      speakAt(clamped);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLastError(message);
      logDiag(`js:${message}`);
      setVoiceBlocked(true);
      setSpeechStatus("Voice blocked");
    }
    indexRef.current = clamped;
    setIndex(clamped);
    setArmed(true);
  }

  function testSound() {
    quietAudio();
    stopRecognition();
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    const gen = ++speakGen.current;
    const audio = audioRef.current;
    const url = urlsRef.current[TEST_SOUND_TEXT];
    if (url && audio) {
      let committed = false;
      audio.onplaying = () => {
        if (gen !== speakGen.current || committed) return;
        committed = true;
        if (startTimerRef.current != null) window.clearTimeout(startTimerRef.current);
        setVoiceBlocked(false);
        setVoiceLine("Voice: speaking");
        noteVoice(ttsVoiceRef.current || "xai", TEST_SOUND_TEXT);
      };
      audio.onended = () => {
        if (gen === speakGen.current) setVoiceLine("Voice: ended");
      };
      audio.onerror = () => {
        if (!committed && gen === speakGen.current) speakBrowser(TEST_SOUND_TEXT, () => undefined);
      };
      audio.src = url;
      const pending = audio.play();
      pending?.catch(() => {
        if (!committed && gen === speakGen.current) speakBrowser(TEST_SOUND_TEXT, () => undefined);
      });
      return;
    }
    if (audio) {
      try {
        audio.src = UNLOCK_BEEP;
        void audio.play();
      } catch (err) {
        setLastError(err instanceof Error ? err.message : String(err));
      }
    }
    speakBrowser(TEST_SOUND_TEXT, () => undefined);
  }

  function pressDown() {
    if (!armed) return;
    speakGen.current += 1;
    quietAudio();
    interruptCallerSpeech(window.speechSynthesis);
    stopRecognition();
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
        setVoiceCount(voices.length);
        const chosen = chooseVoice(voices);
        voiceRef.current = chosen;
        setVoiceLabel(chosen ? `${chosen.name} (${chosen.lang})` : "default (lang unset)");
      } catch (err) {
        voiceRef.current = null;
        setVoiceLabel("default (lang unset)");
        setLastError(err instanceof Error ? err.message : String(err));
      }
    };
    remember();
    synth.addEventListener?.("voiceschanged", remember);
    const onError = (event: ErrorEvent) => {
      setLastError(event.message);
      logDiag(`js:${event.message}`);
    };
    window.addEventListener("error", onError);
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
      window.removeEventListener("error", onError);
      try {
        void lock?.release();
      } catch {
        // Already released.
      }
      stopRecognition();
      quietAudio();
      try {
        synth.cancel();
      } catch {
        // Nothing was speaking.
      }
    };
  }, []);

  useEffect(() => {
    let dead = false;
    const lines = callerSpeechLines(movements, cues);
    void prefetchCallerSpeech(lines, (done, total) => {
      if (!dead) setPrep({ done, total });
    }).then((result) => {
      if (dead) return;
      urlsRef.current = { ...urlsRef.current, ...result.urls };
      if (result.voice) {
        ttsVoiceRef.current = result.voice;
        setTtsVoice(result.voice);
      }
      if (result.note) setPrepNote(result.note);
    });
    return () => {
      dead = true;
    };
  }, [movements, cues]);

  if (!movement) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-bg text-fg"
      role="dialog"
      aria-label={`Caller for ${title}`}
    >
      <audio ref={audioRef} playsInline preload="auto" className="pointer-events-none absolute h-0 w-0" />
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
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-2">
        <p className="shrink-0 text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">{title}</p>
        <button
          type="button"
          className="font-display mt-1 shrink-0 text-left text-3xl leading-tight font-medium"
          onClick={() => {
            titleTaps.current += 1;
            if (titleTaps.current >= 5) setDebug(true);
          }}
        >
          {letters || `Movement ${movement.n}`}
        </button>
        <div className="mt-2 max-h-[28%] shrink-0 overflow-y-auto">
          <p className="text-xl leading-snug">{instruction}</p>
          {coach && spokenCue?.text && (
            <p className="mt-2 text-base leading-relaxed text-accent">{spokenCue.text}</p>
          )}
          {directives && movement.directive.trim() && (
            <p className="mt-2 text-base leading-relaxed text-muted">{movement.directive}</p>
          )}
        </div>
        <div className="caller-arena mt-2 flex min-h-0 flex-1 items-center justify-center overflow-hidden pointer-events-none [&_svg]:pointer-events-none [&_svg]:mx-auto [&_svg]:h-full [&_svg]:max-h-full [&_svg]:w-auto [&_svg]:max-w-full">
          {children(movement)}
        </div>
      </div>
      <div className="relative z-20 shrink-0 border-t border-line bg-bg px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <p className="text-center text-sm font-semibold" data-testid="voice-status">
          {voiceLine}
        </p>
        <p className="text-center text-xs text-muted">{prepNote ?? speechStatus ?? SPEECH_SILENT_HINT}</p>
        {prep && prep.total > 0 && (
          <p className="text-center text-xs text-muted" data-testid="voice-prep">
            {prep.done >= prep.total ? "Voice ready" : `Preparing voice ${prep.done} of ${prep.total}`}
          </p>
        )}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="relative z-30 min-h-14 rounded-xl border border-line bg-bg text-base font-semibold"
            onClick={testSound}
          >
            Test sound
          </button>
          {!armed ? (
            <button
              type="button"
              className="relative z-30 min-h-14 rounded-xl bg-accent text-base font-semibold text-accent-fg"
              onClick={() => go(0, true)}
            >
              Tap to start
            </button>
          ) : (
            <button
              type="button"
              className="relative z-30 min-h-14 rounded-xl bg-accent text-base font-semibold text-accent-fg"
              onPointerDown={pressDown}
              onClick={() => go(index + 1)}
              aria-label="Next movement"
            >
              Next
            </button>
          )}
          <button
            type="button"
            className="relative z-30 min-h-14 rounded-xl border border-line bg-bg text-base font-semibold disabled:opacity-40"
            disabled={!armed || index <= 0}
            onPointerDown={pressDown}
            onClick={() => go(index - 1)}
          >
            Back
          </button>
          <button
            type="button"
            className="relative z-30 min-h-14 rounded-xl border border-line bg-bg text-base font-semibold disabled:opacity-40"
            disabled={!armed}
            onPointerDown={pressDown}
            onClick={() => go(index, true)}
          >
            Repeat
          </button>
        </div>
        {voiceBlocked && (
          <button
            type="button"
            className="relative z-30 mt-2 min-h-12 w-full rounded-xl border border-line bg-bg text-base font-semibold"
            onClick={() => go(index, true)}
          >
            Retry voice
          </button>
        )}
        {refreshError && <p className="mt-2 text-xs text-danger">{refreshError}</p>}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="flex min-h-11 items-center justify-between gap-2 text-sm">
            <span>Coach cues</span>
            <input
              type="checkbox"
              className="size-5"
              checked={coach}
              onChange={(event) => setCoach(event.target.checked)}
            />
          </label>
          <label className="flex min-h-11 items-center justify-between gap-2 text-sm">
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
        {debug && (
          <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-ink p-2 text-[10px] leading-snug text-accent-fg" data-testid="caller-debug">
            {`speechSynthesis: ${typeof window !== "undefined" && window.speechSynthesis ? "yes" : "no"}
voices: ${voiceCount}
phone voice: ${voiceLabel}
tts voice: ${ttsVoice || "not prepared"}
last voice: ${lastVoice}
prefetch: ${prep ? `${prep.done} of ${prep.total}` : "not started"}
recognition: ${recognitionCtor() ? recState : "unsupported"}
phase: ${phase}${canHear ? " · mic" : ""}
last error: ${lastError || "none"}
${diagLines.join("\n")}`}
          </pre>
        )}
      </div>
    </div>
  );
}
