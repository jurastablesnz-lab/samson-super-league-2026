-- Cached personal caller cues for one horse and one test.
-- Edited lines are stored in the same JSON and are not overwritten by a refresh.
-- coach_generations counts refreshes per rider per New Zealand day. Admins are not counted.

create table if not exists coach_cues (
  horse_id text not null references horses ("id") on delete cascade,
  test_id text not null,
  user_id text not null references "user" ("id") on delete cascade,
  cues jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (horse_id, test_id)
);

create table if not exists coach_generations (
  user_id text not null references "user" ("id") on delete cascade,
  read_on date not null,
  reads integer not null default 0 check (reads >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, read_on)
);
