import { useCallback, useEffect, useState } from 'react'
import {
  addRecentlyPlayed,
  getRecentlyPlayed,
  RECENTLY_PLAYED_UPDATED_EVENT,
} from '../services/recentlyPlayedService'
import { getErrorMessage, isOffline, isOfflineError } from '../services/serviceUtils'
import { useAuth } from './useAuth'
import type { Song } from '../types'
import { readOfflineCache } from '../utils/offlineCache'

interface RecentSongEntry {
  id: string
  played_at: string
  song: Song
}

export function useRecentlyPlayed(limit = 8) {
  const { user } = useAuth()
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentSongEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const readCachedRecentlyPlayed = useCallback(
    () =>
      readOfflineCache<RecentSongEntry[]>(
        user ? `hearttune-recently-played:${user.id}` : 'hearttune-recently-played:last',
        readOfflineCache<RecentSongEntry[]>('hearttune-recently-played:last', [])
      ).slice(0, limit),
    [limit, user]
  )

  const refreshRecentlyPlayed = useCallback(async () => {
    if (!user) {
      if (isOffline()) {
        setRecentlyPlayed(readCachedRecentlyPlayed())
      } else {
        setRecentlyPlayed([])
      }
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      setRecentlyPlayed(await getRecentlyPlayed(user.id, limit))
    } catch (nextError) {
      if (isOfflineError(nextError)) {
        setRecentlyPlayed(readCachedRecentlyPlayed())
        setError(null)
      } else {
        setError(getErrorMessage(nextError, 'Unable to load recently played songs'))
      }
    } finally {
      setLoading(false)
    }
  }, [limit, readCachedRecentlyPlayed, user])

  useEffect(() => {
    void refreshRecentlyPlayed()
  }, [refreshRecentlyPlayed])

  useEffect(() => {
    if (!user) return

    const handleRecentlyPlayedUpdate = (event: Event) => {
      const updatedUserId = (event as CustomEvent<{ userId?: string }>).detail?.userId
      if (updatedUserId === user.id) {
        setRecentlyPlayed(readCachedRecentlyPlayed())
      }
    }

    window.addEventListener(RECENTLY_PLAYED_UPDATED_EVENT, handleRecentlyPlayedUpdate)
    return () => {
      window.removeEventListener(RECENTLY_PLAYED_UPDATED_EVENT, handleRecentlyPlayedUpdate)
    }
  }, [readCachedRecentlyPlayed, user])

  const trackSong = useCallback(async (song: Song) => {
    if (!user) return

    try {
      await addRecentlyPlayed(user.id, song)
      await refreshRecentlyPlayed()
    } catch (nextError) {
      if (isOfflineError(nextError)) {
        setRecentlyPlayed(readCachedRecentlyPlayed())
        setError(null)
      } else {
        setError(getErrorMessage(nextError, 'Unable to update recently played songs'))
      }
    }
  }, [readCachedRecentlyPlayed, refreshRecentlyPlayed, user])

  return {
    recentlyPlayed,
    loading,
    error,
    refreshRecentlyPlayed,
    trackSong,
  }
}
