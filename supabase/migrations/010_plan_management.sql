-- Creator plan deletion and admin role management. Apply after 009_others_category.sql.
alter table public.users
  add column if not exists role text not null default 'student';

alter table public.users
  add constraint users_role_check check (role in ('student', 'admin'));

-- Migration 001 granted UPDATE on every profile column. Replace it with a
-- whitelist so a signed-in user cannot promote themselves through PostgREST.
revoke update on public.users from public, anon, authenticated;
grant update (name, major, year, interests, courses, preferred_group_size,
  avatar_url, availability_slots, availability_timezone) on public.users to authenticated;

create or replace function public.admin_list_users()
returns table (id uuid, name text, email text, role text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin') then
    raise exception 'Administrator access required';
  end if;
  return query select u.id, u.name, u.email, u.role, u.created_at
    from public.users u order by u.created_at desc, u.id;
end;
$$;

create or replace function public.admin_list_plans()
returns table (id uuid, title text, creator_name text, category text, status text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin') then
    raise exception 'Administrator access required';
  end if;
  return query select p.id, p.title, p.creator_name, p.category, p.status, p.created_at
    from public.plans p order by p.created_at desc, p.id;
end;
$$;

create or replace function public.admin_set_user_role(p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin') then
    raise exception 'Administrator access required';
  end if;
  if p_role is null or p_role not in ('student', 'admin') then
    raise exception 'Invalid role';
  end if;
  if p_user_id = auth.uid() and p_role <> 'admin' then
    raise exception 'You cannot remove your own administrator role';
  end if;
  update public.users set role = p_role where id = p_user_id;
  if not found then raise exception 'User not found'; end if;
end;
$$;

create or replace function public.delete_plan(p_plan_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_creator uuid;
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  select p.creator_id into v_creator from public.plans p where p.id = p_plan_id for update;
  if not found then raise exception 'Plan not found'; end if;
  if v_creator is distinct from v_user
     and not exists (select 1 from public.users u where u.id = v_user and u.role = 'admin') then
    raise exception 'Only the creator or an administrator can delete this plan';
  end if;
  delete from public.plans where id = p_plan_id;
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.admin_list_plans() from public, anon;
revoke all on function public.admin_set_user_role(uuid, text) from public, anon;
revoke all on function public.delete_plan(uuid) from public, anon;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_list_plans() to authenticated;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;
grant execute on function public.delete_plan(uuid) to authenticated;
