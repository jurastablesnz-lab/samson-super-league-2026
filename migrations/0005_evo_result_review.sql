-- EVO Events results arrive as suggestions for the rider to review.
--
-- Existing rows stay visible as kept results. Pending and rejected rows retain
-- the same horse/dedupe_key identity, so re-importing a CSV never re-suggests a
-- score the rider has already kept or rejected.
--
-- Additive only: no table, column, index or existing result is removed.

alter table results
  add column if not exists review_status text not null default 'kept';

alter table results
  add column if not exists rider_name text not null default '';

alter table results
  add constraint results_review_status_check
  check (review_status in ('pending', 'kept', 'rejected'));

create index if not exists results_horse_review_idx
  on results (horse_id, user_id, review_status);
