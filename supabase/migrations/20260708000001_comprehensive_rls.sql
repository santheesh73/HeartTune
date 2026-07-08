-- COMPREHENSIVE SECURITY HARDENING FOR RLS
-- This migration ensures that ALL user-data tables have strictly enforced Row Level Security
-- and explicitly denies access to anyone except the authenticated owner of the data.

-- 1. PROFILES
alter table public.profiles enable row level security;
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

-- 2. LIKED SONGS
alter table public.liked_songs enable row level security;
drop policy if exists "liked_songs_select_own" on public.liked_songs;
create policy "liked_songs_select_own" on public.liked_songs for select using (auth.uid() = user_id);
drop policy if exists "liked_songs_insert_own" on public.liked_songs;
create policy "liked_songs_insert_own" on public.liked_songs for insert with check (auth.uid() = user_id);
drop policy if exists "liked_songs_delete_own" on public.liked_songs;
create policy "liked_songs_delete_own" on public.liked_songs for delete using (auth.uid() = user_id);

-- 3. LIKED ALBUMS
alter table public.liked_albums enable row level security;
drop policy if exists "liked_albums_select_own" on public.liked_albums;
create policy "liked_albums_select_own" on public.liked_albums for select using (auth.uid() = user_id);
drop policy if exists "liked_albums_insert_own" on public.liked_albums;
create policy "liked_albums_insert_own" on public.liked_albums for insert with check (auth.uid() = user_id);
drop policy if exists "liked_albums_delete_own" on public.liked_albums;
create policy "liked_albums_delete_own" on public.liked_albums for delete using (auth.uid() = user_id);

-- 4. DOWNLOADS
alter table public.downloads enable row level security;
drop policy if exists "downloads_select_own" on public.downloads;
create policy "downloads_select_own" on public.downloads for select using (auth.uid() = user_id);
drop policy if exists "downloads_insert_own" on public.downloads;
create policy "downloads_insert_own" on public.downloads for insert with check (auth.uid() = user_id);
drop policy if exists "downloads_delete_own" on public.downloads;
create policy "downloads_delete_own" on public.downloads for delete using (auth.uid() = user_id);

-- 5. RECENTLY PLAYED
alter table public.recently_played enable row level security;
drop policy if exists "recently_played_select_own" on public.recently_played;
create policy "recently_played_select_own" on public.recently_played for select using (auth.uid() = user_id);
drop policy if exists "recently_played_insert_own" on public.recently_played;
create policy "recently_played_insert_own" on public.recently_played for insert with check (auth.uid() = user_id);
drop policy if exists "recently_played_update_own" on public.recently_played;
create policy "recently_played_update_own" on public.recently_played for update using (auth.uid() = user_id);
drop policy if exists "recently_played_delete_own" on public.recently_played;
create policy "recently_played_delete_own" on public.recently_played for delete using (auth.uid() = user_id);

-- 6. USER PLAYLISTS
alter table public.user_playlists enable row level security;
drop policy if exists "user_playlists_select_own" on public.user_playlists;
create policy "user_playlists_select_own" on public.user_playlists for select using (auth.uid() = user_id);
drop policy if exists "user_playlists_insert_own" on public.user_playlists;
create policy "user_playlists_insert_own" on public.user_playlists for insert with check (auth.uid() = user_id);
drop policy if exists "user_playlists_update_own" on public.user_playlists;
create policy "user_playlists_update_own" on public.user_playlists for update using (auth.uid() = user_id);
drop policy if exists "user_playlists_delete_own" on public.user_playlists;
create policy "user_playlists_delete_own" on public.user_playlists for delete using (auth.uid() = user_id);

-- 7. PLAYLIST SONGS (Assuming it has a user_id or playlist_id linked to user)
alter table public.playlist_songs enable row level security;
drop policy if exists "playlist_songs_select_own" on public.playlist_songs;
create policy "playlist_songs_select_own" on public.playlist_songs for select using (
  exists (
    select 1 from public.user_playlists
    where id = public.playlist_songs.playlist_id and user_id = auth.uid()
  )
);
drop policy if exists "playlist_songs_insert_own" on public.playlist_songs;
create policy "playlist_songs_insert_own" on public.playlist_songs for insert with check (
  exists (
    select 1 from public.user_playlists
    where id = public.playlist_songs.playlist_id and user_id = auth.uid()
  )
);
drop policy if exists "playlist_songs_delete_own" on public.playlist_songs;
create policy "playlist_songs_delete_own" on public.playlist_songs for delete using (
  exists (
    select 1 from public.user_playlists
    where id = public.playlist_songs.playlist_id and user_id = auth.uid()
  )
);
