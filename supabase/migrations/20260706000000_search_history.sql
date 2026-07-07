create table if not exists public.search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null,
  type text not null default 'all',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists search_history_user_idx
  on public.search_history(user_id, created_at desc);

alter table public.search_history enable row level security;

drop policy if exists "search_history_manage_own" on public.search_history;
create policy "search_history_manage_own"
  on public.search_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
