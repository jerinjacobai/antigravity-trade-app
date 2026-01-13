-- QUANTMIND V3.1 - COMPLETE SCHEMA (Idempotent)
-- Run this to ensure all tables exist. Safely handles existing objects.

-- 1. USER PROFILES (Phase 3)
create table if not exists public.user_profiles (
  user_id uuid references auth.users primary key,
  upstox_access_token text,
  token_expiry timestamptz,
  trading_enabled boolean default false,
  max_loss_limit numeric default 1000,
  max_trades_limit integer default 3,
  kill_switch_active boolean default false,
  last_login timestamptz
);
alter table public.user_profiles enable row level security;
drop policy if exists "Users manage own profile" on public.user_profiles;
create policy "Users manage own profile" on public.user_profiles for all using (auth.uid() = user_id);

-- 2. ALGO STATE & LOCKS (Phase 4)
create table if not exists public.algo_state (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  trade_date date default CURRENT_DATE,
  selected_algo text not null,
  mode text default 'paper', -- 'paper' or 'live'
  status text default 'idle', -- 'running', 'stopped'
  kill_switch_triggered boolean default false,
  locked_at timestamptz default now()
);
alter table public.algo_state enable row level security;
drop policy if exists "Users view own algo state" on public.algo_state;
create policy "Users view own algo state" on public.algo_state for select using (auth.uid() = user_id);

-- 3. SYSTEM EVENTS / LOGS (Phase 4)
create table if not exists public.system_events (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  event_type text not null, -- STARTUP, SHUTDOWN, HEARTBEAT, CRASH
  component text,
  severity text, -- INFO, WARN, CRITICAL
  message text,
  metadata jsonb
);
-- Worker (Service Role) writes to this. Users might read.
alter table public.system_events enable row level security;
drop policy if exists "Public read system events" on public.system_events;
create policy "Public read system events" on public.system_events for select to authenticated using (true);

-- 4. PAPER TRADING (Phase 6)
create table if not exists public.paper_wallet (
  user_id uuid references auth.users primary key,
  balance numeric default 1000000.00,
  reset_count integer default 0,
  updated_at timestamptz default now()
);
alter table public.paper_wallet enable row level security;
drop policy if exists "Users view own wallet" on public.paper_wallet;
create policy "Users view own wallet" on public.paper_wallet for select using (auth.uid() = user_id);

create table if not exists public.paper_orders (
  order_id text not null primary key,
  user_id uuid references auth.users not null,
  symbol text not null,
  transaction_type text not null, -- BUY/SELL
  quantity integer not null,
  price numeric not null,
  status text not null, -- PENDING, FILLED, REJECTED
  algo_name text,
  filled_at timestamptz,
  created_at timestamptz default now()
);
alter table public.paper_orders enable row level security;
drop policy if exists "Users view own paper orders" on public.paper_orders;
create policy "Users view own paper orders" on public.paper_orders for select using (auth.uid() = user_id);

-- 5. LIVE TRADING AUDIT (Phase 5)
create table if not exists public.trade_orders (
  order_id text not null primary key,
  user_id uuid references auth.users not null,
  symbol text not null,
  transaction_type text not null,
  quantity integer not null,
  order_type text not null,
  price numeric,
  trigger_price numeric,
  status text not null,
  filled_quantity integer default 0,
  average_price numeric default 0.0,
  algo_name text,
  broker_order_id text,
  reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.trade_orders enable row level security;
drop policy if exists "Users view own live orders" on public.trade_orders;
create policy "Users view own live orders" on public.trade_orders for select using (auth.uid() = user_id);

create table if not exists public.trade_executions (
  execution_id uuid default gen_random_uuid() primary key,
  order_id text references public.trade_orders(order_id),
  user_id uuid references auth.users not null,
  symbol text not null,
  quantity integer not null,
  price numeric not null,
  side text not null,
  executed_at timestamptz default now(),
  broker_trade_id text
);
alter table public.trade_executions enable row level security;
drop policy if exists "Users view own executions" on public.trade_executions;
create policy "Users view own executions" on public.trade_executions for select using (auth.uid() = user_id);

-- Support Table for V1 API (Legacy fallback)
create table if not exists public.daily_state (
  date date primary key,
  algo_name text,
  is_locked boolean default false,
  is_running boolean default false,
  upstox_token text
);
alter table public.daily_state enable row level security;
drop policy if exists "Public read daily state" on public.daily_state;
drop policy if exists "Public update daily state" on public.daily_state;
create policy "Public read daily state" on public.daily_state for select to authenticated using (true);
create policy "Public update daily state" on public.daily_state for update to authenticated using (true);
