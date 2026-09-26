create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key,
  name text not null,
  email text not null unique,
  major text,
  year text,
  interests text[] default '{}',
  courses text[] default '{}',
  preferred_group_size integer,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid,
  creator_name text not null,
  title text not null,
  description text not null,
  category text not null,
  location text not null,
  start_time text not null,
  duration text default 'Flexible',
  max_people integer not null default 4,
  status text not null default 'open',
  created_at timestamptz default now()
);

create table if not exists public.plan_members (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid,
  member_name text not null,
  role text not null default 'member',
  status text not null default 'confirmed',
  joined_at timestamptz default now()
);

create table if not exists public.join_requests (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid,
  requester_name text not null,
  status text not null default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid,
  user_name text not null,
  score integer not null check (score >= 0 and score <= 100),
  reasons jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null unique references public.plans(id) on delete cascade,
  ai_plan jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);