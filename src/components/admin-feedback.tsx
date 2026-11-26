import { useCallback, useEffect, useRef, useState } from "react";
import {
  feedbackPlaybackUrl,
  listFeedbackForAdmin,
  setFeedbackHandled,
  type FeedbackItem,
} from "@/lib/feedback";
import { FEEDBACK_KIND_LABELS, deviceLabel, formatDuration } from "@/lib/feedback-rules";
import { Kicker, Panel } from "./beta-ui";
import { cn } from "@/lib/utils";

type Filter = "open" | "handled" | "all";

const KIND_CLASS: Record<FeedbackItem["kind"], string> = {
  bug: "bg-danger/15 text-danger",
  idea: "bg-violet/20 text-[#b9a8ff]",
  general: "bg-sunken text-muted",
};

function when(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-NZ", {
      timeZone: "Pacific/Auckland",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Admin → Feedback: read, play voice notes, and mark items handled. */
export function FeedbackAdmin() {
  const [items, setItems] = useState<FeedbackItem[] | null>(null);
  const [filter, setFilter] = useState<Filter>("open");
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLElement | null>(null);

  const load = useCallback(() => {
    listFeedbackForAdmin()
      .then(setItems)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);
  useEffect(load, [load]);

  // The email link goes to /admin#feedback.
  useEffect(() => {
    if (items && window.location.hash === "#feedback")
      ref.current?.scrollIntoView({ block: "start" });
  }, [items]);

  const count = (f: Filter) => (items ?? []).filter((i) => f === "all" || i.status === f).length;
  const list = (items ?? []).filter((i) => filter === "all" || i.status === filter);

  return (
    <Panel className="mt-4">
      <section id="feedback" ref={ref} className="scroll-mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Kicker>Beta feedback</Kicker>
            <p className="mt-1 font-display text-xl font-extrabold">
              Feedback{" "}
              {items && count("open") > 0 && (
                <span className="text-accent">· {count("open")} new</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className="cursor-pointer text-xs font-semibold text-accent"
          >
            Refresh
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          {(["open", "handled", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold capitalize",
                filter === f ? "border-accent bg-accent/15 text-accent" : "border-line text-muted",
              )}
            >
              {f === "open" ? "To do" : f} · {count(f)}
            </button>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        {!items && !error && <p className="mt-3 text-sm text-muted">Loading…</p>}
        {items && list.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">
            {filter === "open"
              ? "Nothing waiting. All feedback is handled."
              : "No feedback here yet."}
          </p>
        )}
        <div className="mt-3 space-y-3">
          {list.map((item) => (
            <FeedbackCard key={item.id} item={item} onChanged={load} />
          ))}
        </div>
      </section>
    </Panel>
  );
}

function FeedbackCard({ item, onChanged }: { item: FeedbackItem; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const handled = item.status === "handled";

  const play = async () => {
    setAudioError(null);
    try {
      const out = await feedbackPlaybackUrl({ data: { id: item.id } });
      if (!out.url) setAudioError("This voice note isn't available. Storage may be switched off.");
      setUrl(out.url || null);
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : String(err));
    }
  };

  const toggle = async () => {
    setBusy(true);
    try {
      await setFeedbackHandled({ data: { id: item.id, handled: !handled } });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={cn("rounded-lg border border-line bg-sunken p-3", handled && "opacity-70")}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold text-fg">{item.riderName}</span>
        <span className={cn("rounded-full px-2 py-0.5 font-bold", KIND_CLASS[item.kind])}>
          {FEEDBACK_KIND_LABELS[item.kind]}
        </span>
        <span className="text-muted">{when(item.createdAt)}</span>
        {handled && (
          <span className="rounded-full bg-accent/15 px-2 py-0.5 font-bold text-accent">
            Handled
          </span>
        )}
      </div>
      {item.message ? (
        <p className="mt-2 text-sm whitespace-pre-wrap text-ink-soft">{item.message}</p>
      ) : (
        <p className="mt-2 text-sm text-muted italic">Voice note only</p>
      )}
      {item.hasAudio && (
        <div className="mt-2">
          {url ? (
            <audio src={url} controls autoPlay playsInline className="w-full" />
          ) : (
            <button
              type="button"
              onClick={() => void play()}
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-accent/50 px-3 text-sm font-bold text-accent"
            >
              ▶ Play voice note ({formatDuration(item.audioMs)})
            </button>
          )}
          {audioError && <p className="mt-1 text-xs text-warn">{audioError}</p>}
        </div>
      )}
      <p className="mt-2 text-[11px] leading-snug text-faint">
        {item.page || "Unknown screen"} · {deviceLabel(item.userAgent)} · v{" "}
        {item.appVersion || "unknown"}
        {item.riderEmail && (
          <>
            {" · "}
            <a href={`mailto:${item.riderEmail}`} className="underline underline-offset-2">
              {item.riderEmail}
            </a>
          </>
        )}
        {handled && item.handledBy ? ` · handled by ${item.handledBy}` : ""}
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void toggle()}
        className={cn(
          "mt-2 min-h-10 cursor-pointer rounded-lg px-3 text-xs font-bold disabled:opacity-50",
          handled ? "border border-line text-muted" : "bg-accent text-accent-fg",
        )}
      >
        {handled ? "Reopen" : "Mark handled"}
      </button>
    </article>
  );
}
