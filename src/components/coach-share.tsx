import {
  COACH_SCOPE_IDS,
  COACH_SCOPE_LABELS,
  type CoachScopes,
  type GuardianInput,
} from "@/lib/coach-portal-types";

export function ScopePicker({
  scopes,
  onChange,
}: {
  scopes: CoachScopes;
  onChange: (scopes: CoachScopes) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-semibold text-ink-soft">What they can see</legend>
      {COACH_SCOPE_IDS.map((id) => (
        <label key={id} className="flex min-h-11 items-center gap-3 text-sm text-fg">
          <input
            type="checkbox"
            className="size-4 accent-[var(--color-accent)]"
            checked={scopes[id]}
            onChange={(event) => onChange({ ...scopes, [id]: event.target.checked })}
          />
          {COACH_SCOPE_LABELS[id]}
        </label>
      ))}
    </fieldset>
  );
}

export function GuardianFields({
  value,
  onChange,
}: {
  value: GuardianInput;
  onChange: (value: GuardianInput) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg bg-sunken p-3">
      <label className="flex min-h-11 items-start gap-3 text-sm text-fg">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-[var(--color-accent)]"
          checked={value.under18}
          onChange={(event) => onChange({ ...value, under18: event.target.checked })}
        />
        <span>This rider is under 18. A parent or guardian needs to agree before a coach is connected.</span>
      </label>
      {value.under18 && (
        <>
          <input
            className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm"
            placeholder="Parent or guardian's name"
            value={value.guardianName ?? ""}
            onChange={(event) => onChange({ ...value, guardianName: event.target.value })}
          />
          <textarea
            className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm"
            rows={2}
            placeholder="Note (optional) — how consent was given"
            value={value.guardianNote ?? ""}
            onChange={(event) => onChange({ ...value, guardianNote: event.target.value })}
          />
          <label className="flex min-h-11 items-start gap-3 text-sm text-fg">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-[var(--color-accent)]"
              checked={value.guardianAgrees === true}
              onChange={(event) => onChange({ ...value, guardianAgrees: event.target.checked })}
            />
            <span>A parent or guardian agrees to share the ticked items with this coach.</span>
          </label>
          <p className="text-xs leading-relaxed text-faint">
            This records their agreement on the connection. A separate guardian login can be added later.
          </p>
        </>
      )}
    </div>
  );
}
