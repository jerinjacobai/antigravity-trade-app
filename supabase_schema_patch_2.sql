-- PATCH 2: Fix Frontend Errors (Missing Tables/Columns)

-- 1. Fix 'paper_orders': Add missing 'order_type'
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'paper_orders' and column_name = 'order_type') then
    alter table public.paper_orders add column order_type text default 'MARKET';
  end if;
end $$;

-- 2. Create 'risk_state' (Missing Table)
-- Used by Dashboard for Risk Bar and Daily Stats
create table if not exists public.risk_state (
  user_id uuid references auth.users not null,
  date date default CURRENT_DATE,
  pnl numeric default 0.0,
  daily_trades integer default 0,
  max_trades integer default 25,
  max_loss numeric default 2000.0,
  primary key (user_id, date)
);
alter table public.risk_state enable row level security;
drop policy if exists "Users view own risk state" on public.risk_state;
create policy "Users view own risk state" on public.risk_state for select using (auth.uid() = user_id);

-- 3. Auto-Initialize 'paper_wallet' and 'risk_state' for existing users
-- This prevents 406 errors when fetching single rows
insert into public.paper_wallet (user_id, balance)
select id, 100000.00 from auth.users
where id not in (select user_id from public.paper_wallet)
on conflict (user_id) do nothing;

insert into public.risk_state (user_id, date)
select id, CURRENT_DATE from auth.users
where (id, CURRENT_DATE) not in (select user_id, date from public.risk_state)
on conflict (user_id, date) do nothing;

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload config';
