import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient, GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { getAuthFeatures } from "@/lib/beta";
import { BrandShell, Field, inputCls, Kicker, Panel, PrimaryButton, Title } from "@/components/beta-ui";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetEnabled, setResetEnabled] = useState(false);
  useEffect(() => {
    getAuthFeatures()
      .then((f) => setResetEnabled(f.passwordReset))
      .catch(() => setResetEnabled(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await authClient.signIn.email({ email: email.trim(), password });
    setBusy(false);
    if (res.error) return setError("Email or password didn’t match.");
    window.location.href = "/";
  }

  const google = GROK_PROVIDERS.find((p) => p.idp === "google");
  const otherProviders = GROK_PROVIDERS.filter((p) => p !== google);

  return (
    <BrandShell>
      <Kicker>XSalute</Kicker>
      <Title>Sign in</Title>
      {google && (
        <button
          type="button"
          onClick={() => void signIn(google.providerId, { callbackURL: "/" })}
          className="mt-5 w-full cursor-pointer rounded-lg bg-accent px-4 py-3 font-display text-[15px] font-extrabold text-accent-fg transition hover:brightness-110"
        >
          Continue with Google
        </button>
      )}
      <Panel className="mt-4">
        <p className="mb-3 text-sm text-muted">Or use email and password</p>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Email">
            <input className={inputCls} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password">
            <input className={inputCls} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <PrimaryButton type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</PrimaryButton>
          <p className="text-center text-xs text-muted">
            {resetEnabled ? (
              <Link to="/forgot-password" className="font-semibold text-accent underline-offset-2 hover:underline">
                Forgot password?
              </Link>
            ) : (
              <>
                Forgot your password?{" "}
                <a className="font-semibold text-accent underline-offset-2 hover:underline" href="mailto:virtualdressagenz@gmail.com?subject=XSalute%20password%20reset">
                  Contact us
                </a>
              </>
            )}
          </p>
        </form>
      </Panel>
      {otherProviders.length > 0 && (
        <div className="mt-4 space-y-2">
          {otherProviders.map((p) => (
            <button
              key={p.providerId}
              type="button"
              onClick={() => void signIn(p.providerId, { callbackURL: "/" })}
              className="w-full cursor-pointer rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink-soft hover:border-accent"
            >
              Continue with {p.label}
            </button>
          ))}
        </div>
      )}
      <p className="mt-4 text-center text-sm text-muted">
        New rider? <Link to="/join" className="font-semibold text-accent underline-offset-2 hover:underline">Apply for the beta</Link>
      </p>
    </BrandShell>
  );
}
