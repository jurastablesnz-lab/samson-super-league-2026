import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  acceptCoachLink,
  endCoachLink,
  getRiderCoaches,
  inviteCoach,
  updateCoachScopes,
} from "@/lib/coach-portal";
import {
  COACH_SCOPE_LABELS,
  defaultGuardian,
  emptyScopes,
  type CoachLinkSummary,
  type CoachScopes,
  type RiderCoachHome,
} from "@/lib/coach-portal-types";
import { inputCls, Kicker, PrimaryButton } from "./beta-ui";
import { GuardianFields, ScopePicker } from "./coach-share";

export function YourCoaches() {
  const [home, setHome] = useState<RiderCoachHome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    getRiderCoaches()
      .then((next) => {
        setHome(next);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);
  useEffect(load, [load]);

  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
      <Kicker>Coach Portal</Kicker>
      <h2 className="font-display mt-1 text-xl font-medium">Your coaches</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Invite the person who coaches you. They see only what you tick, and you can change or remove them at any time.
        This is separate from the arena caller.
      </p>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      {!home ? (
        <p className="mt-3 text-sm text-muted">Loading…</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {home.links.map((link) => (
            <LinkCard key={link.id} link={link} under18={home.under18} onChange={load} />
          ))}
          <InviteForm under18={home.under18} onDone={load} />
          <p className="text-xs text-faint">
            Coaching others?{" "}
            <Link to="/coach" search={{ pupil: "", settings: false }} className="font-semibold text-accent">
              Open the Coach Portal
            </Link>
          </p>
        </div>
      )}
    </section>
  );
}

function sharedLabels(scopes: CoachScopes) {
  const on = (Object.keys(scopes) as (keyof CoachScopes)[]).filter((id) => scopes[id]);
  return on.length ? on.map((id) => COACH_SCOPE_LABELS[id]).join(" · ") : "Nothing shared yet";
}

function LinkCard({
  link,
  under18,
  onChange,
}: {
  link: CoachLinkSummary;
  under18: boolean;
  onChange: () => void;
}) {
  const [scopes, setScopes] = useState(link.scopes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardian, setGuardian] = useState(defaultGuardian(under18 || link.under18));
  const waitingOnYou = link.status === "pending" && link.initiatedBy === "coach";

  async function run(task: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await task();
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-line p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{link.coachName}</p>
          <p className="text-xs text-muted">{link.coachEmail}</p>
        </div>
        <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
          {link.status === "active" ? "Connected" : "Waiting"}
        </span>
      </div>
      {link.status === "active" && <p className="mt-2 text-xs leading-relaxed text-muted">{sharedLabels(link.scopes)}</p>}
      {link.guardianConsented && (
        <p className="mt-2 text-xs text-accent">Parent or guardian agreement is on file{link.guardianName ? ` · ${link.guardianName}` : ""}.</p>
      )}
      {waitingOnYou && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-muted">They asked to connect. Choose what they can see, then accept.</p>
          <ScopePicker scopes={scopes} onChange={setScopes} />
          <GuardianFields value={guardian} onChange={setGuardian} />
        </div>
      )}
      {link.status === "active" && (
        <div className="mt-3">
          <ScopePicker scopes={scopes} onChange={setScopes} />
        </div>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {waitingOnYou && (
          <button
            type="button"
            disabled={busy}
            className="min-h-11 cursor-pointer rounded-lg bg-accent px-3 text-sm font-bold text-accent-fg disabled:opacity-60"
            onClick={() => void run(() => acceptCoachLink({ data: { linkId: link.id, scopes, ...guardian } }))}
          >
            Accept
          </button>
        )}
        {link.status === "active" && (
          <button
            type="button"
            disabled={busy}
            className="min-h-11 cursor-pointer rounded-lg border border-line px-3 text-sm font-semibold disabled:opacity-60"
            onClick={() => void run(() => updateCoachScopes({ data: { linkId: link.id, scopes } }))}
          >
            Save sharing
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          className="min-h-11 cursor-pointer rounded-lg px-3 text-sm font-semibold text-danger disabled:opacity-60"
          onClick={() => void run(() => endCoachLink({ data: { linkId: link.id } }))}
        >
          {link.status === "active" ? "Remove coach" : "Cancel"}
        </button>
      </div>
    </div>
  );
}

function InviteForm({ under18, onDone }: { under18: boolean; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [scopes, setScopes] = useState<CoachScopes>({ ...emptyScopes(), plan: true, visits: true, judges: true });
  const [guardian, setGuardian] = useState(defaultGuardian(under18));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await inviteCoach({ data: { email, scopes, ...guardian } });
      setEmail("");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-3 border-t border-line pt-4" onSubmit={(event) => void submit(event)}>
      <p className="text-sm font-semibold">Invite a coach</p>
      <input
        className={inputCls}
        type="email"
        required
        autoComplete="email"
        placeholder="Coach's email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <ScopePicker scopes={scopes} onChange={setScopes} />
      <GuardianFields value={guardian} onChange={setGuardian} />
      {error && <p className="text-sm text-danger">{error}</p>}
      <PrimaryButton type="submit" disabled={busy}>
        {busy ? "Sending…" : "Send invitation"}
      </PrimaryButton>
    </form>
  );
}
