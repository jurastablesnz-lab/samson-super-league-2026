import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Camera, Check, ImagePlus, Share2, Trash2, Video, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { compressSheetPhoto, deleteMediaBlob, getMediaBlob, putMediaBlob } from "@/lib/media-db";
import { summariseSheet } from "@/lib/summarise-sheet";
import { SHOWS, TEST_OPTIONS, TODAY } from "@/lib/season";
import { usePlan, type ReviewItem, type SheetRead } from "@/lib/store";
import { MAX_SHEET_PHOTOS, sheetPhotoIds } from "@/lib/review-types";

const JUDGE_LABELS = ["", "C", "E", "B", "H", "M", "Judge 1", "Judge 2", "Judge 3"];

type DraftPhoto = { key: string; blob: Blob; dataUrl: string; url: string; label: string };

export type ReviewView = "visits" | "videos" | "sheets";

function showName(id: string) {
  return SHOWS.find((s) => s.id === id)?.short ?? id;
}

function recentShowId() {
  const key = format(TODAY, "yyyy-MM-dd");
  const started = [...SHOWS].reverse().find((s) => s.start <= key && !s.optional);
  return started?.id ?? SHOWS[0].id;
}

export function ReviewNav({
  view,
  setView,
}: {
  view: ReviewView;
  setView: (view: ReviewView) => void;
}) {
  const review = usePlan((s) => s.review);
  const videos = review.filter((item) => item.kind === "video").length;
  const sheets = review.filter((item) => item.kind === "sheet").length;
  const tabs: { id: ReviewView; label: string }[] = [
    { id: "visits", label: "Visits" },
    { id: "videos", label: videos ? `Videos ${videos}` : "Videos" },
    { id: "sheets", label: sheets ? `Sheets ${sheets}` : "Sheets" },
  ];
  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-sunken p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setView(tab.id)}
          className={cn(
            "h-11 rounded-lg text-sm font-semibold transition-colors duration-150",
            view === tab.id ? "bg-surface text-fg shadow-[var(--shadow-card)]" : "text-muted",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function fieldClass() {
  return "mt-1 h-11 w-full rounded-md bg-bg px-3 text-sm shadow-[var(--shadow-card)]";
}

function MetaFields({
  showId,
  setShowId,
  test,
  setTest,
  date,
  setDate,
  note,
  setNote,
  noteLabel,
  notePlaceholder,
}: {
  showId: string;
  setShowId: (v: string) => void;
  test: string;
  setTest: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  noteLabel: string;
  notePlaceholder: string;
}) {
  return (
    <div className="mt-3 flex flex-col gap-3">
      <label className="text-sm">
        Show
        <select className={fieldClass()} value={showId} onChange={(e) => setShowId(e.target.value)}>
          {SHOWS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.short}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Test
          <select className={fieldClass()} value={test} onChange={(e) => setTest(e.target.value)}>
            {TEST_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Date
          <input
            type="date"
            className={fieldClass()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <label className="text-sm">
        {noteLabel}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder={notePlaceholder}
          className="mt-1 w-full rounded-md bg-bg px-3 py-2 text-sm shadow-[var(--shadow-card)]"
        />
      </label>
    </div>
  );
}

export function FilmBoard() {
  const review = usePlan((s) => s.review);
  const addReview = usePlan((s) => s.addReview);
  const updateReview = usePlan((s) => s.updateReview);
  const removeReview = usePlan((s) => s.removeReview);
  const videos = useMemo(() => review.filter((item) => item.kind === "video"), [review]);
  const [showId, setShowId] = useState(recentShowId);
  const [test, setTest] = useState<string>("2B Super 5");
  const [date, setDate] = useState(format(TODAY, "yyyy-MM-dd"));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const saveVideo = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("video/") && !/\.(mp4|mov|m4v)$/i.test(file.name)) {
      setError("That file is not a video.");
      return;
    }
    if (file.size > 180 * 1024 * 1024) {
      setError("That clip is too big for this phone. Trim it in Photos first.");
      return;
    }
    setBusy(true);
    const id = `v-${Date.now()}`;
    try {
      await putMediaBlob(id, file);
      addReview({
        id,
        kind: "video",
        showId,
        date,
        test,
        note: note.trim(),
        mime: file.type || "video/mp4",
      });
      setNote("");
    } catch {
      setError("This phone would not store that clip. Trim it and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
          For the coach
        </p>
        <h2 className="font-display mt-1 text-xl font-medium">Competition videos</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Film the test, not the warm-up. Clips stay on this phone. Play one back before the next
          visit, or share it straight to your coach.
        </p>
        <MetaFields
          showId={showId}
          setShowId={setShowId}
          test={test}
          setTest={setTest}
          date={date}
          setDate={setDate}
          note={note}
          setNote={setNote}
          noteLabel="What should your coach look at?"
          notePlaceholder="Left canter depart, and whether the stretch circle actually stretched."
        />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <FileButton
            capture
            accept="video/*"
            disabled={busy}
            onFile={saveVideo}
            icon={<Video className="size-4" />}
          >
            Record a test
          </FileButton>
          <FileButton accept="video/*" disabled={busy} onFile={saveVideo} variant="outline">
            Choose a clip
          </FileButton>
        </div>
        {error && <p className="mt-3 text-sm text-warn">{error}</p>}
      </section>

      {videos.length === 0 ? (
        <p className="px-1 text-sm text-muted">
          No competition videos yet. The first Super 5 is the one worth keeping.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {videos.map((item) => (
            <VideoCard
              key={item.id}
              item={item}
              onNote={(note) => updateReview(item.id, { note })}
              onRemove={async () => {
                await deleteMediaBlob(item.id).catch(() => undefined);
                removeReview(item.id);
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
  icon,
  variant = "default",
  multiple,
  onFiles,
}: {
  accept: string;
  capture?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  onFile?: (file: File | undefined) => void;
  onFiles?: (files: File[]) => void;
  children: ReactNode;
  icon?: ReactNode;
  variant?: "default" | "outline";
}) {
  return (
    <label
      className={cn(
        buttonVariants({ variant }),
        "w-full",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      {icon}
      {children}
      <input
        type="file"
        accept={accept}
        capture={capture ? "environment" : undefined}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (onFiles) onFiles(files);
          else onFile?.(files[0]);
        }}
      />
    </label>
  );
}

function VideoCard({
  item,
  onNote,
  onRemove,
}: {
  item: ReviewItem;
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
    getMediaBlob(item.id)
      .then((blob) => {
        if (dead) return;
        if (!blob) {
          setError("This clip is no longer on the phone.");
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
      setError("This clip is no longer on the phone.");
      return;
    }
    const file = new File([blob], `samson-${item.test.replace(/\s+/g, "-")}.mp4`, {
      type: blob.type || item.mime || "video/mp4",
    });
    const text = clipBrief(item);
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
      try {
        await nav.share({ files: [file], title: "Samson test", text });
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
          {item.test} · {showName(item.showId)}
        </p>
        <p className="mt-0.5 text-xs text-faint">
          {item.date ? format(parseISO(item.date), "d MMM yyyy") : "No date"}
        </p>
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
              className="mt-1 w-full rounded-md bg-bg px-3 py-2 text-sm shadow-[var(--shadow-card)]"
            />
          </label>
          <div className="mt-3 flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={share}>
              <Share2 className="size-4" />
              {copied ? "Note copied" : "Share"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onRemove}
              aria-label="Delete video"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

function clipBrief(item: ReviewItem) {
  return `Jura Samson · ${item.test} · ${showName(item.showId)} · ${item.date}${
    item.note ? `\n${item.note}` : ""
  }`;
}

export function SheetBoard() {
  const review = usePlan((s) => s.review);
  const addReview = usePlan((s) => s.addReview);
  const removeReview = usePlan((s) => s.removeReview);
  const addScore = usePlan((s) => s.addScore);
  const sheets = useMemo(() => review.filter((item) => item.kind === "sheet"), [review]);
  const [showId, setShowId] = useState(recentShowId);
  const [test, setTest] = useState<string>("2B Super 5");
  const [date, setDate] = useState(format(TODAY, "yyyy-MM-dd"));
  const [note, setNote] = useState("");
  const [drafts, setDrafts] = useState<DraftPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [logged, setLogged] = useState(false);
  const draftsRef = useRef<DraftPhoto[]>([]);
  draftsRef.current = drafts;

  useEffect(() => {
    return () => draftsRef.current.forEach((d) => URL.revokeObjectURL(d.url));
  }, []);

  const addPhotos = async (files: File[]) => {
    if (files.length === 0) return;
    setError(null);
    setSavedId(null);
    setLogged(false);
    const room = MAX_SHEET_PHOTOS - draftsRef.current.length;
    if (room <= 0) {
      setError(`Up to ${MAX_SHEET_PHOTOS} photos per test. Remove one first.`);
      return;
    }
    const take = files.slice(0, room);
    setPreparing(true);
    const added: DraftPhoto[] = [];
    let failed: string | null = null;
    for (const file of take) {
      try {
        const next = await compressSheetPhoto(file);
        added.push({
          key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          ...next,
          url: URL.createObjectURL(next.blob),
          label: "",
        });
      } catch (err) {
        failed = err instanceof Error ? err.message : "Could not use that photo.";
      }
    }
    setDrafts((prev) => [...prev, ...added].slice(0, MAX_SHEET_PHOTOS));
    setPreparing(false);
    if (failed) setError(failed);
    else if (files.length > room)
      setError(`Only ${MAX_SHEET_PHOTOS} photos fit. The extra ones were left out.`);
  };

  const removeDraft = (key: string) => {
    setDrafts((prev) => {
      const gone = prev.find((d) => d.key === key);
      if (gone) URL.revokeObjectURL(gone.url);
      return prev.filter((d) => d.key !== key);
    });
  };

  const labelDraft = (key: string, label: string) =>
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, label } : d)));

  const readSheet = async () => {
    if (drafts.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const images = drafts.map((d) => ({
        imageBase64: d.dataUrl.slice(d.dataUrl.indexOf(",") + 1),
        mime: "image/jpeg",
        label: d.label || undefined,
      }));
      const result = await summariseSheet({
        data: {
          images,
          testHint: test,
          showName: showName(showId),
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const id = `s-${Date.now()}`;
      // First photo keeps the entry id so older code paths still find it.
      const photos = drafts.map((d, i) => ({
        id: i === 0 ? id : `${id}-${i + 1}`,
        label: d.label || undefined,
      }));
      for (let i = 0; i < drafts.length; i++) await putMediaBlob(photos[i].id, drafts[i].blob);
      const read = result.sheet;
      const testName = read.test && read.test !== "unknown" ? read.test : test;
      addReview({
        id,
        kind: "sheet",
        showId,
        date,
        test: testName,
        note: note.trim(),
        mime: "image/jpeg",
        sheet: read,
        photos,
      });
      setSavedId(id);
      drafts.forEach((d) => URL.revokeObjectURL(d.url));
      setDrafts([]);
      setNote("");
    } catch {
      setError("Could not read those sheets. Check the photos and try again.");
    } finally {
      setBusy(false);
    }
  };

  const saved = sheets.find((item) => item.id === savedId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
          Judge sheets
        </p>
        <h2 className="font-display mt-1 text-xl font-medium">Photograph the test</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Every page from every judge, up to {MAX_SHEET_PHOTOS} photos, flat and in the light. You
          get one read of the whole test and three schooling options. Pick one. Do not do all three.
        </p>
        <MetaFields
          showId={showId}
          setShowId={setShowId}
          test={test}
          setTest={setTest}
          date={date}
          setDate={setDate}
          note={note}
          setNote={setNote}
          noteLabel="Anything the photos will miss?"
          notePlaceholder="Optional. He felt downhill in the canter, or the judge spoke to you."
        />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <FileButton
            capture
            accept="image/*"
            disabled={busy || preparing || drafts.length >= MAX_SHEET_PHOTOS}
            onFiles={addPhotos}
            icon={<Camera className="size-4" />}
          >
            {drafts.length === 0 ? "Take a photo" : "Add another page"}
          </FileButton>
          <FileButton
            accept="image/*"
            multiple
            disabled={busy || preparing || drafts.length >= MAX_SHEET_PHOTOS}
            onFiles={addPhotos}
            variant="outline"
            icon={<ImagePlus className="size-4" />}
          >
            {drafts.length === 0 ? "Choose photos" : "Choose more"}
          </FileButton>
        </div>
        {(drafts.length > 0 || preparing) && (
          <div className="mt-3">
            <p className="text-xs text-muted">
              {drafts.length} of {MAX_SHEET_PHOTOS} pages{preparing ? " · preparing…" : ""}. Tag the
              judge if you know it.
            </p>
            <ul className="mt-2 grid grid-cols-3 gap-2">
              {drafts.map((d, i) => (
                <li key={d.key} className="relative">
                  <img
                    src={d.url}
                    alt={`Judge sheet page ${i + 1}`}
                    className="aspect-[3/4] w-full rounded-lg bg-bg object-cover shadow-[var(--shadow-card)]"
                  />
                  <span className="absolute top-1 left-1 rounded bg-fg/70 px-1.5 text-[11px] font-semibold text-bg tabular-nums">
                    {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDraft(d.key)}
                    disabled={busy}
                    aria-label={`Remove page ${i + 1}`}
                    className="absolute top-1 right-1 grid size-7 place-items-center rounded-full bg-fg/70 text-bg"
                  >
                    <X className="size-4" />
                  </button>
                  <select
                    aria-label={`Judge for page ${i + 1}`}
                    value={d.label}
                    disabled={busy}
                    onChange={(e) => labelDraft(d.key, e.target.value)}
                    className="mt-1 h-9 w-full rounded-md bg-bg px-1 text-xs shadow-[var(--shadow-card)]"
                  >
                    {JUDGE_LABELS.map((l) => (
                      <option key={l} value={l}>
                        {l ? `Judge ${l.startsWith("Judge") ? l.slice(6) : `at ${l}`}` : "Judge?"}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              className="mt-3 w-full"
              disabled={busy || preparing || drafts.length === 0}
              onClick={readSheet}
            >
              {busy
                ? drafts.length > 1
                  ? `Reading ${drafts.length} pages…`
                  : "Reading the sheet…"
                : drafts.length > 1
                  ? `Summarise this test (${drafts.length} pages)`
                  : "Summarise this test"}
            </Button>
          </div>
        )}
        {error && <p className="mt-3 text-sm text-warn">{error}</p>}
      </section>

      {saved?.sheet && (
        <SheetSummary
          item={saved}
          logged={logged}
          onLog={() => {
            if (!saved.sheet?.percent) return;
            addScore({
              showId: saved.showId,
              date: saved.date,
              test: saved.test,
              percent: saved.sheet.percent,
              place: saved.sheet.place ?? undefined,
              notes: saved.sheet.summary,
            });
            setLogged(true);
          }}
        />
      )}

      {sheets.filter((item) => item.id !== savedId).length > 0 && (
        <ul className="flex flex-col gap-3">
          {sheets
            .filter((item) => item.id !== savedId)
            .map((item) => (
              <SheetCard
                key={item.id}
                item={item}
                onRemove={async () => {
                  for (const photo of sheetPhotoIds(item))
                    await deleteMediaBlob(photo.id).catch(() => undefined);
                  removeReview(item.id);
                }}
              />
            ))}
        </ul>
      )}
    </div>
  );
}

function SheetSummary({
  item,
  logged,
  onLog,
  embedded,
}: {
  item: ReviewItem;
  logged?: boolean;
  onLog?: () => void;
  embedded?: boolean;
}) {
  const sheet = item.sheet;
  const [copied, setCopied] = useState(false);
  if (!sheet) return null;
  return (
    <section
      className={embedded ? "" : "rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5"}
    >
      <p className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
        {item.test} · {showName(item.showId)}
      </p>
      <h2 className="font-display mt-1 text-2xl font-medium tabular-nums">
        {sheet.percent != null ? `${sheet.percent.toFixed(1)}%` : "No percentage read"}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {item.date ? format(parseISO(item.date), "d MMM yyyy") : ""}
        {sheet.place ? ` · ${sheet.place}` : ""}
        {sheet.judge ? ` · ${sheet.judge}` : ""}
      </p>
      <p className="mt-3 text-sm leading-relaxed">{sheet.summary}</p>
      {item.note && <p className="mt-2 text-sm text-muted">{item.note}</p>}
      {sheet.caveat && <p className="mt-2 text-sm text-warn">{sheet.caveat}</p>}
      {sheet.judges && sheet.judges.length > 1 && (
        <ul className="mt-4 flex flex-col gap-2">
          {sheet.judges.map((j) => (
            <li key={j.position} className="rounded-lg bg-bg px-3 py-2 text-sm">
              <p className="font-semibold">
                {/^judge/i.test(j.position) ? j.position : `Judge at ${j.position}`}
                {j.name ? <span className="font-normal text-muted"> · {j.name}</span> : null}
                {j.percent != null ? (
                  <span className="ml-2 font-mono tabular-nums">{j.percent.toFixed(1)}%</span>
                ) : null}
              </p>
              {j.remarks.length > 0 && <p className="mt-0.5 text-muted">{j.remarks.join(" · ")}</p>}
            </li>
          ))}
        </ul>
      )}
      {sheet.agreement && (
        <p className="mt-3 text-sm text-muted">Judges agreed: {sheet.agreement}</p>
      )}
      {sheet.disagreement && (
        <p className="mt-2 text-sm text-muted">Judges differed: {sheet.disagreement}</p>
      )}
      {sheet.lowMarks.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {sheet.lowMarks.map((mark) => (
            <li
              key={`${mark.movement}-${mark.mark}`}
              className="rounded-lg bg-bg px-3 py-2 text-sm"
            >
              <p className="font-semibold">
                {mark.movement}
                {mark.mark ? (
                  <span className="ml-2 font-mono text-warn tabular-nums">{mark.mark}</span>
                ) : null}
              </p>
              {mark.comment && <p className="mt-0.5 text-muted">{mark.comment}</p>}
            </li>
          ))}
        </ul>
      )}
      {sheet.strengths.length > 0 && (
        <p className="mt-3 text-sm text-muted">Held up: {sheet.strengths.join(" · ")}</p>
      )}
      {sheet.collectives && (
        <p className="mt-2 text-sm text-muted">Collectives: {sheet.collectives}</p>
      )}
      <SheetPhotos item={item} />
      {sheet.workOns.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold">Work on one of these</p>
          <ol className="mt-2 flex flex-col gap-2">
            {sheet.workOns.map((work, i) => (
              <li key={work.title} className="rounded-lg bg-bg p-3">
                <p className="text-sm font-semibold">
                  Option {i + 1} · {work.title}
                </p>
                {work.why && <p className="mt-1 text-sm text-muted">{work.why}</p>}
                <p className="mt-1 text-sm leading-relaxed">{work.how}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className="mt-4 flex flex-col gap-2">
        {sheet.percent != null && onLog && (
          <Button
            type="button"
            variant={logged ? "secondary" : "default"}
            disabled={logged}
            onClick={onLog}
          >
            {logged ? (
              <>
                <Check className="size-4" /> On the log
              </>
            ) : (
              "Add this percentage to the log"
            )}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(sheetBrief(item, sheet)).catch(() => undefined);
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy summary for the coach"}
        </Button>
      </div>
    </section>
  );
}

function SheetPhotos({ item }: { item: ReviewItem }) {
  const [urls, setUrls] = useState<{ id: string; url: string; label?: string }[]>([]);
  const [big, setBig] = useState<string | null>(null);
  const key = sheetPhotoIds(item)
    .map((p) => p.id)
    .join("|");
  useEffect(() => {
    let dead = false;
    const made: string[] = [];
    Promise.all(
      sheetPhotoIds(item).map(async (p) => {
        const blob = await getMediaBlob(p.id).catch(() => undefined);
        if (!blob) return null;
        const url = URL.createObjectURL(blob);
        made.push(url);
        return { id: p.id, url, label: p.label };
      }),
    ).then((list) => {
      if (!dead)
        setUrls(list.filter((x): x is { id: string; url: string; label: string | undefined } => x != null));
    });
    return () => {
      dead = true;
      made.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (urls.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-xs text-muted">
        {urls.length === 1 ? "The sheet" : `${urls.length} pages`}
      </p>
      <ul className="mt-1 grid grid-cols-3 gap-2">
        {urls.map((p, i) => (
          <li key={p.id} className="relative">
            <button
              type="button"
              className="block w-full"
              onClick={() => setBig(big === p.url ? null : p.url)}
            >
              <img
                src={p.url}
                alt={`Judge sheet page ${i + 1}`}
                className="aspect-[3/4] w-full rounded-lg bg-bg object-cover shadow-[var(--shadow-card)]"
              />
            </button>
            {p.label && (
              <span className="absolute bottom-1 left-1 rounded bg-fg/70 px-1.5 text-[11px] font-semibold text-bg">
                {p.label}
              </span>
            )}
          </li>
        ))}
      </ul>
      {big && (
        <button type="button" className="mt-2 block w-full" onClick={() => setBig(null)}>
          <img src={big} alt="Judge sheet, full size" className="w-full rounded-lg" />
        </button>
      )}
    </div>
  );
}

function SheetCard({ item, onRemove }: { item: ReviewItem; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => setOpen((v) => !v)}
        >
          <p className="text-sm font-semibold">
            {item.test}
            {item.sheet?.percent != null ? ` · ${item.sheet.percent.toFixed(1)}%` : ""}
          </p>
          <p className="mt-0.5 text-xs text-faint">
            {item.date ? format(parseISO(item.date), "d MMM yyyy") : ""} · {showName(item.showId)}
          </p>
        </button>
        <button
          type="button"
          className="relative size-6 shrink-0 after:absolute after:inset-[-12px]"
          onClick={onRemove}
          aria-label="Delete sheet"
        >
          <Trash2 className="size-4 text-muted" />
        </button>
      </div>
      {open && item.sheet && <SheetSummary item={item} embedded />}
    </li>
  );
}

function sheetBrief(item: ReviewItem, sheet: SheetRead) {
  const lines = [
    `Jura Samson · ${item.test} · ${showName(item.showId)} · ${item.date}`,
    sheet.percent != null
      ? `${sheet.percent.toFixed(1)}%${sheet.place ? ` · ${sheet.place}` : ""}`
      : "",
    sheet.summary,
    ...(sheet.judges && sheet.judges.length > 1
      ? sheet.judges.map(
          (j) =>
            `${/^judge/i.test(j.position) ? j.position : `Judge at ${j.position}`}${j.percent != null ? ` ${j.percent.toFixed(1)}%` : ""}${j.remarks.length ? `: ${j.remarks.join("; ")}` : ""}`,
        )
      : []),
    sheet.disagreement ? `Judges differed: ${sheet.disagreement}` : "",
    item.note,
    ...sheet.workOns.map((work, i) => `Option ${i + 1}: ${work.title}. ${work.how}`),
  ];
  return lines.filter(Boolean).join("\n");
}
