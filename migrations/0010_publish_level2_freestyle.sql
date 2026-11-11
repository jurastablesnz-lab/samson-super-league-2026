-- Publish the Level 2 musical freestyle so a Level 2 horse can load the MFS
-- sheet without an admin account. Additive only.
insert into test_approvals (test_id, approved_by)
values ('mfs', 'susan@manawa.tech')
on conflict (test_id) do nothing;
