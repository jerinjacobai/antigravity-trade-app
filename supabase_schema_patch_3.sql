-- PATCH 3: Schema Normalization & Retry
-- Resolves "column user_id does not exist" error.

-- 1. Fix 'paper_wallet': Ensure column is named 'user_id', not 'id'
do $$
begin
  -- Check if 'id' exists but 'user_id' does not
  if exists (select 1 from information_schema.columns where table_name = 'paper_wallet' and column_name = 'id') 
     and not exists (select 1 from information_schema.columns where table_name = 'paper_wallet' and column_name = 'user_id') then
     
     alter table public.paper_wallet rename column id to user_id;
     
  end if;
end $$;

-- 2. Drop and Recreate 'risk_state' to match strict definition
drop table if exists public.risk_state;
create table public.risk_state (
  user_id uuid references auth.users not null,
  date date default CURRENT_DATE,
  pnl numeric default 0.0,
  daily_trades integer default 0,
  max_trades integer default 25,
  max_loss numeric default 2000.0,
  primary key (user_id, date)
);
alter table public.risk_state enable row level security;
create policy "Users view own risk state" on public.risk_state for select using (auth.uid() = user_id);

-- 3. Retry Initialization
-- Paper Wallet
insert into public.paper_wallet (user_id, balance)
select id, 100000.00 from auth.users
where id not in (select user_id from public.paper_wallet)
on conflict (user_id) do nothing;

-- Risk State
insert into public.risk_state (user_id, date)
select id, CURRENT_DATE from auth.users
where (id, CURRENT_DATE) not in (select user_id, date from public.risk_state)
on conflict (user_id, date) do nothing;

-- 4. Verify 'paper_orders' column again
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'paper_orders' and column_name = 'order_type') then
    alter table public.paper_orders add column order_type text default 'MARKET';
  end if;
end $$;

-- 5. Reload Schema
NOTIFY pgrst, 'reload config';
