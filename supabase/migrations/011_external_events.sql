-- Imported UMN calendar events and links from student-created companion plans.
-- Apply after 010_plan_management.sql.

create table if not exists public.external_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text not null,
  importer_name text not null default 'CampusDate Event Importer',
  source_name text not null,
  source_url text not null,
  title text not null,
  summary text not null default '',
  organizer_name text,
  location text not null default 'See the UMN event page',
  starts_at timestamptz not null,
  ends_at timestamptz,
  expires_at timestamptz not null,
  timezone text not null default 'America/Chicago',
  is_all_day boolean not null default false,
  status text not null default 'active'
    check (status in ('active', 'canceled', 'expired')),
  categories text[] not null default '{}',
  audiences text[] not null default '{}',
  tags text[] not null default '{}',
  source_modified_at timestamptz,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id)
);

create index if not exists external_events_upcoming_idx
  on public.external_events (source, status, expires_at, starts_at);

alter table public.external_events enable row level security;
grant select on public.external_events to anon, authenticated;
grant select, insert, update on public.external_events to service_role;
revoke insert, update, delete on public.external_events from public, anon, authenticated;

drop policy if exists "public read external events" on public.external_events;
create policy "public read external events"
  on public.external_events for select to anon, authenticated using (true);

alter table public.plans
  add column if not exists external_event_id uuid
  references public.external_events(id) on delete set null;

create index if not exists plans_external_event_idx
  on public.plans (external_event_id)
  where external_event_id is not null;

create unique index if not exists plans_creator_external_event_unique
  on public.plans (creator_id, external_event_id)
  where creator_id is not null and external_event_id is not null;

-- Keep normal student-created plans unchanged while allowing links only to a
-- currently available imported event.
drop policy if exists "authenticated create plans" on public.plans;
create policy "authenticated create plans"
  on public.plans for insert to authenticated
  with check (
    creator_id = (select auth.uid())
    and (
      external_event_id is null
      or exists (
        select 1 from public.external_events event
        where event.id = external_event_id
          and event.status = 'active'
          and event.expires_at > now()
      )
    )
  );
