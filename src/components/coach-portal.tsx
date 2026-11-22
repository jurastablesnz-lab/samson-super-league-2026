import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { REGIONS } from "@/lib/beta";
import {
  acceptCoachLink,
  applyForCoach,
  endCoachLink,
  getCoachHome,
  getPupil,
  requestPupil,
  saveCoachPackage,
  seedCoachDemo,
  setPupilHomework,
} from "@/lib/coach-portal";
import {
  subscriptionLabel,
  type CoachHome,
  type CoachOffering,
  type PupilHorseView,
  type PupilView,
} from "@/lib/coach-portal-types";
import { mediaPlaybackUrl, mediaStorage } from "@/lib/media";
import { iso, TODAY } from "@/lib/season";
import { useBetaAccess } from "@/lib/use-beta-access";
import { cn } from "@/lib/utils";
import { Field, inputCls, Kicker, Panel, PrimaryButton, Title } from "./beta-ui";
import { fmtDay } from "./setup-wizard";

export function CoachPortal({ pupilId, settings }: { pupilId: string; settings: boolean }) {
  const access = useBetaAccess();
  const [home, setHome] = useState<CoachHome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    getCoachHome()
      .then((next) => {
        setHome(next);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);
  useEffect(load, [load]);

  if (access.state === "loading" || (access.state === "ready" && !home && !error)) {
    return <div className="vd-glow min-h-dvh" />;
  }
  if (access.state === "signed_out") {
    return (
      <Shell>
        <Kicker>Coach Portal</Kicker>
        <Title>Sign in to coach</Title>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The Coach Portal is for the person who coaches a rider. It is separate from a rider's Coach tab.
        </p>
        <Link to="/login" className="mt-5 block rounded-lg bg-accent px-4 py-3 text-center font-display font-extrabold text-accent-fg">
          Sign in
        </Link>
      </Shell>
    );
  }
  if (access.state === "error" || error) {
    return (
      <Shell>
        <Title>Couldn’t open the Coach Portal</Title>
        <p className="mt-3 text-sm text-danger">{access.state === "error" ? access.message : error}</p>
      </Shell>
    );
  }
  if (!home?.profile) return <ApplyForm onDone={load} isAdmin={access.state === "ready" && access.access.isAdmin} />;
  if (home.profile.status !== "approved") {
    return <Pending status={home.profile.status} name={home.profile.displayName} />;
  }
  if (settings) return <PackageSettings home={home} onSaved={load} />;
  if (pupilId) return <PupilPage linkId={pupilId} />;
  return <PupilList home={home} isAdmin={access.state === "ready" && access.access.isAdmin} onChange={load} />;
}

function Shell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="vd-glow min-h-dvh text-fg">
      <div className={cn("mx-auto flex min-h-dvh flex-col px-4 pb-16 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6", wide ? "max-w-3xl" : "max-w-xl")}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/brand/vdnz-icon.svg" alt="" className="size-9 rounded-[10px] ring-1 ring-accent/30" />
            <span className="font-display text-[15px] font-extrabold">
              <span className="text-accent">X</span>Salute
            </span>
          </Link>
          <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-accent uppercase">
            Coach Portal
          </span>
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-xl bg-surface p-4 shadow-[var(--shadow-card)]", className)}>{children}</section>;
}

function ApplyForm({ onDone, isAdmin }: { onDone: () => void; isAdmin: boolean }) {
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [bio, setBio] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await applyForCoach({ data: { displayName, phone, region, bio, consent } });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <Kicker>Coach Portal</Kicker>
      <Title>Coach on XSalute</Title>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        A Coach Portal place lets a rider share their plan, scores, judges' work-ons, notes, visits and videos with you.
        You can set their next focus. Places are approved while the portal is in beta. The coach fee is NZ$50 a month,
        billed by you outside the app — or you can coach for free. XSalute does not take payment.
      </p>
      <form className="mt-5 space-y-3" onSubmit={(event) => void submit(event)}>
        <Field label="Name pupils should see">
          <input className={inputCls} value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
        </Field>
        <Field label="Phone" optional>
          <input className={inputCls} value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" />
        </Field>
        <Field label="Region">
          <select className={inputCls} value={region} onChange={(event) => setRegion(event.target.value)} required>
            <option value="">Choose…</option>
            {REGIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="What you coach" hint="A sentence or two is enough. You can describe packages after you're approved.">
          <textarea className={inputCls} rows={4} value={bio} onChange={(event) => setBio(event.target.value)} required />
        </Field>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 size-4" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          <span>
            I agree to the{" "}
            <Link to="/privacy" className="text-accent underline">
              privacy note
            </Link>
            . I'll only see what each rider chooses to share.
          </span>
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <PrimaryButton type="submit" disabled={busy}>
          {busy ? "Sending…" : "Apply for the Coach Portal"}
        </PrimaryButton>
        {isAdmin && (
          <button
            type="button"
            className="min-h-11 w-full cursor-pointer text-sm text-muted underline"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError(null);
              void seedCoachDemo()
                .then(() => onDone())
                .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
                .finally(() => setBusy(false));
            }}
          >
            Add a sample pupil
          </button>
        )}
      </form>
    </Shell>
  );
}

function Pending({ status, name }: { status: string; name: string }) {
  return (
    <Shell>
      <Kicker>Coach Portal</Kicker>
      <Title>{status === "declined" ? "Not this round" : "Thanks — we'll be in touch"}</Title>
      <Panel className="mt-5 space-y-2">
        <p className="text-sm text-ink-soft">
          {status === "declined"
            ? `${name}, we can't offer a Coach Portal place this time.`
            : `${name}, your Coach Portal application is waiting for approval. We'll email you when it's decided.`}
        </p>
        <Link to="/" className="inline-block text-sm font-semibold text-accent">
          Back to XSalute
        </Link>
      </Panel>
    </Shell>
  );
}

function PupilList({ home, isAdmin, onChange }: { home: CoachHome; isAdmin: boolean; onChange: () => void }) {
  const navigate = useNavigate();
  const profile = home.profile!;
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function request(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestPupil({ data: { email } });
      setEmail("");
      setNotice("Request sent. They'll need to accept before you can see anything.");
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function accept(linkId: string) {
    setError(null);
    try {
      await acceptCoachLink({ data: { linkId } });
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function seed() {
    setBusy(true);
    setError(null);
    try {
      const result = await seedCoachDemo();
      setNotice(`Sample pupil ${result.pupilName} is ready.`);
      onChange();
      void navigate({ to: "/coach", search: { pupil: result.linkId, settings: false } });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="flex items-end justify-between gap-3">
        <div>
          <Kicker>Coach Portal</Kicker>
          <h1 className="font-display mt-1 text-3xl font-extrabold tracking-[-0.03em]">Pupils</h1>
        </div>
        <button
          type="button"
          className="min-h-11 cursor-pointer text-sm font-semibold text-accent"
          onClick={() => void navigate({ to: "/coach", search: { pupil: "", settings: true } })}
        >
          Packages
        </button>
      </div>
      <p className="mt-2 text-sm text-muted">
        {profile.activePupils} of {profile.pupilCap} pupils
        {profile.acceptingPupils ? "" : " · not taking new pupils"}
      </p>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      {notice && <p className="mt-3 text-sm text-accent">{notice}</p>}

      {home.incoming.length > 0 && (
        <div className="mt-4 space-y-2">
          <Kicker>Invitations</Kicker>
          {home.incoming.map((link) => (
            <Card key={link.id}>
              <p className="font-semibold">{link.riderName}</p>
              <p className="mt-1 text-sm text-muted">Invited you. Accept to see what they shared.</p>
              <div className="mt-3 flex gap-2">
                <button type="button" className="min-h-11 flex-1 cursor-pointer rounded-lg bg-accent font-bold text-accent-fg" onClick={() => void accept(link.id)}>
                  Accept
                </button>
                <button type="button" className="min-h-11 cursor-pointer rounded-lg border border-line px-3 text-sm" onClick={() => void endCoachLink({ data: { linkId: link.id } }).then(onChange)}>
                  Decline
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ul className="mt-4 flex flex-col gap-3">
        {home.pupils.map((pupil) => (
          <li key={pupil.linkId}>
            <button
              type="button"
              className="w-full cursor-pointer rounded-xl bg-surface p-4 text-left shadow-[var(--shadow-card)]"
              onClick={() => void navigate({ to: "/coach", search: { pupil: pupil.linkId, settings: false } })}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-display text-xl font-medium">{pupil.name}</p>
                <span className="text-accent" aria-hidden>
                  →
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {pupil.horses.map((horse) => `${horse.name}${horse.level ? ` · ${horse.level}` : ""}`).join(", ") || "No horse yet"}
              </p>
              <p className="mt-2 text-sm leading-snug">{pupil.statusLine}</p>
            </button>
          </li>
        ))}
      </ul>
      {home.pupils.length === 0 && home.incoming.length === 0 && (
        <p className="mt-4 text-sm text-muted">No pupils yet. Ask a rider to invite you, or request them by email.</p>
      )}

      <form className="mt-5 space-y-2" onSubmit={(event) => void request(event)}>
        <Kicker>Request a pupil</Kicker>
        <input className={inputCls} type="email" required placeholder="Rider's email" value={email} onChange={(event) => setEmail(event.target.value)} />
        {home.outgoing.length > 0 && (
          <p className="text-xs text-muted">Waiting on {home.outgoing.map((link) => link.riderName || link.riderEmail).join(", ")}</p>
        )}
        <PrimaryButton type="submit" disabled={busy || !profile.acceptingPupils}>
          {busy ? "Sending…" : "Send request"}
        </PrimaryButton>
      </form>
      {isAdmin && (
        <button type="button" className="mt-4 min-h-11 w-full cursor-pointer text-sm text-muted underline" disabled={busy} onClick={() => void seed()}>
          Add a sample pupil
        </button>
      )}
    </Shell>
  );
}

function PupilPage({ linkId }: { linkId: string }) {
  const navigate = useNavigate();
  const [pupil, setPupil] = useState<PupilView | null>(null);
  const [horseId, setHorseId] = useState("");
  const [cloud, setCloud] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let dead = false;
    getPupil({ data: { linkId } })
      .then((next) => {
        if (dead) return;
        setPupil(next);
        setHorseId((current) => current || next.horses[0]?.id || "");
      })
      .catch((err: unknown) => {
        if (!dead) setError(err instanceof Error ? err.message : String(err));
      });
    mediaStorage()
      .then((storage) => !dead && setCloud(storage.cloud))
      .catch(() => undefined);
    return () => {
      dead = true;
    };
  }, [linkId]);

  const horse = pupil?.horses.find((item) => item.id === horseId) ?? pupil?.horses[0];
  return (
    <Shell>
      <button type="button" className="min-h-11 cursor-pointer text-sm font-semibold text-accent" onClick={() => void navigate({ to: "/coach", search: { pupil: "", settings: false } })}>
        ← Pupils
      </button>
      {!pupil && !error && <p className="mt-4 text-sm text-muted">Loading…</p>}
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {pupil && (
        <>
          <h1 className="font-display mt-2 text-3xl font-extrabold tracking-[-0.03em]">{pupil.pupilName}</h1>
          <p className="mt-1 text-sm text-muted">{pupil.pupilEmail}</p>
          {pupil.guardianConsent && <p className="mt-2 text-xs font-semibold text-accent">Parent or guardian agreement is on file.</p>}
          {pupil.horses.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {pupil.horses.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn("min-h-11 shrink-0 cursor-pointer rounded-full border px-3 text-sm font-semibold", item.id === horse?.id ? "border-accent bg-accent/15 text-accent" : "border-line text-muted")}
                  onClick={() => setHorseId(item.id)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}
          {horse ? (
            <HorseDetail horse={horse} linkId={pupil.linkId} cloud={cloud} onSaved={setPupil} />
          ) : (
            <p className="mt-4 text-sm text-muted">No horse on this rider's plan yet.</p>
          )}
        </>
      )}
    </Shell>
  );
}

function HorseDetail({
  horse,
  linkId,
  cloud,
  onSaved,
}: {
  horse: PupilHorseView;
  linkId: string;
  cloud: boolean;
  onSaved: (pupil: PupilView) => void;
}) {
  return (
    <div className="mt-4 flex flex-col gap-3">
      <HomeworkForm horse={horse} linkId={linkId} onSaved={onSaved} />
      <Block title="Plan">
        {horse.plan == null ? (
          <Private label="Season plan" />
        ) : (
          <>
            <p className="font-display text-xl font-medium">{horse.plan.phase}</p>
            {(horse.plan.start || horse.plan.end) && (
              <p className="mt-1 text-xs text-muted">
                {fmtDay(horse.plan.start)} – {fmtDay(horse.plan.end)}
              </p>
            )}
            {horse.plan.intent && <p className="mt-2 text-sm text-muted">{horse.plan.intent}</p>}
            <p className="mt-2 text-sm font-semibold">
              {horse.plan.ticked} session{horse.plan.ticked === 1 ? "" : "s"} ticked
            </p>
          </>
        )}
      </Block>
      <Block title="Recent visits">
        {horse.visits == null ? (
          <Private label="Coach visits" />
        ) : horse.visits.length === 0 ? (
          <p className="text-sm text-muted">No visits shared.</p>
        ) : (
          <ul className="space-y-3">
            {horse.visits.map((visit) => (
              <li key={visit.id}>
                <p className="text-xs font-semibold text-muted">{fmtDay(visit.date)}{visit.authorName ? ` · ${visit.authorName}` : ""}</p>
                {visit.focus && <p className="mt-1 text-sm">{visit.focus}</p>}
                {visit.homework && <p className="mt-1 whitespace-pre-line text-sm text-muted">{visit.homework}</p>}
              </li>
            ))}
          </ul>
        )}
      </Block>
      <Block title="Judges' work-ons">
        {horse.workOns == null ? (
          <Private label="Judges' work-ons" />
        ) : horse.workOns.items.length === 0 ? (
          <p className="text-sm text-muted">No judges' work-ons yet.</p>
        ) : (
          <>
            <p className="text-xs text-muted">
              {horse.workOns.test} · {horse.workOns.showName} · {fmtDay(horse.workOns.date)}
            </p>
            <ul className="mt-2 space-y-2">
              {horse.workOns.items.map((item) => (
                <li key={item.title}>
                  <p className="text-sm font-semibold">{item.title}</p>
                  {item.how && <p className="text-sm text-muted">{item.how}</p>}
                </li>
              ))}
            </ul>
          </>
        )}
      </Block>
      <Block title="Ride notes">
        {horse.notes == null ? (
          <Private label="Ride notes" />
        ) : horse.notes.length === 0 ? (
          <p className="text-sm text-muted">No notes yet.</p>
        ) : (
          <ul className="space-y-2">
            {horse.notes.map((note) => (
              <li key={`${note.date}-${note.text.slice(0, 24)}`}>
                <p className="text-xs text-muted">{fmtDay(note.date)}</p>
                <p className="whitespace-pre-line text-sm">{note.text}</p>
              </li>
            ))}
          </ul>
        )}
      </Block>
      <Block title="Recent scores">
        {horse.scores == null ? (
          <Private label="Scores" />
        ) : horse.scores.length === 0 ? (
          <p className="text-sm text-muted">No scores yet.</p>
        ) : (
          <ul className="space-y-2">
            {horse.scores.map((score) => (
              <li key={`${score.date}-${score.test}`} className="flex items-baseline justify-between gap-3 text-sm">
                <span>
                  {score.test || "Test"} · {score.showName || fmtDay(score.date)}
                </span>
                <span className="font-semibold text-good">{score.percent == null ? "—" : `${score.percent.toFixed(1)}%`}</span>
              </li>
            ))}
          </ul>
        )}
      </Block>
      <Block title="Videos">
        {horse.videos == null ? (
          <Private label="Videos" />
        ) : (
          <>
            {!cloud && <p className="mb-2 text-sm text-muted">Cloud storage is off, so clips stay on the pupil's phone until it is on.</p>}
            {horse.videos.length === 0 ? (
              <p className="text-sm text-muted">No videos logged.</p>
            ) : (
              <ul className="space-y-3">
                {horse.videos.map((video) => (
                  <li key={video.id}>
                    <p className="text-sm font-semibold">
                      {video.test || "Test"} · {fmtDay(video.date)}
                    </p>
                    {video.note && <p className="text-sm text-muted">{video.note}</p>}
                    {cloud && video.ready ? <PlayVideo id={video.id} /> : <p className="text-xs text-faint">Not in cloud storage yet.</p>}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Block>
    </div>
  );
}

function Private({ label }: { label: string }) {
  return <p className="text-sm text-muted">{label} not shared.</p>;
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <Kicker>{title}</Kicker>
      <div className="mt-2">{children}</div>
    </Card>
  );
}

function HomeworkForm({
  horse,
  linkId,
  onSaved,
}: {
  horse: PupilHorseView;
  linkId: string;
  onSaved: (pupil: PupilView) => void;
}) {
  const current = horse.focus;
  const todayIso = iso(TODAY);
  const [date, setDate] = useState(current?.date && current.date >= todayIso ? current.date : todayIso);
  const [focus, setFocus] = useState(current?.focus ?? "");
  const [homework, setHomework] = useState(current?.homework ?? "");
  const [film, setFilm] = useState(current?.film ?? "");
  const [leaveIt, setLeaveIt] = useState(current?.leaveIt ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDate(current?.date && current.date >= todayIso ? current.date : todayIso);
    setFocus(current?.focus ?? "");
    setHomework(current?.homework ?? "");
    setFilm(current?.film ?? "");
    setLeaveIt(current?.leaveIt ?? "");
  }, [horse.id, current?.id, current?.date, current?.focus, current?.homework, current?.film, current?.leaveIt, todayIso]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSaved(
        await setPupilHomework({
          data: {
            linkId,
            horseId: horse.id,
            visit: { id: current?.editable ? current.id : undefined, date, focus, homework, film, leaveIt },
          },
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Kicker>{horse.name}{horse.level ? ` · ${horse.level}` : ""}</Kicker>
      <h2 className="font-display mt-1 text-xl font-medium">Next focus</h2>
      {current && (
        <p className="mt-2 text-sm text-muted">
          Current: {current.focus || current.homework || "Nothing set"}
          {current.authorName ? ` · set by ${current.authorName}` : ""}
        </p>
      )}
      <form className="mt-3 space-y-2" onSubmit={(event) => void save(event)}>
        <input className={inputCls} type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        <textarea className={inputCls} rows={2} placeholder="Focus" value={focus} onChange={(event) => setFocus(event.target.value)} />
        <textarea className={inputCls} rows={3} placeholder="Homework" value={homework} onChange={(event) => setHomework(event.target.value)} />
        <input className={inputCls} placeholder="What to film (optional)" value={film} onChange={(event) => setFilm(event.target.value)} />
        <input className={inputCls} placeholder="Leave it (optional)" value={leaveIt} onChange={(event) => setLeaveIt(event.target.value)} />
        {error && <p className="text-sm text-danger">{error}</p>}
        <PrimaryButton type="submit" disabled={busy}>
          {busy ? "Saving…" : current?.editable ? "Update focus" : "Set focus for the pupil"}
        </PrimaryButton>
      </form>
    </Card>
  );
}

function PlayVideo({ id }: { id: string }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-1">
      <button
        type="button"
        className="min-h-11 cursor-pointer text-sm font-semibold text-accent"
        onClick={() => {
          setError(null);
          void mediaPlaybackUrl({ data: { mediaId: id } })
            .then((result) => {
              if (result.url) window.open(result.url, "_blank", "noopener");
              else setError("That clip isn't ready to play.");
            })
            .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
        }}
      >
        Play clip
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

function PackageSettings({ home, onSaved }: { home: CoachHome; onSaved: () => void }) {
  const navigate = useNavigate();
  const profile = home.profile!;
  const [offerings, setOfferings] = useState<CoachOffering[]>(profile.offerings);
  const [cap, setCap] = useState(String(profile.pupilCap));
  const [accepting, setAccepting] = useState(profile.acceptingPupils);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function add(kind: CoachOffering["kind"], label: string) {
    setOfferings((current) => [
      ...current,
      { id: crypto.randomUUID(), kind, label, detail: "", perMonth: kind === "ride_reviews" ? 4 : null },
    ]);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await saveCoachPackage({ data: { offerings, pupilCap: Number(cap), acceptingPupils: accepting, displayName: profile.displayName, bio: profile.bio } });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <button type="button" className="min-h-11 cursor-pointer text-sm font-semibold text-accent" onClick={() => void navigate({ to: "/coach", search: { pupil: "", settings: false } })}>
        ← Pupils
      </button>
      <Kicker>Coach Portal</Kicker>
      <h1 className="font-display mt-1 text-3xl font-extrabold tracking-[-0.03em]">Packages</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Describe what you offer. This is display only. The coach fee is a flat NZ$50 a month. You bill your pupils
        yourself, or you coach them for free. XSalute does not take payment.
      </p>
      <Card className="mt-4">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Subscription</p>
        <p className="mt-1 text-sm font-semibold">{subscriptionLabel(profile.subscriptionStatus)}</p>
        <p className="mt-1 text-xs text-faint">A place is reserved here for a coach subscription later. Nothing is charged in the app.</p>
      </Card>
      <form className="mt-4 space-y-3" onSubmit={(event) => void save(event)}>
        <ul className="space-y-3">
          {offerings.map((offer, index) => (
            <li key={offer.id} className="rounded-xl bg-surface p-3">
              <input
                className={inputCls}
                value={offer.label}
                onChange={(event) => setOfferings(offerings.map((item, i) => (i === index ? { ...item, label: event.target.value } : item)))}
              />
              <input
                className={`${inputCls} mt-2`}
                placeholder="Detail"
                value={offer.detail}
                onChange={(event) => setOfferings(offerings.map((item, i) => (i === index ? { ...item, detail: event.target.value } : item)))}
              />
              {offer.kind === "ride_reviews" && (
                <label className="mt-2 block text-xs text-muted">
                  Reviews a month
                  <input
                    className={`${inputCls} mt-1`}
                    inputMode="numeric"
                    value={offer.perMonth ?? ""}
                    onChange={(event) =>
                      setOfferings(offerings.map((item, i) => (i === index ? { ...item, perMonth: Number(event.target.value) || null } : item)))
                    }
                  />
                </label>
              )}
              <button type="button" className="mt-2 min-h-11 cursor-pointer text-sm text-danger" onClick={() => setOfferings(offerings.filter((_, i) => i !== index))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="min-h-11 cursor-pointer rounded-lg border border-line px-3 text-sm" onClick={() => add("weekly_check_in", "Weekly check-in")}>
            Weekly check-in
          </button>
          <button type="button" className="min-h-11 cursor-pointer rounded-lg border border-line px-3 text-sm" onClick={() => add("ride_reviews", "Ride reviews")}>
            Ride reviews
          </button>
          <button type="button" className="min-h-11 cursor-pointer rounded-lg border border-line px-3 text-sm" onClick={() => add("other", "Other")}>
            Other
          </button>
        </div>
        <Field label="Pupil cap">
          <input className={inputCls} inputMode="numeric" value={cap} onChange={(event) => setCap(event.target.value)} />
        </Field>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" className="size-4" checked={accepting} onChange={(event) => setAccepting(event.target.checked)} />
          Accepting new pupils
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        {saved && <p className="text-sm text-accent">Saved. Pupils see this only as a description — nothing is billed here.</p>}
        <PrimaryButton type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save packages"}
        </PrimaryButton>
      </form>
    </Shell>
  );
}
