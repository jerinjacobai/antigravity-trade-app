-- Enable Realtime
drop publication if exists supabase_realtime;
create publication supabase_realtime for all tables;

-- 1. Algo Daily State
create table public.daily_state (
  id bigint primary key generated always as identity,
  date date not null unique default current_date,
  algo_name text,
  is_locked boolean default false,
  is_running boolean default false,
  upstox_token text,
  created_at timestamptz default now()
);

-- 2. Trade Logs
create table public.trade_logs (
  id bigint primary key generated always as identity,
  timestamp timestamptz default now(),
  level text default 'INFO',
  message text,
  metadata jsonb
);

-- 3. Orders
create table public.orders (
  order_id text primary key,
  symbol text not null,
  quantity int not null,
  side text not null,
  price numeric,
  status text default 'PENDING',
  fill_price numeric,
  timestamp timestamptz default now()
);

-- 4. Risk State
create table public.risk_state (
  id bigint primary key generated always as identity,
  date date not null unique default current_date,
  daily_trades int default 0,
  max_trades int default 25,
  current_pnl numeric default 0.0,
  updated_at timestamptz default now()
);

-- Zero Row Initialization for State
insert into public.risk_state (date, daily_trades, max_trades, current_pnl)
values (current_date, 0, 25, 0.0)
on conflict (date) do nothing;

insert into public.daily_state (date, is_locked, is_running)
values (current_date, false, false)
on conflict (date) do nothing;
