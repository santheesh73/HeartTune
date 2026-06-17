import { useCallback, useEffect, useState } from 'react'
import type { Song } from '../types'
import { getLikedSongs, likeSong, unlikeSong } from '../services/likedSongsService'
import { getErrorMessage } from '../services/serviceUtils'
import { useAuth } from './useAuth'

export function useLikedSongs() {
  const { user, isAuthenticated } = useAuth()
  const [likedSongs, setLikedSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshLikedSongs = useCallback(async () => {
    if (!user) {
      setLikedSongs([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      setLikedSongs(await getLikedSongs(user.id))
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Unable to load liked songs'))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refreshLikedSongs()
  }, [refreshLikedSongs])

  const isSongLiked = useCallback(
    (songId: string) => likedSongs.some((song) => song.id === songId),
    [likedSongs]
  )

  const like = useCallback(async (song: Song) => {
    if (!user || !isAuthenticated) {
      const message = 'Please sign in to like songs.'
      setError(message)
      return { success: false, error: message }
    }

    try {
      await likeSong(user.id, song)
      setLikedSongs((prev) => [song, ...prev.filter((item) => item.id !== song.id)])
      setError(null)
      return { success: true, error: null }
    } catch (nextError) {
      const message = getErrorMessage(nextError, 'Unable to like song')
      setError(message)
      return { success: false, error: message }
    }
  }, [isAuthenticated, user])

  const unlike = useCallback(async (songId: string) => {
    if (!user || !isAuthenticated) {
      const message = 'Please sign in to manage liked songs.'
      setError(message)
      return { success: false, error: message }
    }

    try {
      await unlikeSong(user.id, songId)
      setLikedSongs((prev) => prev.filter((item) => item.id !== songId))
      setError(null)
      return { success: true, error: null }
    } catch (nextError) {
      const message = getErrorMessage(nextError, 'Unable to unlike song')
      setError(message)
      return { success: false, error: message }
    }
  }, [isAuthenticated, user])

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
