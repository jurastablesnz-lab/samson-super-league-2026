-- Optional barn name. The caller says this when it is set. Results keep `name`.
alter table horses add column if not exists paddock_name text not null default '';
