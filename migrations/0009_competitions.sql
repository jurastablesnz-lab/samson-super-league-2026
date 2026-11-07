-- Competitions an admin types in by hand, and the horses training towards them.
--
-- No scraping. Dates, the levels or tests on offer, and the schedule link are
-- whatever the admin entered. A rider attaches a competition to one of their
-- horses; the plan shows a countdown to the event and to entry close.
-- Additive only.

create table if not exists competitions (
  id text primary key,
  name text not null,
  venue text not null default '',
  region text not null default '',
  start_date date not null,
  end_date date not null,
  entry_open date,
  entry_close date,
  offered text not null default '',
  schedule_url text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint competitions_dates_check check (end_date >= start_date),
  constraint competitions_entry_check check (
    entry_open is null or entry_close is null or entry_close >= entry_open
  )
);
create index if not exists competitions_start_idx on competitions (start_date);

create table if not exists horse_competitions (
  horse_id text not null references horses ("id") on delete cascade,
  competition_id text not null references competitions ("id") on delete cascade,
  user_id text not null,
  tests jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  primary key (horse_id, competition_id),
  constraint horse_competitions_user_id_fkey
    foreign key (user_id) references "user" ("id") on delete cascade deferrable initially immediate
);
create index if not exists horse_competitions_user_idx on horse_competitions (user_id);
