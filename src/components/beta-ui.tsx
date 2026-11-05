import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function BrandShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="vd-glow min-h-dvh text-fg">
      <div
        className={cn(
          "mx-auto flex min-h-dvh flex-col px-4 pb-12 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6",
          wide ? "max-w-4xl" : "max-w-xl",
        )}
      >
        <Link to="/" className="mb-6 flex items-center gap-2.5">
          <img src="/brand/vdnz-icon.svg" alt="" className="size-9 rounded-[10px] ring-1 ring-accent/30" />
          <div className="leading-tight">
            <p className="font-display text-[15px] font-extrabold tracking-[-0.02em] text-fg">
              <span className="text-accent">X</span>Salute{" "}
              <span className="text-[10px] font-semibold tracking-normal text-muted">by Virtual Dressage NZ</span>
            </p>
            <p className="text-[9.5px] font-semibold tracking-[0.22em] text-muted">PLAN · TRAIN · COMPETE · REFLECT</p>
          </div>
        </Link>
        <div className="flex-1">{children}</div>
        <footer className="mt-10 text-center text-[11px] text-faint">
          Made in New Zealand · <Link to="/privacy" className="underline underline-offset-2">Privacy</Link> ·{" "}
          <a href="mailto:virtualdressagenz@gmail.com" className="underline underline-offset-2">virtualdressagenz@gmail.com</a>
        </footer>
      </div>
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5", className)}>
      {children}
    </section>
  );
}

export function Kicker({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">{children}</p>;
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <h1 className="font-display mt-1 text-[1.65rem] leading-[1.08] font-extrabold tracking-[-0.03em] text-fg sm:text-[2rem]">
      {children}
    </h1>
  );
}

export const inputCls =
  "w-full rounded-lg border border-line bg-sunken px-3 py-2.5 text-[15px] text-fg placeholder:text-faint focus:border-accent focus:outline-none";

export function Field({
  label,
  hint,
  children,
  optional,
  group = false,
}: {
  /** Wraps a button group: render a div (a <label> would forward taps to the first button). */
  group?: boolean;
  label: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  const Tag = group ? "div" : "label";
  return (
    <Tag className="block" {...(group ? { role: "group", "aria-label": label } : {})}>
      <span className="mb-1 block text-sm font-semibold text-ink-soft">
        {label} {optional && <span className="font-normal text-faint">(optional)</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </Tag>
  );
}

export function PrimaryButton({
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cn(
        "w-full cursor-pointer rounded-lg bg-accent px-4 py-3 font-display text-[15px] font-extrabold text-accent-fg transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    pending: "bg-violet/20 text-[#b9a8ff]",
    approved: "bg-accent/15 text-accent",
    declined: "bg-danger/15 text-danger",
    waitlist: "bg-orange/15 text-orange",
  };
  const s = status ?? "pending";
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold capitalize", map[s])}>
      {s === "waitlist" ? "Waitlisted" : s}
    </span>
  );
}

export function PrivacyNote() {
  return (
    <p className="text-xs leading-relaxed text-muted">
      <strong className="text-ink-soft">Privacy:</strong> we collect your details only to assess and run the XSalute
      beta. They are stored securely, seen only by the Virtual Dressage NZ team, never sold or shared, and you can ask us
      to delete them any time at virtualdressagenz@gmail.com. Beta access is free, by invitation, and may change or end
      as we develop the app.
    </p>
  );
}

/** Read-only list of an application's horses (legacy single text shows as one horse). */
export function HorseListView({ horses }: { horses: { name: string; level: string; notes: string }[] }) {
  if (!horses.length) return <span>—</span>;
  return (
    <ul className="space-y-1">
      {horses.map((h, i) => (
        <li key={i} className="break-words">
          <span className="font-semibold text-fg">{h.name}</span>
          {h.level && <span className="text-muted"> · {h.level}</span>}
          {h.notes && <span className="block text-faint">{h.notes}</span>}
        </li>
      ))}
    </ul>
  );
}
