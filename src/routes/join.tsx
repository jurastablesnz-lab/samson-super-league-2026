import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth/client";
import {
  COMPETITION_LEVELS,
  HEARD_FROM,
  REGIONS,
  RIDER_GRADES,
  submitApplication,
  type ApplicationInput,
} from "@/lib/beta";
import { useBetaAccess } from "@/lib/use-beta-access";
import {
  BrandShell,
  Field,
  inputCls,
  Kicker,
  Panel,
  PrimaryButton,
  PrivacyNote,
  Title,
} from "@/components/beta-ui";
import { StatusView } from "@/components/beta-status";

export const Route = createFileRoute("/join")({ component: JoinPage });

const EMPTY: ApplicationInput = {
  fullName: "",
  phone: "",
  region: "",
  riderGrade: "",
  competitionLevel: "",
  horses: "",
  esnzMember: false,
  coach: "",
  goals: "",
  heardFrom: "",
  consent: false,
};

function JoinPage() {
  const access = useBetaAccess();
  const [done, setDone] = useState(false);

  if (access.state === "loading") return <BrandShell>{null}</BrandShell>;
  if (done || (access.state === "ready" && (access.access.application || access.access.hasAccess))) {
    return <StatusView access={access.state === "ready" ? access.access : null} justApplied={done} />;
  }
  return (
    <BrandShell>
      <Kicker>Founding rider beta · 2026 season</Kicker>
      <Title>Apply to join the XSalute beta</Title>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        XSalute helps you plan, train, compete and reflect across your dressage season. We’re opening a small number of
        free beta places to committed riders who’ll use it and tell us what works. Create your account, tell us about you
        and your horse, and we’ll be in touch.
      </p>
      <ApplicationForm signedIn={access.state === "ready"} defaultName={access.state === "ready" ? access.access.name ?? "" : ""} onDone={() => { setDone(true); access.reload(); }} />
    </BrandShell>
  );
}

function ApplicationForm({
  signedIn,
  defaultName,
  onDone,
}: {
  signedIn: boolean;
  defaultName: string;
  onDone: () => void;
}) {
  const [form, setForm] = useState<ApplicationInput>({ ...EMPTY, fullName: defaultName });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof ApplicationInput>(k: K, v: ApplicationInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.consent) return setError("Please accept the privacy note and beta terms.");
    setBusy(true);
    try {
      if (!signedIn) {
        if (password.length < 8) throw new Error("Password must be at least 8 characters.");
        const res = await authClient.signUp.email({ name: form.fullName, email: email.trim(), password });
        if (res.error) {
          throw new Error(
            res.error.code === "USER_ALREADY_EXISTS" || res.error.status === 422
              ? "That email already has an account — sign in instead."
              : res.error.message ?? "Couldn’t create your account.",
          );
        }
      }
      await submitApplication({ data: form });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      {!signedIn && (
        <Panel className="space-y-3">
          <Kicker>1 · Your account</Kicker>
          <Field label="Email">
            <input className={inputCls} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" hint="At least 8 characters.">
            <input className={inputCls} type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <p className="text-xs text-muted">
            Already applied?{" "}
            <Link to="/login" className="font-semibold text-accent underline-offset-2 hover:underline">Sign in</Link>
          </p>
        </Panel>
      )}

      <Panel className="space-y-3">
        <Kicker>{signedIn ? "About you" : "2 · About you"}</Kicker>
        <Field label="Full name">
          <input className={inputCls} required autoComplete="name" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
        </Field>
        <Field label="Phone" optional>
          <input className={inputCls} type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Region">
          <select className={inputCls} required value={form.region} onChange={(e) => set("region", e.target.value)}>
            <option value="">Choose…</option>
            {REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Rider grade" group>
          <div className="grid grid-cols-2 gap-2">
            {RIDER_GRADES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => set("riderGrade", g)}
                className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold ${form.riderGrade === g ? "border-accent bg-accent/15 text-accent" : "border-line bg-sunken text-ink-soft"}`}
              >
                {g}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Current competition level">
          <select className={inputCls} required value={form.competitionLevel} onChange={(e) => set("competitionLevel", e.target.value)}>
            <option value="">Choose…</option>
            {COMPETITION_LEVELS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="ESNZ member?" group>
          <div className="grid grid-cols-2 gap-2">
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => set("esnzMember", v)}
                className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold ${form.esnzMember === v ? "border-accent bg-accent/15 text-accent" : "border-line bg-sunken text-ink-soft"}`}
              >
                {v ? "Yes" : "No"}
              </button>
            ))}
          </div>
        </Field>
      </Panel>

      <Panel className="space-y-3">
        <Kicker>{signedIn ? "Your horse & season" : "3 · Your horse & season"}</Kicker>
        <Field label="Horse name(s) and level" hint="e.g. “Samson — Level 2, schooling Level 3”">
          <textarea className={inputCls} rows={2} required value={form.horses} onChange={(e) => set("horses", e.target.value)} />
        </Field>
        <Field label="Coach" optional>
          <input className={inputCls} value={form.coach} onChange={(e) => set("coach", e.target.value)} placeholder="Your coach’s name" />
        </Field>
        <Field label="Your goals this season">
          <textarea className={inputCls} rows={3} required value={form.goals} onChange={(e) => set("goals", e.target.value)} placeholder="Shows, scores, levels, qualifications…" />
        </Field>
        <Field label="How did you hear about XSalute?">
          <select className={inputCls} required value={form.heardFrom} onChange={(e) => set("heardFrom", e.target.value)}>
            <option value="">Choose…</option>
            {HEARD_FROM.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
      </Panel>

      <Panel className="space-y-3">
        <PrivacyNote />
        <label className="flex items-start gap-3 text-sm text-ink-soft">
          <input type="checkbox" className="mt-0.5 size-5" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} />
          <span>
            I agree to the <Link to="/privacy" className="text-accent underline underline-offset-2">privacy note and beta terms</Link>.
          </span>
        </label>
      </Panel>

      {error && <p className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
      <PrimaryButton type="submit" disabled={busy || !form.riderGrade}>
        {busy ? "Sending…" : "Send my application"}
      </PrimaryButton>
    </form>
  );
}
