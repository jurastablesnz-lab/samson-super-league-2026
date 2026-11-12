import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient, GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import {
  COMPETITION_LEVELS,
  HEARD_FROM,
  REGIONS,
  RIDER_GRADES,
  submitApplication,
  MAX_HORSES,
  type ApplicationInput,
  type HorseEntry,
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
  horseList: [{ name: "", level: "", notes: "", esnzNumber: "" }],
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
      <Kicker>XSalute · private beta</Kicker>
      <Title>
        Your horse&apos;s official results, the judges&apos; comments and your coach&apos;s notes,
        turned into one plan for your next show.
      </Title>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Bring the scores, what the judges wrote, and what your coach asked you to work on. We’ll turn that into the
        plan you ride toward your next show. A small number of free beta places are open. Create your account, tell us
        about you and your horse, and we’ll be in touch.
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
    const filled = form.horseList.filter((h) => h.name.trim() || h.level || h.notes.trim() || h.esnzNumber?.trim());
    if (!filled.some((h) => h.name.trim())) return setError("Please add at least one horse with a name.");
    if (filled.some((h) => !h.name.trim())) return setError("Every horse needs a name (or remove the empty one).");
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
          {GROK_PROVIDERS.filter((p) => p.idp === "google").map((p) => (
            <button
              key={p.providerId}
              type="button"
              onClick={() => void signIn(p.providerId, { callbackURL: "/join" })}
              className="w-full cursor-pointer rounded-lg bg-accent px-4 py-3 font-display text-[15px] font-extrabold text-accent-fg transition hover:brightness-110"
            >
              Continue with Google
            </button>
          ))}
          <p className="text-sm text-muted">Or use email and password</p>
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
        <Kicker>{signedIn ? "Your horses & season" : "3 · Your horses & season"}</Kicker>
        <HorsesEditor horses={form.horseList} onChange={(h) => set("horseList", h)} />
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

function HorsesEditor({ horses, onChange }: { horses: HorseEntry[]; onChange: (h: HorseEntry[]) => void }) {
  const update = (i: number, patch: Partial<HorseEntry>) => onChange(horses.map((h, j) => (j === i ? { ...h, ...patch } : h)));
  return (
    <div className="space-y-3">
      {horses.map((h, i) => (
        <fieldset key={i} className="space-y-2.5 rounded-lg border border-line bg-sunken/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-fg">Horse {i + 1}</p>
            {horses.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(horses.filter((_, j) => j !== i))}
                className="cursor-pointer rounded-md px-2 py-1 text-xs font-semibold text-muted underline-offset-2 hover:text-danger hover:underline"
                aria-label={`Remove horse ${i + 1}${h.name ? ` (${h.name})` : ""}`}
              >
                Remove
              </button>
            )}
          </div>
          <Field label="Horse name" hint="Use the registered name, exactly as it appears on EVO Events, so your results can be matched.">
            <input className={inputCls} required={i === 0} value={h.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="e.g. Samson" />
          </Field>
          <Field label="Current competition level">
            <select className={inputCls} value={h.level} onChange={(e) => update(i, { level: e.target.value })}>
              <option value="">Choose…</option>
              {COMPETITION_LEVELS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="ESNZ registration number" optional hint="The horse’s ESNZ number — helps us match your show results.">
            <input
              className={inputCls}
              inputMode="text"
              autoComplete="off"
              maxLength={20}
              value={h.esnzNumber ?? ""}
              onChange={(e) => update(i, { esnzNumber: e.target.value })}
              placeholder="e.g. 12345"
            />
          </Field>
          <Field label="Notes" optional>
            <textarea className={inputCls} rows={2} value={h.notes} onChange={(e) => update(i, { notes: e.target.value })} placeholder="Age, breed, goals…" />
          </Field>
        </fieldset>
      ))}
      {horses.length < MAX_HORSES ? (
        <button
          type="button"
          onClick={() => onChange([...horses, { name: "", level: "", notes: "", esnzNumber: "" }])}
          className="w-full cursor-pointer rounded-lg border border-dashed border-accent/60 px-3 py-2.5 text-sm font-semibold text-accent hover:bg-accent/10"
        >
          + Add another horse
        </button>
      ) : (
        <p className="text-xs text-muted">That’s the maximum of {MAX_HORSES} horses.</p>
      )}
    </div>
  );
}
