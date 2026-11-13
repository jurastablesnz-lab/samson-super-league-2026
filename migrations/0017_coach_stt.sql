-- Seconds of voice-command audio transcribed per rider per New Zealand day.
-- Admins are not counted. A full test of short "next" clips is well under a minute.

create table if not exists coach_stt_days (
  user_id text not null references "user" ("id") on delete cascade,
  read_on date not null,
  seconds integer not null default 0 check (seconds >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, read_on)
);
