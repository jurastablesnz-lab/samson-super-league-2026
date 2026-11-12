-- Private rider files (videos, freestyle music, floor plans) stored in R2.
-- The bytes are not in this table. object_key is the R2 object, owned by user_id.
-- Additive only.

create table if not exists media_objects (
  id text primary key,
  user_id text not null references "user" ("id") on delete cascade,
  horse_id text references horses ("id") on delete set null,
  kind text not null check (kind in ('video', 'music', 'floorplan')),
  object_key text not null unique,
  file_name text not null default '',
  mime text not null default '',
  byte_size bigint not null default 0,
  status text not null default 'pending' check (status in ('pending', 'ready')),
  upload_id text not null default '',
  part_size integer not null default 8388608,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists media_objects_user_idx on media_objects (user_id, status);
