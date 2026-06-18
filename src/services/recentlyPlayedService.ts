import type { Song } from '../types'
import { supabase } from '../lib/supabase'
import { buildSongRecord, mapRecordToSong } from './songRecord'
import { assertNoSupabaseError, requireSupabase } from './serviceUtils'
import { readOfflineCache, writeOfflineCache } from '../utils/offlineCache'

const LAST_RECENTLY_PLAYED_CACHE_KEY = 'hearttune-recently-played:last'

interface CachedRecentSongEntry {
  id: string
  played_at: string
  song: Song
}

function getRecentlyPlayedCacheKey(userId: string) {
  return `hearttune-recently-played:${userId}`
}

function readCachedRecentlyPlayed(userId: string, limit = 10) {
  const entries = readOfflineCache<CachedRecentSongEntry[]>(
    getRecentlyPlayedCacheKey(userId),
    readOfflineCache<CachedRecentSongEntry[]>(LAST_RECENTLY_PLAYED_CACHE_KEY, [])
  )

  return entries.slice(0, limit)
}

function writeCachedRecentlyPlayed(userId: string, entries: CachedRecentSongEntry[]) {
  writeOfflineCache(getRecentlyPlayedCacheKey(userId), entries)
  writeOfflineCache(LAST_RECENTLY_PLAYED_CACHE_KEY, entries)
}

export async function addRecentlyPlayed(userId: string, song: Song) {
  const cached = readCachedRecentlyPlayed(userId)
  const nextEntry = {
    id: `${song.id}-${Date.now()}`,
    played_at: new Date().toISOString(),
    song,
  }

  writeCachedRecentlyPlayed(
    userId,
    [nextEntry, ...cached.filter((entry) => entry.song.id !== song.id)].slice(0, 20)
  )

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

  const entries = (data || []).map((item) => ({
    ...item,
    song: mapRecordToSong(item),
  }))

  writeCachedRecentlyPlayed(userId, entries)
  return entries.slice(0, limit)
}
