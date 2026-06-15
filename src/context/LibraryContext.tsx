import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import type { Song } from '../types'
import { getPlayableAudioUrl } from '../api/saavn'
import {
  saveDownload,
  removeDownload,
  getAllDownloads,
} from '../utils/downloads'

interface LibraryContextType {
  likedSongs: Song[]
  downloadedIds: Set<string>
  downloadingIds: Set<string>
  isLiked: (id: string) => boolean
  toggleLike: (song: Song) => void
  isDownloaded: (id: string) => boolean
  downloadSong: (song: Song) => Promise<void>
  removeDownloaded: (id: string) => Promise<void>
  refreshDownloads: () => Promise<void>
  getLocalUrl: (id: string) => Promise<string | null>
}

const LibraryContext = createContext<LibraryContextType | null>(null)

const LIKED_KEY = 'heartwave-liked'

function loadLiked(): Song[] {
  try {
    return JSON.parse(localStorage.getItem(LIKED_KEY) || '[]')
  } catch {
    return []
  }
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [likedSongs, setLikedSongs] = useState<Song[]>(loadLiked)
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set())
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set())
  const blobCache = useRef<Map<string, string>>(new Map())

  const refreshDownloads = useCallback(async () => {
    const entries = await getAllDownloads()
    setDownloadedIds(new Set(entries.map((e) => e.id)))
  }, [])

  useEffect(() => {
    refreshDownloads()
  }, [refreshDownloads])

  useEffect(() => {
    localStorage.setItem(LIKED_KEY, JSON.stringify(likedSongs))
  }, [likedSongs])

  const isLiked = (id: string) => likedSongs.some((s) => s.id === id)

  const toggleLike = (song: Song) => {
    setLikedSongs((prev) => {
      if (prev.some((s) => s.id === song.id)) {
        return prev.filter((s) => s.id !== song.id)
      }
      return [{ ...song, likedAt: Date.now() } as Song, ...prev]
    })
  }

  const downloadSong = async (song: Song) => {
    if (downloadingIds.has(song.id) || downloadedIds.has(song.id)) return
    setDownloadingIds((prev) => new Set(prev).add(song.id))
    try {
      const { url, song: resolved } = await getPlayableAudioUrl(song)
      const res = await fetch(url)
      const blob = await res.blob()
      await saveDownload(resolved, blob)
      blobCache.current.set(song.id, URL.createObjectURL(blob))
      setDownloadedIds((prev) => new Set(prev).add(song.id))
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev)
        next.delete(song.id)
        return next
      })
    }
  }

  const removeDownloaded = async (id: string) => {
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
  }

  const getLocalUrl = async (id: string) => {
    if (blobCache.current.has(id)) return blobCache.current.get(id)!
    const all = await getAllDownloads()
    const entry = all.find((e) => e.id === id) || null
    if (!entry) return null
    const url = URL.createObjectURL(entry.blob)
    blobCache.current.set(id, url)
    return url
  }

  return (
    <LibraryContext.Provider
      value={{
        likedSongs,
        downloadedIds,
        downloadingIds,
        isLiked,
        toggleLike,
        isDownloaded: (id) => downloadedIds.has(id),
        downloadSong,
        removeDownloaded,
        refreshDownloads,
        getLocalUrl,
      }}
    >
      {children}
    </LibraryContext.Provider>
  )
}

export function useLibrary() {
  const ctx = useContext(LibraryContext)
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider')
  return ctx
}
