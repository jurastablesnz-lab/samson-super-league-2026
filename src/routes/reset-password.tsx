import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth/client";
import { BrandShell, Field, inputCls, Kicker, Panel, PrimaryButton, Title } from "@/components/beta-ui";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : undefined,
    error: typeof s.error === "string" ? s.error : undefined,
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token, error: linkError } = Route.useSearch();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don’t match.");
    if (!token) return;
    setBusy(true);
    const res = await authClient.resetPassword({ newPassword: password, token });
    setBusy(false);
    if (res.error) setError("That link has expired or was already used. Ask for a new one.");
    else setDone(true);
  }

  const bad = !!linkError || !token;
  return (
    <BrandShell>
      <Kicker>XSalute</Kicker>
      <Title>Choose a new password</Title>
      {done ? (
        <Panel className="mt-5 space-y-3 text-sm text-ink-soft">
          <p>Your password has been changed. You’ve been signed out everywhere else.</p>
          <Link to="/login" className="block rounded-lg bg-accent px-4 py-3 text-center font-display font-extrabold text-accent-fg">
            Sign in
          </Link>
        </Panel>
      ) : bad ? (
        <Panel className="mt-5 space-y-2 text-sm text-ink-soft">
          <p>This reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="font-semibold text-accent">Send a new link</Link>
        </Panel>
      ) : (
        <Panel className="mt-5">
          <form onSubmit={submit} className="space-y-3">
            <Field label="New password" hint="At least 8 characters.">
              <input className={inputCls} type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Field label="Confirm new password">
              <input className={inputCls} type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </Field>
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <PrimaryButton type="submit" disabled={busy}>{busy ? "Saving…" : "Save new password"}</PrimaryButton>
          </form>
        </Panel>
      )}
    </BrandShell>
  );
}
