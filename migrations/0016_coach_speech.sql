-- Spoken lines for the arena caller, keyed by voice and text.
-- The same instruction is generated once and reused for every horse.
-- coach_tts_days counts characters for approved riders. Admins are not counted.

create table if not exists coach_speech (
  speech_hash text primary key,
  voice text not null,
  chars integer not null check (chars >= 0),
  mime text not null default 'audio/mpeg',
  audio_b64 text,
  object_key text,
  created_at timestamptz not null default now()
);

create table if not exists coach_tts_days (
  user_id text not null references "user" ("id") on delete cascade,
  read_on date not null,
  chars integer not null default 0 check (chars >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, read_on)
);
