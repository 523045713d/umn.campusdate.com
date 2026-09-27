-- In-app notifications for join requests, decisions, and new group messages.
-- Apply after 007_availability_matching.sql.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete cascade,
  kind text not null check (kind in ('join_request', 'join_approved', 'join_declined', 'group_message')),
  actor_name text not null,
  plan_title text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_recipient_time
on public.notifications(recipient_id, created_at desc);

alter table public.notifications enable row level security;
revoke all on public.notifications from public, anon, authenticated;
grant select on public.notifications to authenticated;

create policy "read own notifications" on public.notifications
for select to authenticated using (recipient_id = (select auth.uid()));

create or replace function public.mark_notification_read(p_notification_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id and recipient_id = auth.uid();
end;
$$;
revoke all on function public.mark_notification_read(uuid) from public, anon;
grant execute on function public.mark_notification_read(uuid) to authenticated;

create or replace function public.notify_join_request_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_creator uuid;
  v_title text;
begin
  select creator_id, title into v_creator, v_title
  from public.plans where id = new.plan_id;

  if tg_op = 'INSERT' then
    if new.status <> 'pending' then return new; end if;
    if v_creator is not null and v_creator is distinct from new.user_id then
      insert into public.notifications (recipient_id, plan_id, kind, actor_name, plan_title)
      values (v_creator, new.plan_id, 'join_request', new.requester_name, v_title);
    end if;
  elsif old.status is distinct from new.status then
    if new.status = 'pending' and v_creator is not null and v_creator is distinct from new.user_id then
      insert into public.notifications (recipient_id, plan_id, kind, actor_name, plan_title)
      values (v_creator, new.plan_id, 'join_request', new.requester_name, v_title);
    elsif new.status in ('approved', 'rejected') and new.user_id is not null then
      insert into public.notifications (recipient_id, plan_id, kind, actor_name, plan_title)
      values (new.user_id, new.plan_id,
        case when new.status = 'approved' then 'join_approved' else 'join_declined' end,
        coalesce((select name from public.users where id = v_creator), 'Plan creator'), v_title);
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.notify_join_request_change() from public, anon, authenticated;

drop trigger if exists notify_join_request_change on public.join_requests;
create trigger notify_join_request_change
after insert or update of status on public.join_requests
for each row execute function public.notify_join_request_change();

create or replace function public.notify_group_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (recipient_id, plan_id, kind, actor_name, plan_title)
  select pm.user_id, new.plan_id, 'group_message', new.sender_name, p.title
  from public.plan_members pm
  join public.plans p on p.id = new.plan_id
  where pm.plan_id = new.plan_id and pm.status = 'confirmed'
    and pm.user_id is not null and pm.user_id <> new.sender_id;
  return new;
end;
$$;
revoke all on function public.notify_group_message() from public, anon, authenticated;

drop trigger if exists notify_group_message on public.group_messages;
create trigger notify_group_message
after insert on public.group_messages
for each row execute function public.notify_group_message();

-- Realtime for signed-in recipients, with periodic client refresh as a fallback.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public' and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
