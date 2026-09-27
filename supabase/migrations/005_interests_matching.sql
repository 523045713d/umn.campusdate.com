-- Explicit interest tags for activity matching. Existing plans use the empty array
-- and continue to match interests found in their title, description, or category.
alter table public.plans
  add column if not exists interests text[] not null default '{}';
