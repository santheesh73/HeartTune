import type { Song } from '../types'
import { supabase } from '../lib/supabase'
import { buildSongRecord, mapRecordToSong } from './songRecord'
import { assertNoSupabaseError, requireSupabase } from './serviceUtils'

export async function likeSong(userId: string, song: Song) {
  const client = requireSupabase(supabase)
  const record = buildSongRecord(song)

  await unlikeSong(userId, song.id)

  const { data, error } = await client
    .from('liked_songs')
    .insert({
      user_id: userId,
      ...record,
      source: 'jiosaavn',
    })
    .select('*')
    .single()

  assertNoSupabaseError(error, 'Unable to like song')
  return data
}

export async function unlikeSong(userId: string, songId: string) {
  const client = requireSupabase(supabase)
  const { error } = await client
    .from('liked_songs')
    .delete()
    .eq('user_id', userId)
    .eq('song_id', songId)

  assertNoSupabaseError(error, 'Unable to unlike song')
}

export async function getLikedSongs(userId: string) {
  const client = requireSupabase(supabase)
  const { data, error } = await client
    .from('liked_songs')
    .select('song_id, song_title, artist_name, album_name, image_url, audio_url, duration')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  assertNoSupabaseError(error, 'Unable to load liked songs')
  return (data || []).map((item) => mapRecordToSong(item))
}

export async function isSongLiked(userId: string, songId: string) {
  const client = requireSupabase(supabase)
  const { count, error } = await client
    .from('liked_songs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('song_id', songId)

  assertNoSupabaseError(error, 'Unable to check liked song')
  return (count || 0) > 0
}
