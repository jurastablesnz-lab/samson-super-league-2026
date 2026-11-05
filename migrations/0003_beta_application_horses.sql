-- Multiple horses per beta application (1–6), stored as a JSON array of
-- { name, level, notes }. Nullable: older applications keep only the legacy
-- free-text `horses` column and are displayed as a single horse.
-- `horses` stays populated (a readable summary) for backward compatibility.
alter table beta_applications add column if not exists horse_list jsonb;
