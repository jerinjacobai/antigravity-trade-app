-- PHASE 6: Institutional Paper Trading
-- Run this in Supabase SQL Editor

-- 1. Virtual Wallet
create table if not exists public.paper_wallet (
    user_id uuid references auth.users not null primary key,
    starting_capital numeric default 100000.0,
    available_balance numeric default 100000.0,
    used_margin numeric default 0.0,
    realized_pnl numeric default 0.0,
    unrealized_pnl numeric default 0.0,
    last_reset_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 2. Paper Orders (Mirrors trade_orders)
create table if not exists public.paper_orders (
    order_id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    algo_name text, -- 'MANUAL' or Algo Name
    symbol text not null,
    transaction_type text not null, -- BUY/SELL
    quantity int not null,
    price numeric, -- Limit Price
    trigger_price numeric,
    product text default 'I',
    order_type text not null, -- LIMIT, MKT, SL
    status text, -- PENDING, FILLED, REJECTED, CANCELLED
    average_price numeric, -- Filled Price
    filled_quantity int default 0,
    message text, -- Rejection reason etc.
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 3. Paper Executions (Mirrors trade_executions)
create table if not exists public.paper_executions (
    execution_id uuid default gen_random_uuid() primary key,
    order_id uuid references public.paper_orders(order_id),
    user_id uuid references auth.users not null,
    symbol text not null,
    quantity int not null,
    price numeric not null,
    side text not null, -- BUY/SELL
    execution_ts timestamptz default now()
);

-- 4. Paper Positions
create table if not exists public.paper_positions (
    position_id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    symbol text not null,
    quantity int not null, -- Net Qty (+ve for Long, -ve for Short)
    average_price numeric not null,
    ltp numeric, -- Last known price for PnL calc
    pnl numeric default 0.0,
    status text default 'OPEN', -- OPEN, CLOSED
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 5. Paper Trade Journal (Analytics)
create table if not exists public.paper_trade_journal (
    journal_id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    symbol text not null,
    entry_time timestamptz not null,
    exit_time timestamptz,
    entry_price numeric not null,
    exit_price numeric,
    quantity int not null,
    pnl numeric,
    algo_name text, -- 'MANUAL' or Algo ID
    reason text, -- 'SL HIT', 'TARGET HIT', 'MANUAL EXIT'
    created_at timestamptz default now()
);

-- RLS Policies
alter table public.paper_wallet enable row level security;
alter table public.paper_orders enable row level security;
alter table public.paper_executions enable row level security;
alter table public.paper_positions enable row level security;
alter table public.paper_trade_journal enable row level security;

-- Policies
create policy "Users manage own paper wallet" on public.paper_wallet for all using (auth.uid() = user_id);
create policy "Users manage own paper orders" on public.paper_orders for all using (auth.uid() = user_id);
create policy "Users manage own paper executions" on public.paper_executions for all using (auth.uid() = user_id);
create policy "Users manage own paper positions" on public.paper_positions for all using (auth.uid() = user_id);
create policy "Users manage own paper journal" on public.paper_trade_journal for all using (auth.uid() = user_id);

-- Trigger to create wallet on signup (Updates existing handle_new_user if needed, or separate)
-- For now, we assume wallet is created on demand or we add to handle_new_user manually.
create or replace function public.create_paper_wallet() 
returns trigger as $$
begin
  insert into public.paper_wallet (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Add to existing trigger or create new one? 
-- Simplest is to just insert if not exists on frontend load, or add another trigger.
-- Adding a separate trigger for cleanliness.
create trigger on_auth_user_created_paper
  after insert on auth.users
  for each row execute procedure public.create_paper_wallet();
