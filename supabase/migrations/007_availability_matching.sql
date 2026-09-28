-- Store weekly start-time availability and a precise timestamp for new plans.
-- Old plans keep their free-text start_time and do not receive a guessed timestamp.
alter table public.users
  add column if not exists availability_slots text[] not null default '{}',
  add column if not exists availability_timezone text;

alter table public.plans
  add column if not exists starts_at timestamptz;
