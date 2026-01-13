-- PATCH: Fix Missing Columns in Existing Tables
-- Run this if you see errors like "Could not find column..."

-- 1. system_events: Add 'component' if missing
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'system_events' and column_name = 'component') then
    alter table public.system_events add column component text;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'system_events' and column_name = 'metadata') then
    alter table public.system_events add column metadata jsonb;
  end if;
end $$;

-- 2. user_profiles: Ensure new flags exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'user_profiles' and column_name = 'kill_switch_active') then
    alter table public.user_profiles add column kill_switch_active boolean default false;
  end if;
  
   if not exists (select 1 from information_schema.columns where table_name = 'user_profiles' and column_name = 'max_loss_limit') then
    alter table public.user_profiles add column max_loss_limit numeric default 1000;
  end if;
end $$;

-- 3. Reload Schema Cache (Notify PostgREST)
NOTIFY pgrst, 'reload config';
