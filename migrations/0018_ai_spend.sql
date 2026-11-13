-- Month-to-date estimated xAI spend per rider, in millionths of a US dollar.
-- Admins are not written here. Cached speech is not added.
-- month_on is the first day of the month in New Zealand.

create table if not exists ai_spend (
  user_id text not null references "user" ("id") on delete cascade,
  month_on date not null,
  micros integer not null default 0 check (micros >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, month_on)
);
