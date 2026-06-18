import { useCallback, useEffect, useState } from 'react'
import type { Song } from '../types'
import { getLikedSongs, likeSong, unlikeSong } from '../services/likedSongsService'
import { getErrorMessage, isOffline, isOfflineError } from '../services/serviceUtils'
import { readOfflineCache, writeOfflineCache } from '../utils/offlineCache'
import { useAuth } from './useAuth'

const LAST_LIKED_SONGS_CACHE_KEY = 'hearttune-liked-songs:last'

export function useLikedSongs() {
  const { user, isAuthenticated } = useAuth()
  const [likedSongs, setLikedSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cacheKey = user ? `hearttune-liked-songs:${user.id}` : LAST_LIKED_SONGS_CACHE_KEY
  const readCachedLikedSongs = useCallback(
    () => readOfflineCache<Song[]>(cacheKey, readOfflineCache<Song[]>(LAST_LIKED_SONGS_CACHE_KEY, [])),
    [cacheKey]
  )
  const persistLikedSongs = useCallback((songs: Song[]) => {
    writeOfflineCache(cacheKey, songs)
    writeOfflineCache(LAST_LIKED_SONGS_CACHE_KEY, songs)
  }, [cacheKey])

  const refreshLikedSongs = useCallback(async () => {
    if (!user) {
      if (isOffline()) {
        setLikedSongs(readCachedLikedSongs())
      } else {
        setLikedSongs([])
      }
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const songs = await getLikedSongs(user.id)
      setLikedSongs(songs)
      persistLikedSongs(songs)
    } catch (nextError) {
      if (isOfflineError(nextError)) {
        setLikedSongs(readCachedLikedSongs())
        setError(null)
      } else {
        setError(getErrorMessage(nextError, 'Unable to load liked songs'))
      }
    } finally {
      setLoading(false)
    }
  }, [persistLikedSongs, readCachedLikedSongs, user])

  useEffect(() => {
    void refreshLikedSongs()
  }, [refreshLikedSongs])

  const isSongLiked = useCallback(
    (songId: string) => likedSongs.some((song) => song.id === songId),
    [likedSongs]
  )

  const like = useCallback(async (song: Song) => {
    if (!user || !isAuthenticated) {
      if (isOffline()) {
        const cached = readCachedLikedSongs()
        setLikedSongs(cached)
        setError('Liked songs can only be changed while online.')
        return { success: false, error: 'Liked songs can only be changed while online.' }
      }
      const message = 'Please sign in to like songs.'
      setError(message)
      return { success: false, error: message }
    }

    try {
      await likeSong(user.id, song)
      setLikedSongs((prev) => {
        const next = [song, ...prev.filter((item) => item.id !== song.id)]
        persistLikedSongs(next)
        return next
      })
      setError(null)
      return { success: true, error: null }
    } catch (nextError) {
      if (isOfflineError(nextError)) {
        const message = 'Liked songs can only be changed while online.'
        setError(message)
        return { success: false, error: message }
      }
      const message = getErrorMessage(nextError, 'Unable to like song')
      setError(message)
      return { success: false, error: message }
    }
  }, [isAuthenticated, persistLikedSongs, readCachedLikedSongs, user])

  const unlike = useCallback(async (songId: string) => {
    if (!user || !isAuthenticated) {
      if (isOffline()) {
        const cached = readCachedLikedSongs()
        setLikedSongs(cached)
        setError('Liked songs can only be changed while online.')
        return { success: false, error: 'Liked songs can only be changed while online.' }
      }
      const message = 'Please sign in to manage liked songs.'
      setError(message)
      return { success: false, error: message }
    }

    try {
      await unlikeSong(user.id, songId)
      setLikedSongs((prev) => {
        const next = prev.filter((item) => item.id !== songId)
        persistLikedSongs(next)
        return next
      })
      setError(null)
      return { success: true, error: null }
    } catch (nextError) {
      if (isOfflineError(nextError)) {
        const message = 'Liked songs can only be changed while online.'
        setError(message)
        return { success: false, error: message }
      }
      const message = getErrorMessage(nextError, 'Unable to unlike song')
      setError(message)
      return { success: false, error: message }
    }
  }, [isAuthenticated, persistLikedSongs, readCachedLikedSongs, user])

  const toggleLikedSong = useCallback(async (song: Song) => {
    if (isSongLiked(song.id)) return unlike(song.id)
    return like(song)
  }, [isSongLiked, like, unlike])

  return {
    likedSongs,
    loading,
    error,
    refreshLikedSongs,
    likeSong: like,
    unlikeSong: unlike,
    toggleLikedSong,
    isSongLiked,
  }
}
