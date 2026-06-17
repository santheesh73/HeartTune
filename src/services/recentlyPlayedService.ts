import type { Song } from '../types'
import { supabase } from '../lib/supabase'
import { buildSongRecord, mapRecordToSong } from './songRecord'
import { assertNoSupabaseError, requireSupabase } from './serviceUtils'

export async function addRecentlyPlayed(userId: string, song: Song) {
  const client = requireSupabase(supabase)
  const record = buildSongRecord(song)

  const { error: deleteError } = await client
    .from('recently_played')
    .delete()
    .eq('user_id', userId)
    .eq('song_id', song.id)

  assertNoSupabaseError(deleteError, 'Unable to update recently played history')

  const { error } = await client.from('recently_played').insert({
    user_id: userId,
    ...record,
    played_at: new Date().toISOString(),
  })

  assertNoSupabaseError(error, 'Unable to save recently played song')
}

export async function getRecentlyPlayed(userId: string, limit = 10) {
  const client = requireSupabase(supabase)
  const { data, error } = await client
    .from('recently_played')
    .select('id, song_id, song_title, artist_name, album_name, image_url, audio_url, duration, played_at')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(limit)

  assertNoSupabaseError(error, 'Unable to load recently played songs')

  return (data || []).map((item) => ({
    ...item,
    song: mapRecordToSong(item),
  }))
}
