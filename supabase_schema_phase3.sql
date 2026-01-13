-- PHASE 5: Audit Logs (Live Trading)

-- Unified Order Book (Live)
-- Tracks orders sent to the broker.
create table if not exists public.trade_orders (
  order_id text not null primary key, -- Use Broker Order ID if available, else UUID
  user_id uuid references auth.users not null,
  
  -- Instrument
  symbol text not null,
  transaction_type text not null, -- BUY / SELL
  
  -- Details
  quantity integer not null,
  order_type text not null, -- MARKET, LIMIT
  price numeric, -- Limit Price
  trigger_price numeric,
  
  -- State
  status text not null, -- PENDING, OPEN, FILLED, REJECTED, CANCELLED
  filled_quantity integer default 0,
  average_price numeric default 0.0,
  
  -- Metadata
  algo_name text,
  broker_order_id text, -- Upstox Order ID
  reason text, -- "Entry Signal", "Stop Loss", "Target"
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Executions (Fills)
-- Tracks individual fills (partial or full) for reconciliation.
create table if not exists public.trade_executions (
  execution_id uuid default gen_random_uuid() primary key,
  order_id text references public.trade_orders(order_id),
  user_id uuid references auth.users not null,
  
  symbol text not null,
  quantity integer not null,
  price numeric not null,
  side text not null, -- BUY / SELL
  
  executed_at timestamptz default now(),
  broker_trade_id text -- Upstox Trade ID
);

-- RLS
alter table public.trade_orders enable row level security;
alter table public.trade_executions enable row level security;

create policy "Users can view own orders" on public.trade_orders for select using (auth.uid() = user_id);
create policy "Users can view own executions" on public.trade_executions for select using (auth.uid() = user_id);

-- Note: In a real system, only the worker (service role) should insert/update these. 
-- For V1 demo with user-driven keys, we might allow user insert if using client-side execution (not recommended)
-- We assume backend worker uses SERVICE_ROLE_KEY.
