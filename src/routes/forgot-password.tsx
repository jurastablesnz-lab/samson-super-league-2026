import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth/client";
import { getAuthFeatures } from "@/lib/beta";
import { BrandShell, Field, inputCls, Kicker, Panel, PrimaryButton, Title } from "@/components/beta-ui";

export const Route = createFileRoute("/forgot-password")({ component: ForgotPasswordPage });

function ForgotPasswordPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getAuthFeatures()
      .then((f) => setEnabled(f.passwordReset))
      .catch(() => setEnabled(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    // Same message whether or not the address has an account (no enumeration).
    if (res.error && res.error.status !== 404) setError("Couldn’t send the email right now. Try again shortly.");
    else setSent(true);
  }

  return (
    <BrandShell>
      <Kicker>XSalute</Kicker>
      <Title>Forgot your password?</Title>
      {enabled === false ? (
        <Panel className="mt-5 space-y-2 text-sm text-ink-soft">
          <p>Password reset by email isn’t switched on yet.</p>
          <p>
            Email{" "}
            <a className="text-accent underline" href="mailto:virtualdressagenz@gmail.com?subject=XSalute%20password%20reset">
              virtualdressagenz@gmail.com
            </a>{" "}
            from the address you signed up with and we’ll sort it out.
          </p>
        </Panel>
      ) : sent ? (
        <Panel className="mt-5 text-sm text-ink-soft">
          If an account exists for <strong>{email}</strong>, we’ve sent a link to reset the password. It expires in an hour —
          check your spam folder if it doesn’t arrive.
        </Panel>
      ) : (
        <Panel className="mt-5">
          <form onSubmit={submit} className="space-y-3">
            <p className="text-sm text-muted">Enter the email you signed up with and we’ll send you a reset link.</p>
            <Field label="Email">
              <input className={inputCls} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <PrimaryButton type="submit" disabled={busy || enabled === null}>{busy ? "Sending…" : "Send reset link"}</PrimaryButton>
          </form>
        </Panel>
      )}
      <p className="mt-4 text-center text-sm text-muted">
        <Link to="/login" className="font-semibold text-accent">Back to sign in</Link>
      </p>
    </BrandShell>
  );
}
