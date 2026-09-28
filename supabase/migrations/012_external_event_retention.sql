-- Retain expired imported events for 30 days, then remove only events that
-- have no student-created plans linked to them.
-- Apply after 011_external_events.sql.

-- 011 originally omitted this explicit server-role grant. Keep it here so
-- projects that already applied 011 receive the required importer access.
grant usage on schema public to service_role;
grant select, insert, update on public.external_events to service_role;

create or replace function public.cleanup_expired_external_events()
returns integer
language sql
security definer
set search_path = pg_catalog
as $$
  with deleted as (
    delete from public.external_events as event
    where event.source = 'umn_calendar'
      and event.expires_at < now() - interval '30 days'
      and not exists (
        select 1
        from public.plans as plan
        where plan.external_event_id = event.id
      )
    returning event.id
  )
  select count(*)::integer from deleted;
$$;

revoke all on function public.cleanup_expired_external_events() from public, anon, authenticated;
grant execute on function public.cleanup_expired_external_events() to service_role;
