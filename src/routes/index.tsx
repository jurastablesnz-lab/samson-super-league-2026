import { useEffect, useState } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { App } from "@/components/app";
import { OwnerSync } from "@/components/owner-sync";
import { RiderHome } from "@/components/rider-app";
import { StatusView } from "@/components/beta-status";
import { BrandShell, Kicker, Panel, Title } from "@/components/beta-ui";
import { signOut } from "@/lib/auth/client";
import { scopePlanStorage } from "@/lib/store";
import { useBetaAccess } from "@/lib/use-beta-access";
import type { BetaAccess } from "@/lib/beta";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const access = useBetaAccess();
  if (access.state === "loading") return <div className="vd-glow min-h-dvh" />;
  if (access.state === "signed_out") return <Welcome />;
  if (access.state === "error") {
    return (
      <BrandShell>
        <Title>Something went wrong</Title>
        <p className="mt-3 text-sm text-muted">{access.message}</p>
      </BrandShell>
    );
  }
  const a = access.access;
  if (a.hasAccess) return <TrainingApp access={a} />;
  if (!a.application) return <Navigate to="/join" />;
  return <StatusView access={a} />;
}

function AccountBar({ access }: { access: BetaAccess }) {
  if (!access.email) return null;
  return (
    <div className="flex items-center justify-end gap-3 bg-sunken px-4 py-1.5 text-[11px] text-muted">
      <span className="truncate">{access.email}</span>
      {access.isAdmin && (
        <Link to="/admin" className="font-semibold text-accent">Admin</Link>
      )}
      <button type="button" className="cursor-pointer underline-offset-2 hover:underline" onClick={() => void signOut("/")}>
        Sign out
      </button>
    </div>
  );
}

function TrainingApp({ access }: { access: BetaAccess }) {
  // Samson's hand-written plan is the owner's only. Every other rider gets
  // their own generated plan from Postgres (or the setup wizard).
  if (!access.isAdmin) {
    return (
      <>
        <AccountBar access={access} />
        <RiderHome storageKey={access.storageKey} />
      </>
    );
  }
  return <OwnerApp access={access} />;
}

function OwnerApp({ access }: { access: BetaAccess }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void scopePlanStorage(access.storageKey).then(() => setReady(true));
  }, [access.storageKey]);
  if (!ready) return <div className="vd-glow min-h-dvh" />;
  return (
    <>
      {access.email && (
        <div className="flex items-center justify-end gap-3 bg-sunken px-4 py-1.5 text-[11px] text-muted">
          <span className="truncate">{access.email}</span>
          {access.isAdmin && (
            <Link to="/admin" className="font-semibold text-accent">Admin</Link>
          )}
          <button type="button" className="cursor-pointer underline-offset-2 hover:underline" onClick={() => void signOut("/")}>
            Sign out
          </button>
        </div>
      )}
      {access.email && <OwnerSync />}
      <App />
    </>
  );
}

function Welcome() {
  return (
    <BrandShell>
      <Kicker>Plan · Train · Compete · Reflect</Kicker>
      <Title>Your dressage season, in one place.</Title>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        XSalute by Virtual Dressage NZ is in private beta with a small group of riders. Apply for a place, or sign in if
        you already have one.
      </p>
      <Panel className="mt-5 space-y-3">
        <Link to="/join" className="block rounded-lg bg-accent px-4 py-3 text-center font-display font-extrabold text-accent-fg">
          Apply to join the beta
        </Link>
        <Link to="/login" className="block rounded-lg border border-line px-4 py-3 text-center text-sm font-semibold text-ink-soft">
          Sign in
        </Link>
      </Panel>
    </BrandShell>
  );
}
