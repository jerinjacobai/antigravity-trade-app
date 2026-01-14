-- RLS FIX PATCH
-- Run this in Supabase SQL Editor to enable Paper Trading & Algo Selection from Frontend

-- 1. Paper Orders (Need INSERT for Manual Trades)
create policy "Users insert own paper orders" on public.paper_orders
    for insert with check (auth.uid() = user_id);

create policy "Users update own paper orders" on public.paper_orders
    for update using (auth.uid() = user_id);

-- 2. Algo State (Need UPDATE to start/stop/select algos from frontend)
create policy "Users update own algo state" on public.algo_state
    for update using (auth.uid() = user_id);

create policy "Users insert own algo state" on public.algo_state
    for insert with check (auth.uid() = user_id);

-- 3. Paper Wallet (Usually managed by backend, but allowing updates from owner)
create policy "Users update own paper wallet" on public.paper_wallet
    for update using (auth.uid() = user_id);

-- 4. Daily State (Global table, needs INSERT for upserts)
create policy "Public insert daily state" on public.daily_state
    for insert with check (auth.role() = 'authenticated');

-- 5. Enable Realtime
-- Note: You received "publication is defined as FOR ALL TABLES", so we skip adding tables explicitly.
-- The tables are already tracked by realtime.
