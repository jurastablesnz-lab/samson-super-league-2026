-- The dressage test (2A, 2B, 2C, MFS, …) when it is known.
-- Empty means the class number has not been tagged yet.
alter table results add column if not exists dressage_test text not null default '';
