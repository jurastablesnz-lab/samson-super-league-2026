-- Daily judge-sheet reads per rider. Admins are not recorded here.
-- Additive only.

create table if not exists sheet_reads (
  user_id text not null references "user" ("id") on delete cascade,
  read_on date not null,
  reads integer not null default 0 check (reads >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, read_on)
);
