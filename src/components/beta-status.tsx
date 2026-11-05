import { Link } from "@tanstack/react-router";
import { signOut } from "@/lib/auth/client";
import type { BetaAccess } from "@/lib/beta";
import { BrandShell, HorseListView, Kicker, Panel, StatusBadge, Title } from "./beta-ui";

const COPY: Record<string, { title: string; body: string }> = {
  pending: {
    title: "Thanks — we’ll be in touch",
    body: "Thanks for your application! We’ll be in touch. While we’d love to guarantee everyone a spot in our trial, we review every rider to make sure we get the right mix of riders testing the app. We’ll let you know as soon as possible if you’ve been accepted!",
  },
  waitlist: {
    title: "You’re on the waitlist",
    body: "Beta places are full for now. You’re on our list and we’ll let you know as soon as a place opens.",
  },
  declined: {
    title: "Not this round",
    body: "Thanks so much for applying. We can’t offer you a beta place this time, but we’ll let you know when XSalute opens more widely.",
  },
};

export function StatusView({ access, justApplied = false }: { access: BetaAccess | null; justApplied?: boolean }) {
  const status = access?.hasAccess ? "approved" : (access?.status ?? "pending");
  const copy = COPY[status];
  return (
    <BrandShell>
      <Kicker>XSalute beta</Kicker>
      {status === "approved" ? (
        <>
          <Title>You’re in!</Title>
          <Panel className="mt-5 space-y-3">
            <p className="text-sm text-ink-soft">Your beta place is confirmed. Welcome to XSalute.</p>
            <Link to="/" className="block rounded-lg bg-accent px-4 py-3 text-center font-display font-extrabold text-accent-fg">
              Open XSalute
            </Link>
          </Panel>
        </>
      ) : (
        <>
          <Title>{justApplied ? COPY.pending.title : copy.title}</Title>
          <Panel className="mt-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted">Application status</span>
              <StatusBadge status={status} />
            </div>
            <p className="text-sm leading-relaxed text-ink-soft">{copy.body}</p>
            {access?.application && (
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-line pt-3 text-xs">
                <dt className="text-faint">Name</dt><dd className="text-ink-soft">{access.application.fullName}</dd>
                <dt className="text-faint">Email</dt><dd className="text-ink-soft">{access.application.email}</dd>
                <dt className="text-faint">Horse(s)</dt><dd className="text-ink-soft"><HorseListView horses={access.application.horseList} /></dd>
              </dl>
            )}
          </Panel>
        </>
      )}
      <p className="mt-4 text-center text-xs text-muted">
        Questions? <a className="text-accent underline underline-offset-2" href="mailto:virtualdressagenz@gmail.com">virtualdressagenz@gmail.com</a>
        {" · "}
        <button type="button" className="cursor-pointer underline underline-offset-2" onClick={() => void signOut("/")}>Sign out</button>
      </p>
    </BrandShell>
  );
}
