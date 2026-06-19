import type { Song, UserPlaylist } from '../types'
import type { PlaylistUpdate } from '../types/database'
import { supabase } from '../lib/supabase'
import { auditLog } from '../lib/monitoring'
import { buildSongRecord, mapRecordToSong } from './songRecord'
import { assertNoSupabaseError, requireSupabase } from './serviceUtils'

interface PlaylistInput {
  name: string
  description?: string
  cover_image?: string
  is_public?: boolean
}

export async function createPlaylist(userId: string, input: PlaylistInput) {
  const client = requireSupabase(supabase)
  const { data, error } = await client
    .from('user_playlists')
    .insert({
      user_id: userId,
      name: input.name,
      description: input.description || null,
      cover_image: input.cover_image || null,
      is_public: input.is_public ?? false,
    })
    .select('*')
    .single()

  assertNoSupabaseError(error, 'Unable to create playlist')
  await auditLog('playlist_modification', { action: 'create', playlistId: data?.id })
  return { ...(data as UserPlaylist), songCount: 0, songs: [] }
}

export async function getUserPlaylists(userId: string) {
  const client = requireSupabase(supabase)
  const { data, error } = await client
    .from('user_playlists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  assertNoSupabaseError(error, 'Unable to load playlists')

  const playlists = (data || []) as UserPlaylist[]

  if (!playlists.length) return []

  const playlistIds = playlists.map((playlist) => playlist.id)
  const { data: playlistSongs, error: songsError } = await client
    .from('playlist_songs')
    .select('playlist_id')
    .in('playlist_id', playlistIds)

  assertNoSupabaseError(songsError, 'Unable to load playlist songs')

  const counts = new Map<string, number>()
  ;(playlistSongs || []).forEach((item) => {
    counts.set(item.playlist_id, (counts.get(item.playlist_id) || 0) + 1)
  })

  return playlists.map((playlist) => ({
    ...playlist,
    songCount: counts.get(playlist.id) || 0,
  }))
}

export const getPlaylists = getUserPlaylists

export async function updatePlaylist(playlistId: string, updates: PlaylistInput) {
  const client = requireSupabase(supabase)
  const payload: PlaylistUpdate = {
    name: updates.name,
    description: updates.description || null,
    cover_image: updates.cover_image || null,
    is_public: updates.is_public,
  }

  const { data, error } = await client
    .from('user_playlists')
    .update(payload)
    .eq('id', playlistId)
    .select('*')
    .single()

  assertNoSupabaseError(error, 'Unable to update playlist')
  await auditLog('playlist_modification', { action: 'update', playlistId })
  return data as UserPlaylist
}

export async function getPlaylistById(userId: string, playlistId: string) {
  const client = requireSupabase(supabase)
  const { data, error } = await client
    .from('user_playlists')
    .select('*')
    .eq('user_id', userId)
    .eq('id', playlistId)
    .maybeSingle()

  assertNoSupabaseError(error, 'Unable to load playlist')
  if (!data) return null

  const { data: songs, error: songsError } = await client
    .from('playlist_songs')
    .select(
      'song_id, song_title, artist_name, album_name, image_url, audio_url, duration, position'
    )
    .eq('playlist_id', playlistId)
    .eq('user_id', userId)
    .order('position', { ascending: true })

  assertNoSupabaseError(songsError, 'Unable to load playlist songs')

  return {
    ...(data as UserPlaylist),
    songCount: (songs || []).length,
    songs: (songs || []).map((item) => mapRecordToSong(item)),
  }
}

export async function addSongToPlaylist(playlistId: string, userId: string, song: Song) {
  const client = requireSupabase(supabase)
  const { count, error: countError } = await client
    .from('playlist_songs')
    .select('id', { count: 'exact', head: true })
    .eq('playlist_id', playlistId)
    .eq('song_id', song.id)

  assertNoSupabaseError(countError, 'Unable to inspect playlist songs')

  if ((count || 0) > 0) return false

  const { count: totalSongs, error: totalError } = await client
    .from('playlist_songs')
    .select('id', { count: 'exact', head: true })
    .eq('playlist_id', playlistId)

  assertNoSupabaseError(totalError, 'Unable to calculate playlist position')

  const record = buildSongRecord(song)
  const { error } = await client.from('playlist_songs').insert({
    playlist_id: playlistId,
    user_id: userId,
    ...record,
    position: totalSongs || 0,
  })

  assertNoSupabaseError(error, 'Unable to add song to playlist')
  await auditLog('playlist_modification', { action: 'add_song', playlistId, songId: song.id })
  return true
}

export async function removeSongFromPlaylist(playlistId: string, songId: string) {
  const client = requireSupabase(supabase)
  const { error } = await client
    .from('playlist_songs')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('song_id', songId)

  assertNoSupabaseError(error, 'Unable to remove song from playlist')
  await auditLog('playlist_modification', { action: 'remove_song', playlistId, songId })
}

export async function deletePlaylist(playlistId: string) {
  const client = requireSupabase(supabase)
  const { error: songsError } = await client
    .from('playlist_songs')
    .delete()
    .eq('playlist_id', playlistId)

  assertNoSupabaseError(songsError, 'Unable to clear playlist songs')

  const { error } = await client
    .from('user_playlists')
    .delete()
    .eq('id', playlistId)

  assertNoSupabaseError(error, 'Unable to delete playlist')
  await auditLog('playlist_modification', { action: 'delete', playlistId })
}
