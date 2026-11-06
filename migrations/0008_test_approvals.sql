-- Which registry tests an admin has published.
--
-- The test sheets themselves stay in code. A row here means that test id is
-- visible to riders. Anything not listed is a draft, including tests added to
-- the registry later. Seeded rows are the tests Susan has already signed off:
-- ESNZ Novice 2A, 2B and 2C, and Medium 4A.
-- Additive only.

create table if not exists test_approvals (
  test_id text primary key,
  approved_by text not null,
  approved_at timestamptz not null default now()
);

insert into test_approvals (test_id, approved_by)
values
  ('2a', 'susan@manawa.tech'),
  ('2b', 'susan@manawa.tech'),
  ('2c', 'susan@manawa.tech'),
  ('4a', 'susan@manawa.tech')
on conflict (test_id) do nothing;
