-- PHASE 4: v3.1 Critical Safeguards
-- Run this in Supabase SQL Editor

-- 1. Algo State & Locking
create table if not exists public.algo_state (
    user_id uuid references auth.users not null,
    trade_date date default current_date not null,
    selected_algo text not null, -- 'VPMS', 'ITR', 'ORB-S', 'OBSERVE'
    mode text not null check (mode in ('paper', 'live')),
    status text not null default 'idle' check (status in ('idle', 'running', 'halted', 'completed', 'error')),
    locked_at timestamptz default now(),
    last_heartbeat timestamptz,
    
    primary key (user_id, trade_date)
);

-- 2. System Events (Errors, Halts, Warnings)
create table if not exists public.system_events (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users,
    timestamp timestamptz default now(),
    level text not null check (level in ('INFO', 'WARN', 'ERROR', 'CRITICAL')),
    event_type text not null, -- 'RISK_HALT', 'BROKER_ERROR', 'ALGO_LOCK', etc.
    message text,
    metadata jsonb
);

-- 3. Trade Orders (Sent to Broker)
create table if not exists public.trade_orders (
    order_id text primary key, -- Local ID or Broker ID
    user_id uuid references auth.users not null,
    algo_name text not null,
    symbol text not null,
    transaction_type text not null, -- BUY/SELL
    quantity int not null,
    price numeric,
    trigger_price numeric,
    product text, -- 'I' (Intraday)
    order_type text, -- LIMIT, SL, MKT
    status text, -- PENDING, OPEN, COMPLETE, CANCELLED, REJECTED
    broker_order_id text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 4. Trade Executions (Fills)
create table if not exists public.trade_executions (
    execution_id text primary key, -- Unqiue fill ID from broker
    order_id text references public.trade_orders(order_id),
    user_id uuid references auth.users not null,
    symbol text not null,
    quantity int not null,
    price numeric not null,
    execution_ts timestamptz not null
);

-- RLS Policies
alter table public.algo_state enable row level security;
alter table public.system_events enable row level security;
alter table public.trade_orders enable row level security;
alter table public.trade_executions enable row level security;

-- Simple "User owns data" policies
create policy "Users manage own algo state" on public.algo_state for all using (auth.uid() = user_id);
create policy "Users view own events" on public.system_events for select using (auth.uid() = user_id);
create policy "Users insert own events" on public.system_events for insert with check (auth.uid() = user_id); -- Worker writes as user
create policy "Users view own orders" on public.trade_orders for all using (auth.uid() = user_id);
create policy "Users view own executions" on public.trade_executions for all using (auth.uid() = user_id);
