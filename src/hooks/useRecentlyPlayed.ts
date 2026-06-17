import { useCallback, useEffect, useState } from 'react'
import { addRecentlyPlayed, getRecentlyPlayed } from '../services/recentlyPlayedService'
import { getErrorMessage } from '../services/serviceUtils'
import { useAuth } from './useAuth'
import type { Song } from '../types'

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

  const refreshRecentlyPlayed = useCallback(async () => {
    if (!user) {
      setRecentlyPlayed([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      setRecentlyPlayed(await getRecentlyPlayed(user.id, limit))
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Unable to load recently played songs'))
    } finally {
      setLoading(false)
    }
  }, [limit, user])

  useEffect(() => {
    void refreshRecentlyPlayed()
  }, [refreshRecentlyPlayed])

  const trackSong = useCallback(async (song: Song) => {
    if (!user) return

    try {
      await addRecentlyPlayed(user.id, song)
      await refreshRecentlyPlayed()
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Unable to update recently played songs'))
    }
  }, [refreshRecentlyPlayed, user])

  return {
    recentlyPlayed,
    loading,
    error,
    refreshRecentlyPlayed,
    trackSong,
  }
}
