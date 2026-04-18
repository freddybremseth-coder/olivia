-- Olivia Farm OS – Migration 003: user profiles to back Supabase Auth
-- Run this in Supabase SQL editor.
-- Safe to re-run.

-- Profile rows keyed by auth.users.id; created automatically on signup via trigger.
create table if not exists user_profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text not null,
  name                text not null default '',
  role                text not null default 'farmer',          -- 'farmer' | 'super_admin'
  subscription        text not null default 'trial',           -- 'trial'|'monthly'|'annual'|'lifetime'
  subscription_start  text not null default to_char(now(), 'YYYY-MM-DD'),
  avatar              text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
create index if not exists user_profiles_email_idx on user_profiles(email);

alter table user_profiles enable row level security;

-- Each user can read + update their own profile; super_admins can read all.
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'user_profiles' and policyname = 'self read') then
    create policy "self read" on user_profiles for select
      using (auth.uid() = id or exists (
        select 1 from user_profiles p where p.id = auth.uid() and p.role = 'super_admin'
      ));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_profiles' and policyname = 'self update') then
    create policy "self update" on user_profiles for update
      using (auth.uid() = id) with check (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_profiles' and policyname = 'self insert') then
    -- Inserts happen via the trigger below (security definer), but the policy
    -- is needed in case a client ever upserts.
    create policy "self insert" on user_profiles for insert
      with check (auth.uid() = id);
  end if;
end $$;

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, name, role, avatar)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'farmer'),
    coalesce(
      new.raw_user_meta_data->>'avatar',
      'https://ui-avatars.com/api/?name=' ||
        replace(coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), ' ', '+') ||
        '&background=22c55e&color=000&size=256'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Bump updated_at on profile changes
drop trigger if exists user_profiles_set_updated_at on user_profiles;
create trigger user_profiles_set_updated_at before update on user_profiles
  for each row execute function set_updated_at();
