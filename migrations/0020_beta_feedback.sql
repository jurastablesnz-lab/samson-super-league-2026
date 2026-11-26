-- Beta feedback from riders: a typed note and/or a short voice note.
-- The audio bytes are not in this table. audio_key is a private object in the
-- existing R2 bucket under feedback/<user id>/. Additive only.
-- Numbered 0020 so it lands after 0019_coach_portal.sql (Coach Portal PR #2)
-- whichever of the two is merged first.

create table if not exists beta_feedback (
  id text primary key,
  user_id text not null references "user" ("id") on delete cascade,
  kind text not null default 'general' check (kind in ('bug', 'idea', 'general')),
  message text not null default '',
  audio_key text unique,
  audio_mime text not null default '',
  audio_bytes integer not null default 0,
  audio_ms integer not null default 0,
  page text not null default '',
  app_version text not null default '',
  user_agent text not null default '',
  status text not null default 'open' check (status in ('open', 'handled')),
  handled_at timestamptz,
  handled_by text,
  emailed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (message <> '' or audio_key is not null)
);
create index if not exists beta_feedback_status_idx on beta_feedback (status, created_at desc);
create index if not exists beta_feedback_user_idx on beta_feedback (user_id, created_at desc);
