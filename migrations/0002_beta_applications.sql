-- XSalute beta: rider applications + approval status (one per account),
-- and a tiny key/value settings table (beta place cap).
create table if not exists beta_applications (
  user_id text primary key references "user" ("id") on delete cascade,
  email text not null,
  full_name text not null,
  phone text,
  region text not null,
  rider_grade text not null,
  competition_level text not null,
  horses text not null,
  esnz_member boolean not null default false,
  coach text,
  goals text not null,
  heard_from text not null,
  consent boolean not null default false,
  consent_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined', 'waitlist')),
  admin_notes text not null default '',
  decided_at timestamptz,
  decided_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists beta_applications_status_idx on beta_applications (status);

create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into app_settings (key, value) values ('beta_cap', '15')
  on conflict (key) do nothing;
