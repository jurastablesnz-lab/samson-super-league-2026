-- XSalute per-rider workspace: everything that used to live only in one
-- browser's localStorage now lives here, keyed to the signed-in auth user.
--
--   riders        one row per auth user who has opened the app (setup state)
--   horses        a rider's horses (from the beta application + setup wizard)
--   plans         one generated season plan per horse (+ ticked sessions)
--   results       scores: typed in the app, imported from this device's
--                 localStorage (owner), or imported from an EVO Events CSV
--   ride_notes    dated training notes
--   judge_sheets  judge-sheet / video review entries incl. the AI summary
--                 (photos and videos stay in the device's IndexedDB)
--   result_imports  audit of admin CSV imports
--
-- Every table carries user_id (TEXT, the Better Auth user id) and every query
-- is scoped to the authenticated user server-side (src/lib/rider.ts).
-- Additive only: nothing here touches existing tables.

create table if not exists riders (
  user_id text primary key references "user" ("id") on delete cascade,
  display_name text not null default '',
  setup_completed_at timestamptz,
  legacy_imported_at timestamptz,
  legacy_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists horses (
  id text primary key,
  user_id text not null references "user" ("id") on delete cascade,
  name text not null,
  level text not null default '',
  esnz_number text,
  notes text not null default '',
  -- The owner's original single-rider plan (Jura Samson). Only ever set for an
  -- admin account; drives the hand-written Samson plan instead of a generated one.
  is_legacy_samson boolean not null default false,
  sort_order integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists horses_user_idx on horses (user_id);
create index if not exists horses_esnz_idx on horses (esnz_number);

create table if not exists plans (
  horse_id text primary key references horses ("id") on delete cascade,
  user_id text not null references "user" ("id") on delete cascade,
  config jsonb not null default '{}'::jsonb,
  plan jsonb,
  -- { done: { [sessionId]: true }, pack: { [itemId]: true } }
  progress jsonb not null default '{}'::jsonb,
  -- { mediaId, fileName, mime, size, durationSec, storedOn: 'device', uploadedAt }
  freestyle jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists plans_user_idx on plans (user_id);

create table if not exists result_imports (
  id bigserial primary key,
  uploaded_by text not null,
  file_name text not null default '',
  row_count integer not null default 0,
  matched_count integer not null default 0,
  inserted_count integer not null default 0,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists results (
  id bigserial primary key,
  user_id text not null references "user" ("id") on delete cascade,
  horse_id text not null references horses ("id") on delete cascade,
  -- Id the client knows the row by (old localStorage ids are kept verbatim).
  client_id text not null,
  source text not null default 'app' check (source in ('app', 'legacy', 'evo_csv')),
  show_id text not null default '',
  show_name text not null default '',
  ride_date date,
  test text not null default '',
  level text not null default '',
  percent double precision,
  place text not null default '',
  status text not null default 'ok',
  judges text not null default '',
  notes text not null default '',
  event_url text not null default '',
  dedupe_key text,
  import_id bigint references result_imports ("id") on delete set null,
  raw jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists results_horse_client_uidx on results (horse_id, client_id);
create unique index if not exists results_horse_dedupe_uidx on results (horse_id, dedupe_key);
create index if not exists results_user_idx on results (user_id);

create table if not exists ride_notes (
  id bigserial primary key,
  user_id text not null references "user" ("id") on delete cascade,
  horse_id text not null references horses ("id") on delete cascade,
  client_id text not null,
  note_date date,
  body text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists ride_notes_horse_client_uidx on ride_notes (horse_id, client_id);

create table if not exists judge_sheets (
  id bigserial primary key,
  user_id text not null references "user" ("id") on delete cascade,
  horse_id text not null references horses ("id") on delete cascade,
  client_id text not null,
  kind text not null default 'sheet' check (kind in ('sheet', 'video')),
  show_id text not null default '',
  show_name text not null default '',
  ride_date date,
  test text not null default '',
  note text not null default '',
  mime text not null default '',
  -- The AI judge-sheet read (SheetRead shape in src/lib/review-types.ts).
  sheet jsonb,
  -- Photo ids in the device's IndexedDB (the images themselves are not uploaded).
  photos jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists judge_sheets_horse_client_uidx on judge_sheets (horse_id, client_id);
