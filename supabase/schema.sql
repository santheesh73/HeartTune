create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.liked_songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id text not null,
  song_title text not null,
  artist_name text not null,
  album_name text,
  image_url text,
  audio_url text,
  duration text,
  source text not null default 'jiosaavn',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  cover_image text,
  is_public boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.playlist_songs (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.user_playlists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id text not null,
  song_title text not null,
  artist_name text not null,
  album_name text,
  image_url text,
  audio_url text,
  duration text,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.recently_played (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id text not null,
  song_title text not null,
  artist_name text not null,
  album_name text,
  image_url text,
  audio_url text,
  duration text,
  played_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id text not null,
  song_title text not null,
  artist_name text not null,
  album_name text,
  image_url text,
  audio_url text,
  downloaded_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.security_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists liked_songs_user_song_idx
  on public.liked_songs(user_id, song_id);

create unique index if not exists playlist_songs_playlist_song_idx
  on public.playlist_songs(playlist_id, song_id);

create unique index if not exists downloads_user_song_idx
  on public.downloads(user_id, song_id);

alter table public.profiles enable row level security;
alter table public.liked_songs enable row level security;
alter table public.user_playlists enable row level security;
alter table public.playlist_songs enable row level security;
alter table public.recently_played enable row level security;
alter table public.downloads enable row level security;
alter table public.security_logs enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "liked_songs_manage_own" on public.liked_songs;
create policy "liked_songs_manage_own"
  on public.liked_songs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_playlists_select_owner_or_public" on public.user_playlists;
create policy "user_playlists_select_owner_or_public"
  on public.user_playlists for select
  using (is_public = true or auth.uid() = user_id);

drop policy if exists "user_playlists_manage_own" on public.user_playlists;
create policy "user_playlists_manage_own"
  on public.user_playlists for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "playlist_songs_select_owner_or_public" on public.playlist_songs;
create policy "playlist_songs_select_owner_or_public"
  on public.playlist_songs for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.user_playlists playlists
      where playlists.id = playlist_songs.playlist_id
        and (playlists.is_public = true or playlists.user_id = auth.uid())
    )
  );

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

drop policy if exists "recently_played_manage_own" on public.recently_played;
create policy "recently_played_manage_own"
  on public.recently_played for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "downloads_manage_own" on public.downloads;
create policy "downloads_manage_own"
  on public.downloads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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
