create extension if not exists "pgcrypto";

create table if not exists public.security_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;
alter table public.liked_songs enable row level security;
alter table public.user_playlists enable row level security;
alter table public.playlist_songs enable row level security;
alter table public.recently_played enable row level security;
alter table public.downloads enable row level security;
alter table public.security_logs enable row level security;

drop policy if exists "playlist_songs_manage_own" on public.playlist_songs;
create policy "playlist_songs_manage_own"
  on public.playlist_songs for all
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.user_playlists playlists
      where playlists.id = playlist_songs.playlist_id
        and playlists.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.user_playlists playlists
      where playlists.id = playlist_songs.playlist_id
        and playlists.user_id = auth.uid()
    )
  );

drop policy if exists "security_logs_insert_own_or_anonymous" on public.security_logs;
create policy "security_logs_insert_own_or_anonymous"
  on public.security_logs for insert
  with check (user_id is null or auth.uid() = user_id);

drop policy if exists "security_logs_select_admin" on public.security_logs;
create policy "security_logs_select_admin"
  on public.security_logs for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "security_logs_no_client_update" on public.security_logs;
create policy "security_logs_no_client_update"
  on public.security_logs for update
  using (false)
  with check (false);

drop policy if exists "security_logs_no_client_delete" on public.security_logs;
create policy "security_logs_no_client_delete"
  on public.security_logs for delete
  using (false);
