-- Explicit course codes for activity matching. Existing plans retain text fallback.
alter table public.plans
  add column if not exists courses text[] not null default '{}';
