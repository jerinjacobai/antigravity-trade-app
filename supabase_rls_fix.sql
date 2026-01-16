-- RLS FIX PATCH
-- Run this in Supabase SQL Editor to enable Paper Trading & Algo Selection from Frontend

-- 1. Paper Orders (Need INSERT for Manual Trades)
-- 1. Paper Orders
drop policy if exists "Users insert own paper orders" on public.paper_orders;
create policy "Users insert own paper orders" on public.paper_orders
    for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own paper orders" on public.paper_orders;
create policy "Users update own paper orders" on public.paper_orders
    for update using (auth.uid() = user_id);

-- 2. Algo State
drop policy if exists "Users update own algo state" on public.algo_state;
create policy "Users update own algo state" on public.algo_state
    for update using (auth.uid() = user_id);

drop policy if exists "Users insert own algo state" on public.algo_state;
create policy "Users insert own algo state" on public.algo_state
    for insert with check (auth.uid() = user_id);

-- 3. Paper Wallet
drop policy if exists "Users update own paper wallet" on public.paper_wallet;
create policy "Users update own paper wallet" on public.paper_wallet
    for update using (auth.uid() = user_id);

-- 4. Daily State
drop policy if exists "Public insert daily state" on public.daily_state;
create policy "Public insert daily state" on public.daily_state
    for insert with check (auth.role() = 'authenticated');

-- 5. Enable Realtime
-- Note: You received "publication is defined as FOR ALL TABLES", so we skip adding tables explicitly.
-- The tables are already tracked by realtime.
