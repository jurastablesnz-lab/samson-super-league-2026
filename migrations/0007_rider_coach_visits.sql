-- Coach visits for every rider workspace.
--
-- Videos already live on judge_sheets (kind = 'video') and packing ticks already
-- live on plans.progress.pack. Both are keyed by user_id and horse_id. This adds
-- the visit list the Coach section edits. One row is one visit for one horse.
-- Additive only: nothing here changes existing tables.

create table if not exists coach_visits (
  id text primary key,
  user_id text not null,
  horse_id text not null references horses ("id") on delete cascade,
  visit_date date not null,
  end_date date not null,
  title text not null default '',
  focus text not null default '',
  film text not null default '',
  homework text not null default '',
  leave_it text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coach_visits_user_id_fkey
    foreign key (user_id) references "user" ("id") on delete cascade deferrable initially immediate,
  constraint coach_visits_dates_check check (end_date >= visit_date)
);
create index if not exists coach_visits_user_horse_idx
  on coach_visits (user_id, horse_id, visit_date);
