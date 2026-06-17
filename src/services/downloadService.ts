import type { Song } from '../types'
import type { DownloadMetadata } from '../types'
import { supabase } from '../lib/supabase'
import { buildSongRecord } from './songRecord'
import { assertNoSupabaseError, requireSupabase } from './serviceUtils'

export async function saveDownloadMetadata(userId: string, song: Song) {
  const client = requireSupabase(supabase)
  const record = buildSongRecord(song)

  const { error: deleteError } = await client
    .from('downloads')
    .delete()
    .eq('user_id', userId)
    .eq('song_id', song.id)

  assertNoSupabaseError(deleteError, 'Unable to update download metadata')

  const { error } = await client.from('downloads').insert({
    user_id: userId,
    song_id: record.song_id,
    song_title: record.song_title,
    artist_name: record.artist_name,
    image_url: record.image_url,
    downloaded_at: new Date().toISOString(),
  })

  assertNoSupabaseError(error, 'Unable to save download metadata')
}

export async function getDownloads(userId: string) {
  const client = requireSupabase(supabase)
  const { data, error } = await client
    .from('downloads')
    .select('id, user_id, song_id, song_title, artist_name, image_url, downloaded_at')
    .eq('user_id', userId)
    .order('downloaded_at', { ascending: false })

  assertNoSupabaseError(error, 'Unable to load downloads metadata')
  return (data || []) as DownloadMetadata[]
}

export async function removeDownloadMetadata(userId: string, songId: string) {
  const client = requireSupabase(supabase)
  const { error } = await client
    .from('downloads')
    .delete()
    .eq('user_id', userId)
    .eq('song_id', songId)

  assertNoSupabaseError(error, 'Unable to remove download metadata')
}
