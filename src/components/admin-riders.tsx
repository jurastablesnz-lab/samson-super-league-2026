import { useEffect, useState } from "react";
import type { AdminRider } from "@/lib/admin-riders";
import { CoachCueEditor, useCallerCues } from "@/components/coach-cues";
import { callerSheet } from "@/components/test-sheet";
import { listRiderFiles, mediaPlaybackUrl } from "@/lib/media";
import { prepareRider, setRiderHorseTest, type PreparedHorseInput } from "@/lib/rider-admin";
import { COMPETITION_LEVELS } from "@/lib/beta";
import { testsForLevel } from "@/lib/plan-builder";
import { cueRiderName, riderFirstName, spokenHorseName } from "@/lib/coach-cues";
import { testIdForName } from "@/lib/test-registry";
import { getPublishedTests } from "@/lib/test-publication";
import { isPublishedTest } from "@/lib/test-registry";
import { inputCls, Kicker, Panel, PrimaryButton, StatusBadge } from "./beta-ui";
import { cn } from "@/lib/utils";

function Problem({ text }: { text: string }) {
  return <li className="rounded-lg bg-orange/10 px-2 py-1 text-xs text-orange">{text}</li>;
}

export function RiderAdminPanels({
  riders,
  onPrepared,
}: {
  riders: AdminRider[] | null;
  onPrepared: () => void;
}) {
  const [published, setPublished] = useState<string[] | null>(null);
  useEffect(() => {
    getPublishedTests()
      .then((result) => setPublished(result.ids))
      .catch(() => setPublished([]));
  }, []);
  return (
    <>
      <AddRiderForm onPrepared={onPrepared} published={published ?? []} />
      <Panel className="mt-5">
        <Kicker>Riders</Kicker>
        <p className="mt-1 text-sm text-muted">
          Rider workspaces and result checks. Add or remove available tests on their horses below.
        </p>
        {!riders && <p className="mt-4 text-sm text-muted">Loading workspaces…</p>}
        {riders?.length === 0 && (
          <p className="mt-4 text-sm text-muted">No rider workspaces yet.</p>
        )}
        <div className="mt-4 space-y-3">
          {riders?.map((rider) => (
            <RiderRow
              key={rider.userId}
              rider={rider}
              published={published ?? []}
              onChanged={onPrepared}
            />
          ))}
        </div>
      </Panel>
    </>
  );
}

function RiderRow({
  rider,
  published,
  onChanged,
}: {
  rider: AdminRider;
  published: string[];
  onChanged: () => void;
}) {
  const waiting = rider.horses.reduce((n, h) => n + h.pendingEvo, 0);
  const nameOnly = rider.horses.flatMap((h) => h.tests.filter((t) => t.nameOnly)).length;
  const [open, setOpen] = useState(false);
  return (
    <details
      className="rounded-xl border border-line bg-bg"
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer list-none p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-ink-soft">
              {rider.name}
              {rider.prepared && (
                <span className="ml-2 rounded bg-violet/15 px-2 py-0.5 text-[10px] font-bold text-violet">
                  Waiting for Google sign-in
                </span>
              )}
            </p>
            <p className="text-xs text-muted">
              {rider.email} · {rider.applicationStatus} · {rider.horses.length} horse
              {rider.horses.length === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-xs text-faint">
              Last active / updated:{" "}
              {rider.lastActiveAt
                ? new Date(rider.lastActiveAt).toLocaleString("en-NZ", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "Not active yet"}
            </p>
          </div>
          <StatusBadge
            status={rider.applicationStatus === "invited" ? "pending" : rider.applicationStatus}
          />
        </div>
        {(waiting > 0 || nameOnly > 0) && (
          <p className="mt-2 text-xs text-orange">
            {waiting > 0 && `${waiting} pending EVO score${waiting === 1 ? "" : "s"}. `}
            {nameOnly > 0 && `${nameOnly} name-only test${nameOnly === 1 ? "" : "s"}.`}
          </p>
        )}
      </summary>
      <div className="space-y-2 border-t border-line p-3">
        {rider.horses.length === 0 && <p className="text-sm text-muted">No horses yet.</p>}
        {rider.horses.map((horse) => (
          <section key={horse.id} className="rounded-lg bg-surface p-3 text-sm">
            <p className="font-semibold">
              {horse.name}
              {horse.paddockName ? <span className="font-normal text-muted"> · {horse.paddockName}</span> : null}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {horse.esnzNumber ? `ESNZ ${horse.esnzNumber}` : "No ESNZ number"} ·{" "}
              {horse.level || "No level"} · {horse.phase}
            </p>
            <HorseTests horse={horse} published={published} onChanged={onChanged} />
            <HorseCoaching
              horseId={horse.id}
              level={horse.level}
              registeredName={horse.name}
              paddockName={horse.paddockName}
              riderName={rider.name}
              accountName={rider.accountName}
            />
            <p className="mt-2 text-xs text-muted">
              <span className="font-semibold">Target competitions:</span>{" "}
              {horse.shows.length ? horse.shows.map((s) => s.name).join(", ") : "None yet"}
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-5">
              <div>
                <dt className="text-faint">Kept EVO</dt>
                <dd>{horse.keptEvo}</dd>
              </div>
              <div>
                <dt className="text-faint">Pending</dt>
                <dd className={horse.pendingEvo ? "text-orange" : ""}>{horse.pendingEvo}</dd>
              </div>
              <div>
                <dt className="text-faint">Not mine</dt>
                <dd>{horse.rejectedEvo}</dd>
              </div>
              <div>
                <dt className="text-faint">Other scores</dt>
                <dd>{horse.otherScores}</dd>
              </div>
              <div>
                <dt className="text-faint">Best</dt>
                <dd>{horse.bestPercent == null ? "—" : `${horse.bestPercent.toFixed(1)}%`}</dd>
              </div>
            </dl>
            {horse.problems.length > 0 && (
              <ul className="mt-3 space-y-1">
                {horse.problems.map((problem) => (
                  <Problem key={problem} text={problem} />
                ))}
              </ul>
            )}
          </section>
        ))}
        {open && <RiderFiles userId={rider.userId} horses={rider.horses} />}
      </div>
    </details>
  );
}

function RiderFiles({
  userId,
  horses,
}: {
  userId: string;
  horses: AdminRider["horses"];
}) {
  const [files, setFiles] = useState<{ id: string; kind: string; fileName: string; horseId: string | null }[] | null>(
    null,
  );
  const [error, setError] = useState("");
  useEffect(() => {
    listRiderFiles({ data: { userId } })
      .then((result) => setFiles(result.files))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, [userId]);
  if (error) return <p className="text-xs text-danger">{error}</p>;
  if (!files) return <p className="text-xs text-muted">Loading files…</p>;
  if (files.length === 0) return <p className="text-xs text-muted">No videos, music or floor plans stored yet.</p>;
  const horseName = new Map(horses.map((horse) => [horse.id, horse.name]));
  return (
    <ul className="space-y-1 text-xs">
      {files.map((file) => (
        <li key={file.id} className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate">
            {file.kind === "video" ? "Video" : file.kind === "music" ? "Music" : "Floor plan"}
            {file.horseId && horseName.get(file.horseId) ? ` · ${horseName.get(file.horseId)}` : ""} · {file.fileName}
          </span>
          <button
            type="button"
            className="shrink-0 font-semibold text-accent"
            onClick={() => {
              void mediaPlaybackUrl({ data: { mediaId: file.id } })
                .then((result) => {
                  if (result.url) window.open(result.url, "_blank", "noopener,noreferrer");
                })
                .catch(() => setError("Could not open that file."));
            }}
          >
            Open
          </button>
        </li>
      ))}
    </ul>
  );
}

function HorseCoaching({
  horseId,
  level,
  registeredName,
  paddockName,
  riderName,
  accountName,
}: {
  horseId: string;
  level: string;
  registeredName: string;
  paddockName: string;
  riderName: string;
  accountName: string;
}) {
  const spoken = spokenHorseName(registeredName, paddockName);
  const first = cueRiderName({ profileName: riderName, accountName });
  const naming = {
    riderName: first,
    dropNames: riderFirstName(accountName) && riderFirstName(accountName) !== first ? [riderFirstName(accountName)] : [],
    spokenHorse: spoken,
    registeredName,
  };
  const choices = testsForLevel(level).filter((name) => callerSheet(name));
  const [name, setName] = useState(choices[0] ?? "");
  const [open, setOpen] = useState(false);
  const sheet = name ? callerSheet(name) : null;
  const briefs =
    sheet?.movements.map((movement) => ({
      n: movement.n,
      label: movement.steps.map((step) => [step.at, step.do].filter(Boolean).join(" ")).join(". "),
    })) ?? [];
  const session = useCallerCues(
    open && !!sheet,
    horseId,
    name ? testIdForName(name) : "",
    sheet?.title ?? "",
    briefs,
    naming,
  );
  if (!sheet || choices.length === 0) return null;
  return (
    <details className="mt-3" onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer text-xs font-semibold text-accent">Coaching cues</summary>
      <select className={`${inputCls} mt-2`} value={name} onChange={(event) => setName(event.target.value)}>
        {choices.map((choice) => (
          <option key={choice}>{choice}</option>
        ))}
      </select>
      {session.error && <p className="mt-2 text-xs text-danger">{session.error}</p>}
      <CoachCueEditor
        horseId={horseId}
        testId={testIdForName(name)}
        movements={briefs}
        cues={session.cues}
        onSaved={session.replace}
      />
    </details>
  );
}

function HorseTests({
  horse,
  published,
  onChanged,
}: {
  horse: AdminRider["horses"][number];
  published: string[];
  onChanged: () => void;
}) {
  const [newTest, setNewTest] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const assigned = new Set(horse.tests.map((t) => t.name));
  async function update(test: string, action: "add" | "remove") {
    setBusy(true);
    setError("");
    try {
      await setRiderHorseTest({ data: { horseId: horse.id, test, action } });
      setNewTest("");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  const choices = testsForLevel(horse.level).filter(
    (test) => !assigned.has(test) && isPublishedTest(test, published),
  );
  return (
    <div className="mt-2 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-semibold">Tests:</span>
        {horse.tests.map((t) => (
          <button
            key={t.name}
            type="button"
            className={cn(
              "rounded px-1.5 py-0.5 disabled:opacity-50",
              t.nameOnly ? "bg-orange/15 text-orange" : "bg-accent/15 text-accent",
            )}
            disabled={busy}
            title={`Remove ${t.name} from ${horse.name}`}
            aria-label={`Remove ${t.name} from ${horse.name}`}
            onClick={() => void update(t.name, "remove")}
          >
            {t.name} ×
          </button>
        ))}
        {!horse.tests.length && <span className="text-orange">No tests chosen</span>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          className={cn(inputCls, "h-9 w-auto text-xs")}
          aria-label={`Add a test for ${horse.name}`}
          value={newTest}
          onChange={(e) => setNewTest(e.target.value)}
          disabled={busy}
        >
          <option value="">Choose a test…</option>
          {choices.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <button
          type="button"
          className="font-semibold text-accent disabled:opacity-50"
          disabled={busy || !newTest}
          onClick={() => void update(newTest, "add")}
        >
          {busy ? "Updating…" : "+ Add test"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function AddRiderForm({ onPrepared, published }: { onPrepared: () => void; published: string[] }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [horses, setHorses] = useState<PreparedHorseInput[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await prepareRider({ data: { fullName, email, horses } });
      setMessage(
        `Workspace prepared for ${email.trim()}. Ask them to sign in with Continue with Google using this same address. No password is needed.`,
      );
      setFullName("");
      setEmail("");
      setHorses([]);
      onPrepared();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const update = (index: number, patch: Partial<PreparedHorseInput>) =>
    setHorses((all) => all.map((horse, i) => (i === index ? { ...horse, ...patch } : horse)));
  return (
    <Panel className="mt-5">
      <Kicker>Add a rider for them</Kicker>
      <p className="mt-1 text-sm text-muted">
        Prepare an approved workspace. They can only claim it by signing in with Google using the
        same verified email address.
      </p>
      <form onSubmit={(event) => void submit(event)} className="mt-3 space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-xs font-semibold">Rider full name</span>
            <input
              className={inputCls}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold">Google email address</span>
            <input
              className={inputCls}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold">Horses and first tests (optional)</p>
            {horses.length < 6 && (
              <button
                type="button"
                onClick={() =>
                  setHorses((all) => [...all, { name: "", paddockName: "", esnzNumber: "", level: "", tests: [] }])
                }
                className="text-xs font-semibold text-accent"
              >
                + Add horse
              </button>
            )}
          </div>
          {horses.map((horse, index) => (
            <div key={index} className="grid gap-2 rounded-lg bg-bg p-3 sm:grid-cols-2">
              <input
                aria-label="Registered name"
                className={inputCls}
                placeholder="Registered name"
                value={horse.name}
                onChange={(event) => update(index, { name: event.target.value })}
              />
              <input
                aria-label="Paddock name"
                className={inputCls}
                placeholder="Paddock name (optional)"
                value={horse.paddockName ?? ""}
                onChange={(event) => update(index, { paddockName: event.target.value })}
              />
              <input
                aria-label="ESNZ number"
                className={inputCls}
                placeholder="ESNZ number (optional)"
                value={horse.esnzNumber}
                onChange={(event) => update(index, { esnzNumber: event.target.value })}
              />
              <select
                aria-label="Horse level"
                className={inputCls}
                value={horse.level}
                onChange={(event) => update(index, { level: event.target.value, tests: [] })}
                required
              >
                <option value="">Choose a level…</option>
                {COMPETITION_LEVELS.map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </select>
              <label className="text-xs sm:col-span-2">
                Tests
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  {horse.level &&
                    testsForLevel(horse.level)
                      .filter((test) => isPublishedTest(test, published))
                      .map((test) => (
                      <label key={test} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={horse.tests.includes(test)}
                          onChange={(event) =>
                            update(index, {
                              tests: event.target.checked
                                ? [...horse.tests, test]
                                : horse.tests.filter((t) => t !== test),
                            })
                          }
                        />
                        {test}
                      </label>
                    ))}
                </div>
              </label>
              <button
                type="button"
                onClick={() => setHorses((all) => all.filter((_, i) => i !== index))}
                className="text-left text-xs font-semibold text-muted hover:text-danger sm:col-span-2"
              >
                Remove horse
              </button>
            </div>
          ))}
        </div>
        <PrimaryButton type="submit" disabled={busy}>
          {busy ? "Preparing…" : "Prepare rider workspace"}
        </PrimaryButton>
        {message && (
          <p role="status" className="rounded-lg bg-bg px-3 py-2 text-sm text-muted">
            {message}
          </p>
        )}
      </form>
    </Panel>
  );
}
