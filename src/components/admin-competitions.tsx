import { useEffect, useState, type FormEvent } from "react";
import { deleteCompetition, getCompetitions, saveCompetition } from "@/lib/competition-actions";
import type { CompetitionInput, CompetitionRecord } from "@/lib/competitions";
import { Field, inputCls, Kicker, Panel, PrimaryButton } from "./beta-ui";

const EMPTY: CompetitionInput = {
  id: "",
  name: "",
  venue: "",
  region: "",
  start: "",
  end: "",
  entryOpen: "",
  entryClose: "",
  offered: "",
  scheduleUrl: "",
  notes: "",
};

function when(c: CompetitionRecord) {
  return c.start === c.end ? c.start : `${c.start} – ${c.end}`;
}

/** Admin: create, edit and delete competitions. Riders pick from this list. */
export function CompetitionsAdmin() {
  const [list, setList] = useState<CompetitionRecord[] | null>(null);
  const [form, setForm] = useState<CompetitionInput>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCompetitions()
      .then(setList)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  function set<K extends keyof CompetitionInput>(key: K, value: CompetitionInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setList(await saveCompetition({ data: form }));
      setForm(EMPTY);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(item: CompetitionRecord) {
    if (!window.confirm(`Delete ${item.name}? It will come off every horse’s plan.`)) return;
    setBusy(true);
    setError(null);
    try {
      setList(await deleteCompetition({ data: { id: item.id } }));
      if (form.id === item.id) setForm(EMPTY);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="mt-5 space-y-4">
      <div>
        <Kicker>Competitions</Kicker>
        <h2 className="font-display mt-1 text-xl font-medium">Add a competition by hand</h2>
        <p className="mt-1 text-sm text-muted">
          Riders can add these to a horse’s plan as something they’re training towards. Type the
          dates and the schedule link yourself — nothing is read from EVO Events.
        </p>
      </div>
      <form className="grid gap-3" onSubmit={(event) => void onSave(event)}>
        <Field label="Name">
          <input
            className={inputCls}
            value={form.name}
            onChange={(event) => set("name", event.target.value)}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Venue" optional>
            <input
              className={inputCls}
              value={form.venue}
              onChange={(event) => set("venue", event.target.value)}
            />
          </Field>
          <Field label="Region" optional>
            <input
              className={inputCls}
              value={form.region}
              placeholder="e.g. Manawatū"
              onChange={(event) => set("region", event.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start">
            <input
              className={inputCls}
              type="date"
              value={form.start}
              onChange={(event) => set("start", event.target.value)}
            />
          </Field>
          <Field label="End" optional>
            <input
              className={inputCls}
              type="date"
              value={form.end}
              min={form.start || undefined}
              onChange={(event) => set("end", event.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Entries open" optional>
            <input
              className={inputCls}
              type="date"
              value={form.entryOpen}
              onChange={(event) => set("entryOpen", event.target.value)}
            />
          </Field>
          <Field label="Entries close" optional>
            <input
              className={inputCls}
              type="date"
              value={form.entryClose}
              onChange={(event) => set("entryClose", event.target.value)}
            />
          </Field>
        </div>
        <Field label="Levels or tests offered" optional>
          <input
            className={inputCls}
            value={form.offered}
            placeholder="e.g. Novice 2A, 2B, Medium 4A, Para"
            onChange={(event) => set("offered", event.target.value)}
          />
        </Field>
        <Field label="Schedule link" optional>
          <input
            className={inputCls}
            inputMode="url"
            placeholder="https://"
            value={form.scheduleUrl}
            onChange={(event) => set("scheduleUrl", event.target.value)}
          />
        </Field>
        <Field label="Notes" optional>
          <textarea
            className={inputCls}
            rows={2}
            value={form.notes}
            onChange={(event) => set("notes", event.target.value)}
          />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex flex-col gap-2 sm:flex-row">
          <PrimaryButton type="submit" disabled={busy} className="sm:flex-1">
            {busy ? "Saving…" : form.id ? "Save changes" : "Add competition"}
          </PrimaryButton>
          {form.id && (
            <button
              type="button"
              className="cursor-pointer rounded-lg border border-line px-4 py-3 text-sm font-semibold"
              onClick={() => {
                setForm(EMPTY);
                setError(null);
              }}
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>
      {!list && <p className="text-sm text-muted">Loading competitions…</p>}
      {list?.length === 0 && <p className="text-sm text-muted">No competitions yet.</p>}
      <ul className="flex flex-col gap-2">
        {list?.map((item) => (
          <li key={item.id} className="rounded-lg bg-bg p-3">
            <p className="text-sm font-semibold">{item.name}</p>
            <p className="text-sm text-muted">
              {when(item)}
              {item.venue ? ` · ${item.venue}` : ""}
              {item.region ? ` · ${item.region}` : ""}
            </p>
            {item.offered && <p className="mt-1 text-xs text-muted">Offers {item.offered}</p>}
            {item.entryClose && (
              <p className="text-xs text-faint">Entries close {item.entryClose}</p>
            )}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="cursor-pointer rounded-lg border border-line px-3 py-2 text-xs font-semibold"
                onClick={() => {
                  setError(null);
                  setForm({
                    id: item.id,
                    name: item.name,
                    venue: item.venue,
                    region: item.region,
                    start: item.start,
                    end: item.end,
                    entryOpen: item.entryOpen,
                    entryClose: item.entryClose,
                    offered: item.offered,
                    scheduleUrl: item.scheduleUrl,
                    notes: item.notes,
                  });
                }}
              >
                Edit
              </button>
              <button
                type="button"
                disabled={busy}
                className="cursor-pointer rounded-lg border border-line px-3 py-2 text-xs font-semibold text-danger disabled:opacity-50"
                onClick={() => void onDelete(item)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
