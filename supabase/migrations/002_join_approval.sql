-- Join approval. Apply after 001_auth.sql, before deploying this branch.
-- Membership writes are performed only by these checked database functions.

alter table public.plan_members enable row level security;
alter table public.join_requests enable row level security;

revoke insert, update, delete on public.plan_members from public, anon, authenticated;
revoke all on public.join_requests from public, anon, authenticated;
grant select on public.join_requests to authenticated;

drop policy if exists "authenticated join plan" on public.plan_members;
drop policy if exists "read join requests" on public.join_requests;
create policy "read join requests" on public.join_requests
for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (select 1 from public.plans where id = plan_id and creator_id = (select auth.uid()))
);

create unique index if not exists join_requests_unique_user
on public.join_requests(plan_id, user_id) where user_id is not null;

create or replace function public.add_creator_membership(p_plan_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null or not exists (
    select 1 from public.plans where id = p_plan_id and creator_id = v_user
  ) then raise exception 'Not the plan creator'; end if;
  insert into public.plan_members (plan_id, user_id, member_name, role)
  select p_plan_id, v_user, u.name, 'creator' from public.users u where u.id = v_user
  on conflict (plan_id, user_id) where user_id is not null do nothing;
end;
$$;

create or replace function public.request_join(p_plan_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_plan public.plans%rowtype;
  v_request uuid;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  select * into v_plan from public.plans where id = p_plan_id for update;
  if not found or v_plan.status <> 'open' then raise exception 'Plan unavailable'; end if;
  if v_plan.creator_id = v_user then raise exception 'Creator cannot request to join'; end if;
  if exists (select 1 from public.plan_members where plan_id = p_plan_id and user_id = v_user) then
    raise exception 'Already a member';
  end if;
  if (select count(*) from public.plan_members where plan_id = p_plan_id) >= v_plan.max_people then
    raise exception 'Group is full';
  end if;
  insert into public.join_requests (plan_id, user_id, requester_name, status)
  select p_plan_id, v_user, u.name, 'pending' from public.users u where u.id = v_user
  on conflict (plan_id, user_id) where user_id is not null
  do update set status = 'pending', requester_name = excluded.requester_name, created_at = now()
  returning id into v_request;
  if v_request is null then raise exception 'Profile unavailable'; end if;
  return v_request;
end;
$$;

create or replace function public.review_join_request(p_request_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_plan_id uuid;
  v_plan public.plans%rowtype;
  v_request public.join_requests%rowtype;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  select plan_id into v_plan_id from public.join_requests where id = p_request_id;
  if v_plan_id is null then raise exception 'Request unavailable'; end if;
  select * into v_plan from public.plans where id = v_plan_id for update;
  if v_plan.creator_id is distinct from v_user then raise exception 'Not the plan creator'; end if;
  select * into v_request from public.join_requests where id = p_request_id for update;
  if v_request.status is distinct from 'pending' or v_request.user_id is null then
    raise exception 'Request already reviewed or invalid';
  end if;
  if p_approve then
    if v_plan.status <> 'open' then raise exception 'Plan unavailable'; end if;
    if (select count(*) from public.plan_members where plan_id = v_plan_id) >= v_plan.max_people then
      raise exception 'Group is full';
    end if;
    insert into public.plan_members (plan_id, user_id, member_name, role)
    values (v_plan_id, v_request.user_id, v_request.requester_name, 'member');
  end if;
  update public.join_requests set status = case when p_approve then 'approved' else 'rejected' end
  where id = p_request_id;
end;
$$;

revoke all on function public.add_creator_membership(uuid) from public, anon;
revoke all on function public.request_join(uuid) from public, anon;
revoke all on function public.review_join_request(uuid, boolean) from public, anon;
grant execute on function public.add_creator_membership(uuid) to authenticated;
grant execute on function public.request_join(uuid) to authenticated;
grant execute on function public.review_join_request(uuid, boolean) to authenticated;
