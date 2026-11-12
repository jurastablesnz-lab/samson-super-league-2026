import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { floorPlanKind, type FloorPlanRef } from "@/lib/plan-builder";
import { openMedia, PENDING_UPLOAD, removeAccountMedia, saveAccountMedia } from "@/lib/media-upload";

const MAX_BYTES = 12 * 1024 * 1024;

/** Save a PDF or photo on this phone, then copy it to the rider's account when R2 is on. */
export async function storeFloorPlanFile(
  file: File,
  horseId?: string,
  onProgress?: (ratio: number) => void,
): Promise<FloorPlanRef & { pendingCloud: boolean }> {
  const kind = floorPlanKind(file);
  if (!kind) throw new Error("Choose a PDF or a photo of the floor plan.");
  if (file.size > MAX_BYTES) throw new Error("Keep the floor plan under 12 MB.");
  const mediaId = `floorplan-${globalThis.crypto.randomUUID()}`;
  const saved = await saveAccountMedia({
    id: mediaId,
    kind: "floorplan",
    file,
    fileName: file.name,
    mime: file.type || (kind === "pdf" ? "application/pdf" : "image/jpeg"),
    horseId,
    onProgress,
  });
  return {
    mediaId,
    fileName: file.name,
    mime: file.type || (kind === "pdf" ? "application/pdf" : "image/jpeg"),
    size: file.size,
    storedOn: saved.where === "cloud" ? "cloud" : "device",
    uploadedAt: new Date().toISOString(),
    pendingCloud: saved.pendingCloud,
  };
}

export async function discardFloorPlan(plan: FloorPlanRef | null | undefined) {
  if (plan?.mediaId) await removeAccountMedia(plan.mediaId);
}

export function FloorPlanView({ plan }: { plan: FloorPlanRef }) {
  const [url, setUrl] = useState<string | null>(null);
  const [source, setSource] = useState<"device" | "cloud">("device");
  const [missing, setMissing] = useState(false);
  const pdf = plan.mime === "application/pdf" || /\.pdf$/i.test(plan.fileName);
  useEffect(() => {
    let dead = false;
    let revoke = () => {};
    setUrl(null);
    setMissing(false);
    void openMedia(plan.mediaId)
      .then((opened) => {
        if (dead) {
          opened?.revoke();
          return;
        }
        if (!opened) return setMissing(true);
        revoke = opened.revoke;
        setSource(opened.source);
        setUrl(opened.url);
      })
      .catch(() => {
        if (!dead) setMissing(true);
      });
    return () => {
      dead = true;
      revoke();
    };
  }, [plan.mediaId]);
  return (
    <div>
      <p className="text-sm font-semibold">{plan.fileName}</p>
      <p className="text-xs text-muted">
        {(plan.size / 1024 / 1024).toFixed(1)} MB · {source === "cloud" ? "on your account" : "on this phone"}
      </p>
      {missing && (
        <p className="mt-2 text-sm text-muted">
          The file is on the device you added it from. Attach it again here to open it.
        </p>
      )}
      {url && pdf && (
        <>
          <iframe
            title={plan.fileName}
            src={url}
            className="mt-3 h-80 w-full rounded-lg border border-line bg-bg"
          />
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-accent"
          >
            Open the floor plan
          </a>
        </>
      )}
      {url && !pdf && (
        <img
          src={url}
          alt={plan.fileName}
          className="mt-3 max-h-96 w-full rounded-lg object-contain"
        />
      )}
    </div>
  );
}

export function FloorPlanPicker({
  plan,
  onChange,
  disabled,
  horseId,
}: {
  plan: FloorPlanRef | null;
  onChange: (next: FloorPlanRef | null) => void | Promise<void>;
  disabled?: boolean;
  horseId?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function upload(file: File) {
    setErr(null);
    setNotice(null);
    setBusy(true);
    setProgress(0);
    try {
      const next = await storeFloorPlanFile(file, horseId, setProgress);
      if (next.pendingCloud) setNotice(PENDING_UPLOAD);
      try {
        await onChange(next);
      } catch (e) {
        await discardFloorPlan(next);
        throw e;
      }
      if (plan && plan.mediaId !== next.mediaId) await discardFloorPlan(plan);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <FileText className="size-4 text-accent" />
        <p className="text-sm font-semibold">Freestyle floor plan</p>
      </div>
      <p className="text-xs text-muted">
        Attach a PDF or a photo. It stays on this phone until it is copied to your account, the same way freestyle music does.
      </p>
      {plan && <FloorPlanView plan={plan} />}
      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-lg border border-dashed border-line px-3 py-2 text-sm font-semibold text-ink-soft">
          {busy ? (progress == null ? "Saving…" : `Uploading ${Math.round(progress * 100)}%`) : plan ? "Replace file" : "Choose a PDF or photo"}
          <input
            type="file"
            accept="application/pdf,image/*,.pdf,.png,.jpg,.jpeg,.webp,.gif,.heic"
            className="sr-only"
            disabled={disabled || busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
        </label>
        {plan && (
          <button
            type="button"
            disabled={disabled || busy}
            className="cursor-pointer text-xs font-semibold text-muted hover:text-danger disabled:opacity-50"
            onClick={() => {
              void (async () => {
                setBusy(true);
                setErr(null);
                try {
                  await onChange(null);
                  await discardFloorPlan(plan);
                } catch (e) {
                  setErr(e instanceof Error ? e.message : String(e));
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            Remove
          </button>
        )}
      </div>
      {notice && <p className="text-xs text-muted">{notice}</p>}
      {err && <p className="text-xs text-danger">{err}</p>}
    </div>
  );
}
