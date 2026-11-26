import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Mic, MessageSquarePlus, RotateCcw, Square, Trash2, X } from "lucide-react";
import { APP_VERSION } from "@/lib/app-version";
import { feedbackOptions, submitFeedback } from "@/lib/feedback";
import {
  FEEDBACK_KINDS,
  FEEDBACK_KIND_LABELS,
  MAX_MESSAGE_CHARS,
  MAX_VOICE_SECONDS,
  formatDuration,
  voiceExtension,
  type FeedbackKind,
} from "@/lib/feedback-rules";
import { useVoiceRecorder, voiceSupported } from "@/lib/use-voice-recorder";
import { cn } from "@/lib/utils";

function deviceContext(): string {
  const ua = navigator.userAgent;
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches;
  return standalone ? `${ua} (home-screen app)` : ua;
}

/**
 * The beta Feedback button and its sheet. Lives in the rider header, so it is on
 * every main screen but hidden under the arena caller while riding.
 */
export function FeedbackButton({ page, className }: { page?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 text-xs font-bold text-accent",
            className,
          )}
        >
          <MessageSquarePlus className="size-4" aria-hidden />
          Feedback
        </button>
      </Dialog.Trigger>
      {open && <FeedbackSheet page={page} onClose={() => setOpen(false)} />}
    </Dialog.Root>
  );
}

function FeedbackSheet({ page, onClose }: { page?: string; onClose: () => void }) {
  const [kind, setKind] = useState<FeedbackKind>("general");
  const [message, setMessage] = useState("");
  const [voiceOn, setVoiceOn] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const voice = useVoiceRecorder();
  const { state } = voice;

  useEffect(() => {
    let live = true;
    feedbackOptions()
      .then((o) => live && setVoiceOn(o.voice && voiceSupported()))
      .catch(() => live && setVoiceOn(false));
    return () => {
      live = false;
    };
  }, []);

  const recording = state.phase === "recording" || state.phase === "asking";
  const hasVoice = state.phase === "ready";
  const canSend = !sending && !recording && (message.trim().length > 0 || hasVoice);

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("kind", kind);
      form.set("message", message.trim());
      const where = `${window.location.pathname}${page ? ` · ${page}` : ""}`;
      form.set("page", where);
      form.set("appVersion", APP_VERSION);
      form.set("userAgent", deviceContext());
      if (state.phase === "ready") {
        form.set("audioMs", String(state.ms));
        const ext = voiceExtension(state.blob.type) || "m4a";
        form.set("audio", state.blob, `voice-note.${ext}`);
      }
      await submitFeedback({ data: form });
      voice.reset();
      setSent(true);
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      setError(
        text && text.length < 200
          ? text
          : "Your feedback didn't send. Check your connection and try again.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px]" />
      <Dialog.Content
        className="fixed inset-x-0 bottom-0 z-[61] mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-2xl border border-line bg-surface px-4 pt-4 text-fg shadow-2xl sm:bottom-4 sm:rounded-2xl"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        onEscapeKeyDown={() => voice.reset()}
        onInteractOutside={(event) => {
          // A stray tap outside should not throw away a recording or a long note.
          if (recording || hasVoice || message.trim()) event.preventDefault();
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <Dialog.Title className="font-display text-lg font-extrabold">
              {sent ? "Thanks for your feedback" : "Send feedback"}
            </Dialog.Title>
            <Dialog.Description className="mt-0.5 text-sm text-muted">
              {sent
                ? "It's on its way to Susan."
                : "Tell us what's working, what isn't, or what you'd love to see. Type it, say it, or both."}
            </Dialog.Description>
          </div>
          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="Close"
              onClick={() => voice.reset()}
              className="-mr-1 grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-sunken"
            >
              <X className="size-5" />
            </button>
          </Dialog.Close>
        </div>

        {sent ? (
          <div className="py-6 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-accent/15 text-accent">
              <Check className="size-7" />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              Every message is read, and you&apos;ll hear back if more detail would help. Thank you
              for helping make XSalute better for every rider.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 min-h-12 w-full cursor-pointer rounded-xl bg-accent font-display font-extrabold text-accent-fg"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <fieldset className="mt-4">
              <legend className="text-xs font-semibold text-muted">
                What&apos;s it about? (optional)
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {FEEDBACK_KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={kind === k}
                    onClick={() => setKind(k)}
                    className={cn(
                      "min-h-9 cursor-pointer rounded-full border px-3 text-xs font-bold",
                      kind === k
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-line text-muted",
                    )}
                  >
                    {FEEDBACK_KIND_LABELS[k]}
                  </button>
                ))}
              </div>
            </fieldset>

            <label htmlFor="feedback-message" className="mt-4 text-xs font-semibold text-muted">
              Your message
            </label>
            <textarea
              id="feedback-message"
              value={message}
              maxLength={MAX_MESSAGE_CHARS}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="For example: the caller skipped a movement in my test, or I'd love to see…"
              className="mt-1.5 w-full resize-y rounded-lg border border-line bg-sunken px-3 py-2.5 text-base text-fg placeholder:text-faint focus:border-accent focus:outline-none"
            />

            {voiceOn && (
              <div className="mt-4 rounded-xl border border-line bg-sunken p-3">
                <p className="text-xs font-semibold text-muted">
                  Voice note (optional, up to {MAX_VOICE_SECONDS / 60} minutes)
                </p>
                {state.phase === "recording" ? (
                  <div className="mt-2 flex items-center gap-3">
                    <span className="relative flex size-3" aria-hidden>
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-60" />
                      <span className="relative inline-flex size-3 rounded-full bg-danger" />
                    </span>
                    <span className="font-mono text-sm tabular-nums" aria-live="polite">
                      Recording {formatDuration(voice.elapsed)} /{" "}
                      {formatDuration(MAX_VOICE_SECONDS * 1000)}
                    </span>
                    <button
                      type="button"
                      onClick={voice.stop}
                      className="ml-auto inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg bg-danger px-4 text-sm font-bold text-accent-fg"
                    >
                      <Square className="size-4" fill="currentColor" /> Stop
                    </button>
                  </div>
                ) : state.phase === "ready" ? (
                  <div className="mt-2 space-y-2">
                    {/* Plays back the note before sending. playsInline keeps iPhone inline. */}
                    <audio
                      src={state.url}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void voice.start()}
                        className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-line text-sm font-semibold"
                      >
                        <RotateCcw className="size-4" /> Record again
                      </button>
                      <button
                        type="button"
                        onClick={voice.reset}
                        className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-line px-4 text-sm font-semibold text-muted"
                      >
                        <Trash2 className="size-4" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <button
                      type="button"
                      disabled={state.phase === "asking"}
                      onClick={() => void voice.start()}
                      className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-accent/50 text-sm font-bold text-accent disabled:opacity-50"
                    >
                      <Mic className="size-4" />
                      {state.phase === "asking"
                        ? "Starting the microphone…"
                        : "Record a voice note"}
                    </button>
                    {state.phase === "error" && (
                      <p className="mt-2 text-xs text-warn">{state.message}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <p className="mt-3 text-[11px] leading-snug text-faint">
              To help fix things, we also send the screen you were on, the app version and your
              device type.
            </p>

            {error && (
              <p className="mt-3 text-sm text-danger" role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={!canSend}
              onClick={() => void send()}
              className="mt-4 min-h-12 w-full cursor-pointer rounded-xl bg-accent font-display font-extrabold text-accent-fg disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending ? "Sending…" : "Send feedback"}
            </button>
          </>
        )}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
