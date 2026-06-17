import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Song } from '../types'
import { getPlayableAudioUrl } from '../api/saavn'
import { useAuth } from '../hooks/useAuth'
import { useLikedSongs } from '../hooks/useLikedSongs'
import { getDownloads, removeDownloadMetadata, saveDownloadMetadata } from '../services/downloadService'
import { getErrorMessage } from '../services/serviceUtils'
import { getAllDownloads, getDownload, removeDownload, saveDownload } from '../utils/downloads'

interface LibraryContextType {
  likedSongs: Song[]
  likedSongsLoading: boolean
  likedSongsError: string | null
  downloadedIds: Set<string>
  downloadingIds: Set<string>
  downloadCount: number
  downloadMetadataError: string | null
  isLiked: (id: string) => boolean
  toggleLike: (song: Song) => Promise<boolean>
  isDownloaded: (id: string) => boolean
  downloadSong: (song: Song) => Promise<void>
  removeDownloaded: (id: string) => Promise<void>
  refreshDownloads: () => Promise<void>
  getLocalUrl: (id: string) => Promise<string | null>
}

const LibraryContext = createContext<LibraryContextType | null>(null)

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const {
    likedSongs,
    loading: likedSongsLoading,
    error: likedSongsError,
    toggleLikedSong,
    isSongLiked,
  } = useLikedSongs()

  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set())
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set())
  const [downloadCount, setDownloadCount] = useState(0)
  const [downloadMetadataError, setDownloadMetadataError] = useState<string | null>(null)
  const blobCache = useRef<Map<string, string>>(new Map())

  const refreshDownloads = useCallback(async () => {
    const entries = await getAllDownloads()
    setDownloadedIds(new Set(entries.map((entry) => entry.id)))
    setDownloadCount(entries.length)

    if (!user) {
      return
    }

    try {
      await getDownloads(user.id)
      setDownloadMetadataError(null)
    } catch (error) {
      setDownloadMetadataError(getErrorMessage(error, 'Unable to load download metadata'))
    }
  }, [user])

  useEffect(() => {
    void refreshDownloads()
  }, [refreshDownloads])

  const toggleLike = useCallback(async (song: Song) => {
    if (!isAuthenticated) {
      window.alert('Please sign in to like songs.')
      return false
    }

    const result = await toggleLikedSong(song)
    if (result.error) {
      window.alert(result.error)
      return false
    }
    return true
  }, [isAuthenticated, toggleLikedSong])

  const downloadSong = useCallback(async (song: Song) => {
    if (downloadingIds.has(song.id) || downloadedIds.has(song.id)) return

    setDownloadingIds((prev) => new Set(prev).add(song.id))

    try {
      const { url, song: resolved } = await getPlayableAudioUrl(song)
      const response = await fetch(url)
      const blob = await response.blob()

      await saveDownload(resolved, blob)
      blobCache.current.set(song.id, URL.createObjectURL(blob))
      setDownloadedIds((prev) => new Set(prev).add(song.id))

      if (user) {
        try {
          await saveDownloadMetadata(user.id, resolved)
          setDownloadMetadataError(null)
        } catch (error) {
          setDownloadMetadataError(getErrorMessage(error, 'Unable to save download metadata'))
        }
      }
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev)
        next.delete(song.id)
        return next
      })
      await refreshDownloads()
    }
  }, [downloadedIds, downloadingIds, refreshDownloads, user])

  const removeDownloaded = useCallback(async (id: string) => {
    await removeDownload(id)

    const cached = blobCache.current.get(id)
    if (cached) {
      URL.revokeObjectURL(cached)
      blobCache.current.delete(id)
    }

    setDownloadedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })

    if (user) {
      try {
        await removeDownloadMetadata(user.id, id)
        setDownloadMetadataError(null)
      } catch (error) {
        setDownloadMetadataError(getErrorMessage(error, 'Unable to remove download metadata'))
      }
    }

    await refreshDownloads()
  }, [refreshDownloads, user])

  const getLocalUrl = useCallback(async (id: string) => {
    if (blobCache.current.has(id)) return blobCache.current.get(id) || null

    const entry = await getDownload(id)
    if (!entry) return null

    const url = URL.createObjectURL(entry.blob)
    blobCache.current.set(id, url)
    return url
  }, [])

  const value = useMemo(
    () => ({
      likedSongs,
      likedSongsLoading,
      likedSongsError,
      downloadedIds,
      downloadingIds,
      downloadCount,
      downloadMetadataError,
      isLiked: (id: string) => isSongLiked(id),
      toggleLike,
      isDownloaded: (id: string) => downloadedIds.has(id),
      downloadSong,
      removeDownloaded,
      refreshDownloads,
      getLocalUrl,
    }),
    [
      downloadCount,
      downloadMetadataError,
      downloadedIds,
      downloadingIds,
      likedSongs,
      likedSongsError,
      likedSongsLoading,
      isSongLiked,
      downloadSong,
      getLocalUrl,
      refreshDownloads,
      removeDownloaded,
      toggleLike,
    ]
  )

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

export function useLibrary() {
  const ctx = useContext(LibraryContext)
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider')
  return ctx
}
