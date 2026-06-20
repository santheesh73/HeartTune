import type { Song } from '../types'
import { supabase } from '../lib/supabase'
import { buildSongRecord, mapRecordToSong } from './songRecord'
import { assertNoSupabaseError, requireSupabase } from './serviceUtils'
import { readOfflineCache, writeOfflineCache } from '../utils/offlineCache'
import { getSongs } from '../api/saavn'

const LAST_RECENTLY_PLAYED_CACHE_KEY = 'hearttune-recently-played:last'
export const RECENTLY_PLAYED_UPDATED_EVENT = 'hearttune:recently-played-updated'

interface CachedRecentSongEntry {
  id: string
  played_at: string
  song: Song
}

async function hydrateRecentlyPlayedSongs(entries: CachedRecentSongEntry[]) {
  if (!entries.length) return entries

  try {
    const freshSongs = await getSongs(entries.map((entry) => entry.song.id))
    const freshById = new Map(freshSongs.map((song) => [song.id, song]))

    return entries.map((entry) => {
      const freshSong = freshById.get(entry.song.id)
      if (!freshSong) return entry

      return {
        ...entry,
        song: {
          ...entry.song,
          ...freshSong,
          album: freshSong.album?.name ? freshSong.album : entry.song.album,
          artists: freshSong.artists?.primary?.length
            ? freshSong.artists
            : entry.song.artists,
          image: freshSong.image?.length ? freshSong.image : entry.song.image,
          downloadUrl: freshSong.downloadUrl?.length
            ? freshSong.downloadUrl
            : entry.song.downloadUrl,
          duration: freshSong.duration || entry.song.duration,
        },
      }
    })
  } catch {
    // Stored metadata remains usable when the external catalog is unavailable.
    return entries
  }
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

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(RECENTLY_PLAYED_UPDATED_EVENT, {
        detail: { userId },
      })
    )
  }
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

  const storedEntries = (data || []).map((item) => ({
    ...item,
    song: mapRecordToSong(item),
  }))
  const entries = await hydrateRecentlyPlayedSongs(storedEntries)

  writeCachedRecentlyPlayed(userId, entries)
  return entries.slice(0, limit)
}
