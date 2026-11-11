import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Share2, Trash2, Video } from "lucide-react";
import { deleteMediaBlob, getMediaBlob, storeVideoFile } from "@/lib/media-db";
import { deleteCoachVisit, deleteEntry, saveCoachVisit, saveSheet } from "@/lib/rider";
import type { CoachVisitRecord, HorseLog, HorseRecord, SheetRecord } from "@/lib/rider-types";
import type { GeneratedPlan } from "@/lib/plan-builder";
import { iso, TODAY } from "@/lib/season";
import { cn } from "@/lib/utils";
import { inputCls, Kicker, PrimaryButton } from "./beta-ui";
import { fmtDay } from "./setup-wizard";

type View = "visits" | "videos" | "sheets";

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5", className)}>
      {children}
    </section>
  );
}

function datesLabel(visit: CoachVisitRecord) {
  return visit.endDate && visit.endDate !== visit.date
    ? `${fmtDay(visit.date)} – ${fmtDay(visit.endDate)}`
    : fmtDay(visit.date);
}

export function CoachTab({
  horse,
  plan,
  log,
  onLog,
  onError,
  sheets,
}: {
  horse: HorseRecord;
  plan: GeneratedPlan;
  log: HorseLog | null;
  onLog: (log: HorseLog) => void;
  onError: (message: string | null) => void;
  sheets: ReactNode;
}) {
  const [view, setView] = useState<View>("visits");
  if (!log) {
    return (
      <Card>
        <p className="text-sm text-muted">Loading…</p>
      </Card>
    );
  }
  const videos = log.sheets.filter((item) => item.kind === "video");
  const sheetCount = log.sheets.filter((item) => item.kind !== "video").length;
  const tabs: { id: View; label: string }[] = [
    { id: "visits", label: log.coachVisits.length ? `Visits ${log.coachVisits.length}` : "Visits" },
    { id: "videos", label: videos.length ? `Videos ${videos.length}` : "Videos" },
    { id: "sheets", label: sheetCount ? `Sheets ${sheetCount}` : "Sheets" },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-sunken p-1" role="tablist" aria-label="Coach">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={view === tab.id}
            onClick={() => setView(tab.id)}
            className={cn(
              "h-11 cursor-pointer rounded-lg text-sm font-semibold",
              view === tab.id ? "bg-surface text-fg shadow-[var(--shadow-card)]" : "text-muted",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {view === "visits" && <Visits horse={horse} log={log} onLog={onLog} onError={onError} />}
      {view === "videos" && (
        <Videos horse={horse} plan={plan} videos={videos} onLog={onLog} onError={onError} />
      )}
      {view === "sheets" && sheets}
    </div>
  );
}

function Visits({
  horse,
  log,
  onLog,
  onError,
}: {
  horse: HorseRecord;
  log: HorseLog;
  onLog: (log: HorseLog) => void;
  onError: (message: string | null) => void;
}) {
  const [open, setOpen] = useState(log.coachVisits.length === 0);
  const [draft, setDraft] = useState({
    id: "",
    date: iso(TODAY),
    endDate: "",
    title: "",
    focus: "",
    film: "",
    homework: "",
    leaveIt: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = iso(TODAY);
  const upcoming = log.coachVisits.filter((v) => (v.endDate || v.date) >= today);
  const past = log.coachVisits.filter((v) => (v.endDate || v.date) < today);

  function edit(visit: CoachVisitRecord) {
    setDraft({
      id: visit.id,
      date: visit.date,
      endDate: visit.endDate !== visit.date ? visit.endDate : "",
      title: visit.title,
      focus: visit.focus,
      film: visit.film,
      homework: visit.homework,
      leaveIt: visit.leaveIt,
    });
    setOpen(true);
    setError(null);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    onError(null);
    try {
      onLog(
        await saveCoachVisit({
          data: {
            horseId: horse.id,
            visit: {
              id: draft.id || undefined,
              date: draft.date,
              endDate: draft.endDate || undefined,
              title: draft.title,
              focus: draft.focus,
              film: draft.film,
              homework: draft.homework,
              leaveIt: draft.leaveIt,
            },
          },
        }),
      );
      setDraft({ id: "", date: iso(TODAY), endDate: "", title: "", focus: "", film: "", homework: "", leaveIt: "" });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    onError(null);
    try {
      onLog(await deleteCoachVisit({ data: { horseId: horse.id, id } }));
      if (draft.id === id) setOpen(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <Kicker>{horse.name}</Kicker>
        <h2 className="font-display mt-1 text-xl font-medium">Use your coach, then ride the plan</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Add the days your coach is coming for {horse.name}. The visit shows on that horse’s week plan.
          Film the lesson, write the homework down, and don’t invent a new programme the next morning.
          These visits stay on {horse.name} only.
        </p>
        {!open && (
          <PrimaryButton type="button" className="mt-3" onClick={() => setOpen(true)}>
            Add a coach visit
          </PrimaryButton>
        )}
        {open && (
          <form className="mt-3 flex flex-col gap-2" onSubmit={(e) => void save(e)}>
            <input
              className={inputCls}
              placeholder="Title, e.g. Polish the test"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-sm">
                Date
                <input
                  type="date"
                  required
                  className={inputCls}
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                />
              </label>
              <label className="text-sm">
                Finish date (optional)
                <input
                  type="date"
                  className={inputCls}
                  value={draft.endDate}
                  onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                />
              </label>
            </div>
            <textarea
              className={inputCls}
              rows={2}
              placeholder="What to work on"
              value={draft.focus}
              onChange={(e) => setDraft({ ...draft, focus: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="What to film"
              value={draft.film}
              onChange={(e) => setDraft({ ...draft, film: e.target.value })}
            />
            <textarea
              className={inputCls}
              rows={2}
              placeholder="Homework"
              value={draft.homework}
              onChange={(e) => setDraft({ ...draft, homework: e.target.value })}
            />
            <textarea
              className={inputCls}
              rows={2}
              placeholder="What to leave alone afterwards"
              value={draft.leaveIt}
              onChange={(e) => setDraft({ ...draft, leaveIt: e.target.value })}
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex gap-2">
              <PrimaryButton type="submit" disabled={busy}>
                {busy ? "Saving…" : draft.id ? "Update visit" : "Save visit"}
              </PrimaryButton>
              <button
                type="button"
                className="cursor-pointer rounded-lg border border-line px-4 text-sm font-semibold"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Card>
      {log.coachVisits.length === 0 && (
        <p className="px-1 text-sm text-muted">No coach visits for {horse.name} yet.</p>
      )}
      <VisitList title="Coming up" visits={upcoming} busy={busy} onEdit={edit} onRemove={remove} />
      <VisitList title="Earlier" visits={past} busy={busy} onEdit={edit} onRemove={remove} />
    </div>
  );
}

function VisitList({
  title,
  visits,
  busy,
  onEdit,
  onRemove,
}: {
  title: string;
  visits: CoachVisitRecord[];
  busy: boolean;
  onEdit: (visit: CoachVisitRecord) => void;
  onRemove: (id: string) => void;
}) {
  if (visits.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <Kicker>{title}</Kicker>
      {visits.map((visit) => (
        <Card key={visit.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Kicker>{datesLabel(visit)}</Kicker>
              <h2 className="font-display mt-1 text-xl font-medium">{visit.title || "Coach"}</h2>
            </div>
            <div className="flex gap-2">
              <button type="button" className="cursor-pointer text-xs font-semibold text-accent" onClick={() => onEdit(visit)}>
                Edit
              </button>
              <button
                type="button"
                className="cursor-pointer text-muted hover:text-danger"
                aria-label="Delete visit"
                disabled={busy}
                onClick={() => onRemove(visit.id)}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
          {visit.focus && <p className="mt-2 text-sm text-muted">{visit.focus}</p>}
          {visit.film && (
            <p className="mt-3 text-sm">
              <span className="font-semibold">Film: </span>
              {visit.film}
            </p>
          )}
          {visit.homework && (
            <div className="mt-3">
              <p className="text-sm font-semibold">Homework</p>
              <p className="mt-1 whitespace-pre-line text-sm text-muted">{visit.homework}</p>
            </div>
          )}
          {visit.leaveIt && (
            <div className="mt-3 rounded-lg bg-sunken p-3">
              <p className="text-sm font-semibold">Leave it</p>
              <p className="mt-1 whitespace-pre-line text-sm text-muted">{visit.leaveIt}</p>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function Videos({
  horse,
  plan,
  videos,
  onLog,
  onError,
}: {
  horse: HorseRecord;
  plan: GeneratedPlan;
  videos: SheetRecord[];
  onLog: (log: HorseLog) => void;
  onError: (message: string | null) => void;
}) {
  const [showName, setShowName] = useState(plan.shows[0]?.name ?? "");
  const [test, setTest] = useState(plan.mainTest);
  const [date, setDate] = useState(iso(TODAY));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveVideo(file: File | undefined) {
    if (!file) return;
    setError(null);
    onError(null);
    if (!file.type.startsWith("video/") && !/\.(mp4|mov|m4v)$/i.test(file.name)) {
      setError("That file is not a video.");
      return;
    }
    setBusy(true);
    const id = `v-${globalThis.crypto.randomUUID()}`;
    try {
      await storeVideoFile(id, file);
      const saved = await saveSheet({
        data: {
          horseId: horse.id,
          sheet: {
            id,
            kind: "video",
            showName,
            date,
            test,
            note: note.trim(),
            mime: file.type || "video/mp4",
          },
        },
      });
      onLog(saved);
      setNote("");
    } catch (err) {
      await deleteMediaBlob(id).catch(() => undefined);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <Kicker>For the coach · {horse.name}</Kicker>
        <h2 className="font-display mt-1 text-xl font-medium">Competition videos</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Film the test, not the warm-up. The clip stays on this device and the note is saved to {horse.name}{" "}
          only. Play it back before the next visit, or share it straight to your coach.
        </p>
        <datalist id={`coach-shows-${horse.id}`}>
          {plan.shows.map((s) => (
            <option key={s.id} value={s.name} />
          ))}
        </datalist>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            className={inputCls}
            list={`coach-shows-${horse.id}`}
            placeholder="Show"
            value={showName}
            onChange={(e) => setShowName(e.target.value)}
          />
          <select className={inputCls} value={test} onChange={(e) => setTest(e.target.value)}>
            {plan.tests.map((t) => (
              <option key={t}>{t}</option>
            ))}
            <option value="Other">Other</option>
          </select>
          <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <textarea
          className={`${inputCls} mt-2`}
          rows={2}
          placeholder="What should your coach look at?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <FileButton capture accept="video/*" disabled={busy} onFile={saveVideo}>
            <Video className="size-4" /> Record a test
          </FileButton>
          <FileButton accept="video/*" disabled={busy} onFile={saveVideo}>
            Choose a clip
          </FileButton>
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </Card>
      {videos.length === 0 ? (
        <p className="px-1 text-sm text-muted">No competition videos for {horse.name} yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {videos.map((item) => (
            <VideoCard
              key={item.id}
              horse={horse}
              item={item}
              onNote={async (next) => {
                try {
                  onLog(
                    await saveSheet({
                      data: { horseId: horse.id, sheet: { ...item, note: next } },
                    }),
                  );
                } catch (err) {
                  onError(err instanceof Error ? err.message : String(err));
                }
              }}
              onRemove={async () => {
                await deleteMediaBlob(item.id).catch(() => undefined);
                try {
                  onLog(await deleteEntry({ data: { horseId: horse.id, kind: "sheet", id: item.id } }));
                } catch (err) {
                  onError(err instanceof Error ? err.message : String(err));
                }
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function FileButton({
  accept,
  capture,
  disabled,
  onFile,
  children,
}: {
  accept: string;
  capture?: boolean;
  disabled?: boolean;
  onFile: (file: File | undefined) => void;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-line px-3 py-3 text-sm font-semibold text-ink-soft",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      {children}
      <input
        type="file"
        accept={accept}
        capture={capture ? "environment" : undefined}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          onFile(file);
        }}
      />
    </label>
  );
}

function VideoCard({
  horse,
  item,
  onNote,
  onRemove,
}: {
  horse: HorseRecord;
  item: SheetRecord;
  onNote: (note: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    let revoke = "";
    let dead = false;
    void getMediaBlob(item.id)
      .then((blob) => {
        if (dead) return;
        if (!blob) {
          setError("This clip is no longer on this device.");
          return;
        }
        revoke = URL.createObjectURL(blob);
        setUrl(revoke);
      })
      .catch(() => {
        if (!dead) setError("Could not open the clip.");
      });
    return () => {
      dead = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [open, item.id]);

  const share = async () => {
    const blob = await getMediaBlob(item.id);
    if (!blob) {
      setError("This clip is no longer on this device.");
      return;
    }
    const safeName = horse.name.replace(/[^\w.-]+/g, "-") || "horse";
    const file = new File([blob], `${safeName}-${item.test.replace(/\s+/g, "-")}.mp4`, {
      type: blob.type || item.mime || "video/mp4",
    });
    const text = [horse.name, item.test, item.showName, item.date, item.note].filter(Boolean).join(" · ");
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
      try {
        await nav.share({ files: [file], title: `${horse.name} test`, text });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(text).catch(() => undefined);
    setCopied(true);
  };

  return (
    <li className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)]">
      <button type="button" className="w-full text-left" onClick={() => setOpen((v) => !v)}>
        <p className="text-sm font-semibold">
          {item.test}
          {item.showName ? ` · ${item.showName}` : ""}
        </p>
        <p className="mt-0.5 text-xs text-faint">{item.date ? fmtDay(item.date) : "No date"}</p>
        {item.note && <p className="mt-2 text-sm text-muted">{item.note}</p>}
      </button>
      {open && (
        <div className="mt-3">
          {url ? (
            <video src={url} controls playsInline className="w-full rounded-lg bg-fg" />
          ) : (
            <p className="text-sm text-muted">{error ?? "Opening the clip…"}</p>
          )}
          <label className="mt-3 block text-sm">
            Note for your coach
            <textarea
              defaultValue={item.note}
              rows={2}
              onBlur={(e) => onNote(e.target.value.trim())}
              className={`${inputCls} mt-1`}
            />
          </label>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-semibold"
              onClick={() => void share()}
            >
              <Share2 className="size-4" />
              {copied ? "Note copied" : "Share"}
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-lg border border-line px-3 py-2 text-muted hover:text-danger"
              aria-label="Delete video"
              onClick={onRemove}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
