-- Shared AI plan. Apply after 003_group_chat.sql, before deploying this branch.
alter table public.groups enable row level security;
revoke all on public.groups from public, anon, authenticated;
grant select on public.groups to authenticated;

drop policy if exists "read groups" on public.groups;
drop policy if exists "confirmed members read group plans" on public.groups;
create policy "confirmed members read group plans" on public.groups
for select to authenticated
using (exists (
  select 1 from public.plan_members pm
  where pm.plan_id = groups.plan_id
    and pm.user_id = (select auth.uid())
    and pm.status = 'confirmed'
));

create or replace function public.save_group_ai_plan(p_plan_id uuid, p_ai_plan jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_existing jsonb;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  perform 1 from public.plans p where p.id = p_plan_id and p.creator_id = v_user for update;
  if not found then raise exception 'Only the creator can generate the group plan'; end if;
  if not exists (select 1 from public.plan_members pm
    where pm.plan_id = p_plan_id and pm.user_id = v_user and pm.status = 'confirmed') then
    raise exception 'Confirmed membership required';
  end if;
  if p_ai_plan is null or jsonb_typeof(p_ai_plan) <> 'object'
     or not p_ai_plan ? 'agenda' then raise exception 'Invalid plan'; end if;

  select ai_plan into v_existing from public.groups where plan_id = p_plan_id;
  if v_existing is not null and v_existing <> '{}'::jsonb then
    raise exception 'Group plan already exists';
  end if;
  insert into public.groups (plan_id, ai_plan) values (p_plan_id, p_ai_plan)
  on conflict (plan_id) do update set ai_plan = excluded.ai_plan;
end;
$$;

revoke all on function public.save_group_ai_plan(uuid, jsonb) from public, anon;
grant execute on function public.save_group_ai_plan(uuid, jsonb) to authenticated;
