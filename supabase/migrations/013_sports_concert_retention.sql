-- Extend the existing 30-day cleanup to all imported event sources.
-- Linked events stay available for student-created plan history.
create or replace function public.cleanup_expired_external_events()
returns integer
language sql
security definer
set search_path = pg_catalog
as $$
  with deleted as (
    delete from public.external_events as event
    where event.source in ('umn_calendar', 'ticketmaster')
      and event.expires_at < now() - interval '30 days'
      and not exists (
        select 1 from public.plans as plan
        where plan.external_event_id = event.id
      )
    returning event.id
  )
  select count(*)::integer from deleted;
$$;

revoke all on function public.cleanup_expired_external_events() from public, anon, authenticated;
grant execute on function public.cleanup_expired_external_events() to service_role;
