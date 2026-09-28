-- Group chat. Apply after 002_join_approval.sql, before deploying this branch.
create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  sender_id uuid not null,
  sender_name text not null,
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists group_messages_plan_time
on public.group_messages(plan_id, created_at desc);

alter table public.group_messages enable row level security;
revoke all on public.group_messages from public, anon, authenticated;
grant select on public.group_messages to authenticated;

drop policy if exists "confirmed members read messages" on public.group_messages;
create policy "confirmed members read messages" on public.group_messages
for select to authenticated
using (exists (
  select 1 from public.plan_members pm
  where pm.plan_id = group_messages.plan_id
    and pm.user_id = (select auth.uid())
    and pm.status = 'confirmed'
));

create or replace function public.send_group_message(p_plan_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_name text;
  v_message_id uuid;
  v_body text := trim(p_body);
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  if v_body is null or length(v_body) not between 1 and 2000 then
    raise exception 'Message must be between 1 and 2000 characters';
  end if;

  select pm.member_name into v_name from public.plan_members pm
  where pm.plan_id = p_plan_id and pm.user_id = v_user and pm.status = 'confirmed';
  if v_name is null then raise exception 'Only confirmed members can send messages'; end if;

  insert into public.group_messages (plan_id, sender_id, sender_name, body)
  values (p_plan_id, v_user, v_name, v_body)
  returning id into v_message_id;
  return v_message_id;
end;
$$;

revoke all on function public.send_group_message(uuid, text) from public, anon;
grant execute on function public.send_group_message(uuid, text) to authenticated;

-- Supabase Realtime pushes new messages; the client also refreshes periodically.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public' and tablename = 'group_messages'
     ) then
    alter publication supabase_realtime add table public.group_messages;
  end if;
end;
$$;
