import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  decideApplication,
  getAdminOverview,
  setBetaCap,
  type AdminOverview,
  type Application,
  type BetaStatus,
} from "@/lib/beta";
import { useBetaAccess } from "@/lib/use-beta-access";
import { BrandShell, HorseListView, inputCls, Kicker, Panel, StatusBadge, Title } from "@/components/beta-ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({ component: AdminPage });

type Filter = BetaStatus | "all";
const FILTERS: Filter[] = ["pending", "approved", "waitlist", "declined", "all"];

function AdminPage() {
  const access = useBetaAccess();
  if (access.state === "loading") return <div className="vd-glow min-h-dvh" />;
  if (access.state !== "ready" || !access.access.isAdmin) {
    return (
      <BrandShell>
        <Title>Admins only</Title>
        <p className="mt-3 text-sm text-muted">
          Sign in with Susan’s Google account to manage beta applications.{" "}
          <Link to="/login" className="text-accent underline">Sign in</Link>
        </p>
      </BrandShell>
    );
  }
  return <AdminDashboard />;
}

function AdminDashboard() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    getAdminOverview().then(setData).catch((e: unknown) => setError(String(e)));
  }, []);
  useEffect(load, [load]);

  if (error) return <BrandShell><p className="text-danger">{error}</p></BrandShell>;
  if (!data) return <div className="vd-glow min-h-dvh" />;
  const count = (f: Filter) => (f === "all" ? data.applications.length : data.applications.filter((a) => a.status === f).length);
  const list = data.applications.filter((a) => filter === "all" || a.status === filter);
  const full = data.approved >= data.cap;

  return (
    <BrandShell wide>
      <div className="flex items-end justify-between gap-3">
        <div>
          <Kicker>Admin · beta riders</Kicker>
          <Title>Applications</Title>
        </div>
        <Link to="/" className="text-sm font-semibold text-accent">Open app →</Link>
      </div>

      <Panel className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-3xl font-extrabold">
              <span className={full ? "text-orange" : "text-accent"}>{data.approved}</span>
              <span className="text-muted"> / {data.cap}</span>
            </p>
            <p className="text-xs text-muted">beta places approved{full ? " — cap reached" : ""}</p>
          </div>
          <CapEditor cap={data.cap} onSaved={load} />
        </div>
      </Panel>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold capitalize",
              filter === f ? "border-accent bg-accent/15 text-accent" : "border-line text-muted",
            )}
          >
            {f === "waitlist" ? "Waitlist" : f} · {count(f)}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-3">
        {list.length === 0 && <p className="py-8 text-center text-sm text-muted">No applications here yet.</p>}
        {list.map((a) => (
          <ApplicationCard key={a.userId} app={a} capReached={full} onChanged={load} />
        ))}
      </div>
    </BrandShell>
  );
}

function CapEditor({ cap, onSaved }: { cap: number; onSaved: () => void }) {
  const [value, setValue] = useState(String(cap));
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void setBetaCap({ data: { cap: Number(value) } }).then(onSaved);
      }}
    >
      <label className="text-xs text-muted" htmlFor="cap">Cap</label>
      <input id="cap" className={cn(inputCls, "w-20 py-1.5")} inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} />
      <button type="submit" className="cursor-pointer rounded-lg border border-line px-3 py-1.5 text-xs font-semibold">Save</button>
    </form>
  );
}

function ApplicationCard({ app, capReached, onChanged }: { app: Application; capReached: boolean; onChanged: () => void }) {
  const [notes, setNotes] = useState(app.adminNotes);
  const [busy, setBusy] = useState(false);
  const act = async (status?: BetaStatus) => {
    if (status === "approved" && capReached && app.status !== "approved" && !window.confirm("The beta cap is reached. Approve anyway?")) return;
    if (status) setBusy(true);
    try {
      await decideApplication({ data: { userId: app.userId, status, notes } });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err));
    } finally {
      if (status) setBusy(false);
    }
    onChanged();
  };
  const rows: [string, React.ReactNode][] = [
    ["Email", app.email],
    ["Phone", app.phone || "—"],
    ["Region", app.region],
    ["Grade", app.riderGrade],
    ["Competing at", app.competitionLevel],
    [app.horseList.length > 1 ? `Horses (${app.horseList.length})` : "Horse", <HorseListView horses={app.horseList} />],
    ["ESNZ member", app.esnzMember ? "Yes" : "No"],
    ["Coach", app.coach || "—"],
    ["Goals", app.goals],
    ["Heard via", app.heardFrom],
    ["Applied", new Date(app.createdAt).toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short" })],
  ];
  return (
    <Panel>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg font-extrabold leading-tight">{app.fullName}</p>
          <p className="text-xs text-muted">{app.riderGrade} · {app.competitionLevel} · {app.region}</p>
        </div>
        <StatusBadge status={app.status} />
      </div>
      <dl className="mt-3 grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-1.5 text-[13px]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-faint">{k}</dt>
            <dd className="break-words whitespace-pre-line text-ink-soft">{v}</dd>
          </div>
        ))}
      </dl>
      <textarea
        className={cn(inputCls, "mt-3 text-sm")}
        rows={2}
        placeholder="Private notes (only admins see these)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => notes !== app.adminNotes && void act()}
      />
      <div className="mt-3 grid grid-cols-3 gap-2">
        <ActionButton disabled={busy} active={app.status === "approved"} className="bg-accent text-accent-fg" onClick={() => void act("approved")}>Approve</ActionButton>
        <ActionButton disabled={busy} active={app.status === "waitlist"} className="bg-orange/20 text-orange" onClick={() => void act("waitlist")}>Waitlist</ActionButton>
        <ActionButton disabled={busy} active={app.status === "declined"} className="bg-danger/15 text-danger" onClick={() => void act("declined")}>Decline</ActionButton>
      </div>
    </Panel>
  );
}

function ActionButton({ active, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      className={cn("cursor-pointer rounded-lg px-2 py-2.5 text-sm font-bold disabled:opacity-50", active && "ring-2 ring-fg/60", className)}
    />
  );
}
