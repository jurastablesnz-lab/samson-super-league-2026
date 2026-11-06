-- Admin-prepared rider workspaces and read-only rider activity.
-- The invite id is a placeholder auth user id until a verified matching Google
-- account claims it. Existing "user" rows and workspaces are unchanged.

alter table riders
  add column if not exists last_active_at timestamptz;

create table if not exists rider_invitations (
  id text primary key,
  email text not null unique,
  full_name text not null,
  workspace_user_id text not null references riders (user_id) on delete cascade,
  claimed_by_user_id text references "user" ("id"),
  claimed_at timestamptz,
  created_by text not null default '',
  created_at timestamptz not null default now()
);
create unique index if not exists rider_invitations_workspace_uidx
  on rider_invitations (workspace_user_id);
create unique index if not exists rider_invitations_claimed_by_uidx
  on rider_invitations (claimed_by_user_id) where claimed_by_user_id is not null;

-- Notes and sheets reference their horse. Ownership transfer must therefore
-- check all user references at COMMIT, after the placeholder is removed.
alter table horses drop constraint if exists horses_user_id_fkey;
alter table horses add constraint horses_user_id_fkey
  foreign key (user_id) references "user" ("id") on delete cascade deferrable initially immediate;
alter table ride_notes drop constraint if exists ride_notes_user_id_fkey;
alter table ride_notes add constraint ride_notes_user_id_fkey
  foreign key (user_id) references "user" ("id") on delete cascade deferrable initially immediate;
alter table judge_sheets drop constraint if exists judge_sheets_user_id_fkey;
alter table judge_sheets add constraint judge_sheets_user_id_fkey
  foreign key (user_id) references "user" ("id") on delete cascade deferrable initially immediate;
