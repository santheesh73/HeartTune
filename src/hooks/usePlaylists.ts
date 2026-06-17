import { useCallback, useEffect, useState } from 'react'
import type { Song, UserPlaylist } from '../types'
import {
  addSongToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylists,
  getPlaylistById,
  removeSongFromPlaylist,
} from '../services/playlistService'
import { getErrorMessage } from '../services/serviceUtils'
import { useAuth } from './useAuth'

function getPlaylistErrorMessage(error: unknown, fallback: string) {
  const message = getErrorMessage(error, fallback)
  const normalized = message.toLowerCase()

  if (
    normalized.includes("could not find the table 'public.user_playlists'") ||
    normalized.includes("could not find the table 'user_playlists'") ||
    normalized.includes('schema cache')
  ) {
    return null
  }

  return message
}

export function usePlaylists() {
  const { user } = useAuth()
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshPlaylists = useCallback(async () => {
    if (!user) {
      setPlaylists([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      setPlaylists(await getPlaylists(user.id))
    } catch (nextError) {
      setError(getPlaylistErrorMessage(nextError, 'Unable to load playlists'))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refreshPlaylists()
  }, [refreshPlaylists])

  const createUserPlaylist = useCallback(
    async (name: string, description?: string) => {
      if (!user) return { playlist: null, error: 'Please sign in to create playlists.' }

      try {
        const playlist = await createPlaylist(user.id, { name, description })
        setPlaylists((prev) => [playlist, ...prev])
        setError(null)
        return { playlist, error: null }
      } catch (nextError) {
        const message =
          getPlaylistErrorMessage(nextError, 'Unable to create playlist') ||
          'Playlists are unavailable right now.'
        setError(message)
        return { playlist: null, error: message }
      }
    },
    [user]
  )

  const loadPlaylist = useCallback(
    async (playlistId: string) => {
      if (!user) return null

      try {
        return await getPlaylistById(user.id, playlistId)
      } catch (nextError) {
        setError(getErrorMessage(nextError, 'Unable to load playlist'))
        return null
      }
    },
    [user]
  )

  const addSong = useCallback(
    async (playlistId: string, song: Song) => {
      if (!user) return { added: false, error: 'Please sign in to manage playlists.' }

      try {
        const added = await addSongToPlaylist(playlistId, user.id, song)
        await refreshPlaylists()
        setError(null)
        return { added, error: null }
      } catch (nextError) {
        const message = getErrorMessage(nextError, 'Unable to add song to playlist')
        setError(message)
        return { added: false, error: message }
      }
    },
    [refreshPlaylists, user]
  )

  const removeSong = useCallback(async (playlistId: string, songId: string) => {
    try {
      await removeSongFromPlaylist(playlistId, songId)
      setError(null)
      return { error: null }
    } catch (nextError) {
      const message = getErrorMessage(nextError, 'Unable to remove song from playlist')
      setError(message)
      return { error: message }
    }
  }, [])

  const removePlaylist = useCallback(async (playlistId: string) => {
    try {
      await deletePlaylist(playlistId)
      setPlaylists((prev) => prev.filter((playlist) => playlist.id !== playlistId))
      setError(null)
      return { error: null }
    } catch (nextError) {
      const message = getErrorMessage(nextError, 'Unable to delete playlist')
      setError(message)
      return { error: message }
    }
  }, [])

  return {
    playlists,
    loading,
    error,
    refreshPlaylists,
    createPlaylist: createUserPlaylist,
    loadPlaylist,
    addSongToPlaylist: addSong,
    removeSongFromPlaylist: removeSong,
    deletePlaylist: removePlaylist,
  }
}
