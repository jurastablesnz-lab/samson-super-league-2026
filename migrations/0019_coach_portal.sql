-- Coach Portal (phase 1).
--
-- A coach may also be a rider. Coach approval is separate from the rider beta.
-- Links are consent-based: the rider chooses share scopes and can revoke them.
-- under-18 guardian consent is recorded on the link (name, note, timestamp) so a
-- fuller guardian account can be added later without a new relationship.
-- subscription_status is a placeholder for the future NZ$50/month coach fee.
-- Nothing here charges a card. Coaches bill pupils outside the app, or coach free.
--
-- Additive only.

alter table riders add column if not exists under_18 boolean not null default false;
alter table riders add column if not exists guardian_note text not null default '';

alter table coach_visits add column if not exists author_user_id text;
alter table coach_visits add column if not exists author_name text not null default '';
alter table coach_visits add column if not exists author_role text not null default 'rider';
alter table coach_visits
  add constraint coach_visits_author_role_check
  check (author_role in ('rider', 'coach'));
alter table coach_visits
  add constraint coach_visits_author_user_fkey
  foreign key (author_user_id) references "user" ("id") on delete set null;

create table if not exists coaches (
  user_id text primary key,
  email text not null,
  display_name text not null default '',
  phone text,
  region text not null default '',
  bio text not null default '',
  -- [{ id, kind, label, detail, perMonth }] — display only, not a price list.
  offerings jsonb not null default '[]'::jsonb,
  pupil_cap integer not null default 12,
  accepting_pupils boolean not null default true,
  -- none until a coach subscription exists. Not a payment.
  subscription_status text not null default 'none',
  status text not null default 'pending',
  admin_notes text not null default '',
  decided_at timestamptz,
  decided_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coaches_user_id_fkey
    foreign key (user_id) references "user" ("id") on delete cascade deferrable initially immediate,
  constraint coaches_pupil_cap_check check (pupil_cap >= 0 and pupil_cap <= 200),
  constraint coaches_subscription_status_check
    check (subscription_status in ('none', 'comp', 'active', 'past_due', 'cancelled')),
  constraint coaches_status_check check (status in ('pending', 'approved', 'declined'))
);

create index if not exists coaches_status_idx on coaches (status);

create table if not exists coach_links (
  id text primary key,
  rider_user_id text not null,
  coach_user_id text,
  coach_email text not null,
  rider_email text not null default '',
  initiated_by text not null,
  status text not null default 'pending',
  scopes jsonb not null default '{}'::jsonb,
  rider_under_18 boolean not null default false,
  guardian_consent_required boolean not null default false,
  guardian_name text not null default '',
  guardian_note text not null default '',
  guardian_consented_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  revoked_at timestamptz,
  constraint coach_links_rider_user_id_fkey
    foreign key (rider_user_id) references "user" ("id") on delete cascade deferrable initially immediate,
  constraint coach_links_coach_user_id_fkey
    foreign key (coach_user_id) references "user" ("id") on delete cascade deferrable initially immediate,
  constraint coach_links_initiated_by_check check (initiated_by in ('rider', 'coach')),
  constraint coach_links_status_check check (status in ('pending', 'active', 'declined', 'revoked'))
);

create index if not exists coach_links_coach_idx on coach_links (coach_user_id, status);
create index if not exists coach_links_rider_idx on coach_links (rider_user_id, status);
create index if not exists coach_links_coach_email_idx on coach_links (coach_email);

-- One open connection per rider and coach email. Revoked and declined rows stay
-- as history and do not block a later invite.
create unique index if not exists coach_links_open_pair_uidx
  on coach_links (rider_user_id, coach_email)
  where status in ('pending', 'active');
