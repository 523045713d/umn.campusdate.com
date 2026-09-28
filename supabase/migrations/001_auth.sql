-- Phase 1.1.3: Supabase Auth + user-scoped writes
-- Run this in the Supabase SQL Editor before testing the auth branch.

grant usage on schema public to anon, authenticated;

grant select on public.plans to anon, authenticated;
grant insert on public.plans to authenticated;

grant select on public.plan_members to anon, authenticated;
grant insert on public.plan_members to authenticated;

grant select, update on public.users to authenticated;

grant select on public.matches to anon, authenticated;
grant select on public.groups to anon, authenticated;

revoke insert on public.plans from anon;
revoke insert on public.plan_members from anon;

drop policy if exists "public read plans" on public.plans;
create policy "read open plans"
on public.plans
for select
to anon, authenticated
using (true);

drop policy if exists "public insert plans" on public.plans;
create policy "authenticated create plans"
on public.plans
for insert
to authenticated
with check (creator_id = auth.uid());

drop policy if exists "public read plan members" on public.plan_members;
create policy "read plan members"
on public.plan_members
for select
to anon, authenticated
using (true);

drop policy if exists "public insert plan members" on public.plan_members;
create policy "authenticated join plan"
on public.plan_members
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "public read matches" on public.matches;
create policy "read matches"
on public.matches
for select
to anon, authenticated
using (true);

drop policy if exists "public read groups" on public.groups;
create policy "read groups"
on public.groups
for select
to anon, authenticated
using (true);

drop policy if exists "read own profile" on public.users;
create policy "read own profile"
on public.users
for select
to authenticated
using (id = auth.uid());

drop policy if exists "update own profile" on public.users;
create policy "update own profile"
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create unique index if not exists plan_members_unique_user
on public.plan_members(plan_id, user_id)
where user_id is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
