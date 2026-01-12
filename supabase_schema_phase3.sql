-- PHASE 3 MIGRATION: User Profiles & Trading Limits
-- Run this in Supabase SQL Editor

create table if not exists public.user_profiles (
  user_id uuid references auth.users not null primary key,
  
  -- Upstox Auth (Tokens should be handled with care)
  upstox_access_token text,
  upstox_refresh_token text,
  token_expiry timestamptz,
  
  -- Trading Preferences
  is_paper_trading boolean default true,
  trading_enabled boolean default false,
  kill_switch_active boolean default false,
  
  -- Risk Limits
  max_loss_limit numeric default 1000.0,
  max_trades_limit integer default 3,
  
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.user_profiles enable row level security;

-- Policies
create policy "Users can view own profile" 
on public.user_profiles for select 
using (auth.uid() = user_id);

create policy "Users can update own profile" 
on public.user_profiles for update
using (auth.uid() = user_id);

create policy "Users can insert own profile" 
on public.user_profiles for insert 
with check (auth.uid() = user_id);

-- Trigger to create profile on signup (Optional but recommended)
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.user_profiles (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
