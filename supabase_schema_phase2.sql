create table if not exists public.user_credentials (
  user_id uuid references auth.users not null primary key,
  upstox_api_key text,
  upstox_api_secret text,
  is_paper_trading boolean default true,
  updated_at timestamptz default now()
);

alter table public.user_credentials enable row level security;

create policy "Users can view own credentials" 
on public.user_credentials for select 
using (auth.uid() = user_id);

create policy "Users can insert own credentials" 
on public.user_credentials for insert 
with check (auth.uid() = user_id);

create policy "Users can update own credentials" 
on public.user_credentials for update
using (auth.uid() = user_id);
