import type { Song, Album } from '../types'
import type { LyricsData } from '../api/lyrics'

const DB_NAME = 'hearttune-downloads'
const STORE = 'songs'
const DB_VERSION = 2

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('artwork')) {
        db.createObjectStore('artwork', { keyPath: 'url' })
      }
    }
  })
}

export interface DownloadedEntry {
  id: string
  song: Song
  blob: Blob
  artworkBlob?: Blob
  lyrics?: LyricsData | null
  downloadedAt: number
  playbackPosition?: number
  cacheVersion?: string
}

export async function saveDownload(
  song: Song,
  blob: Blob,
  artworkBlob?: Blob,
  lyrics?: LyricsData | null
) {
  const db = await openDb()
  
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({
      id: song.id,
      song,
      blob,
      artworkBlob,
      lyrics,
      downloadedAt: Date.now(),
      playbackPosition: 0,
      cacheVersion: 'v4'
    })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })

  if (artworkBlob && song.image && song.image.length > 0) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('artwork', 'readwrite')
      const artworkStore = tx.objectStore('artwork')
      
      song.image.forEach((img) => {
        if (img.url) {
          artworkStore.put({ url: img.url, blob: artworkBlob })
        }
      })
      
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }
}

export async function getArtworkBlob(url: string): Promise<Blob | null> {
  try {
    const db = await openDb()
    return new Promise((resolve) => {
      const tx = db.transaction('artwork', 'readonly')
      const req = tx.objectStore('artwork').get(url)
      req.onsuccess = () => {
        const res = req.result
        resolve(res ? res.blob : null)
      }
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function updatePlaybackPosition(id: string, position: number) {
  try {
    const db = await openDb()
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      const req = store.get(id)
      req.onsuccess = () => {
        const entry = req.result as DownloadedEntry | undefined
        if (entry) {
          entry.playbackPosition = position
          store.put(entry)
        }
        resolve()
      }
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.warn('Failed to update playback position in local DB', err)
  }
}

export async function searchDownloadedContent(query: string) {
  const q = query.toLowerCase().trim()
  if (!q) return { songs: [], albums: [] }

  const downloads = await getAllDownloads()
  const matchedSongs: Song[] = []
  const matchedAlbumsMap = new Map<string, Album>()

  for (const entry of downloads) {
    const song = entry.song
    const nameMatch = song.name?.toLowerCase().includes(q)
    const albumMatch = song.album?.name?.toLowerCase().includes(q)
    const artistMatch = song.artists?.primary?.some((a) => a.name?.toLowerCase().includes(q))

    if (nameMatch || albumMatch || artistMatch) {
      matchedSongs.push(song)

      if (song.album?.id) {
        if (!matchedAlbumsMap.has(song.album.id)) {
          matchedAlbumsMap.set(song.album.id, {
            id: song.album.id,
            name: song.album.name,
            artists: { primary: song.artists?.primary || [] },
            image: song.image,
            songCount: 1,
            songs: [song]
          })
        } else {
          const alb = matchedAlbumsMap.get(song.album.id)!
          alb.songs?.push(song)
          alb.songCount = (alb.songCount || 0) + 1
        }
      }
    }
  }

  return {
    songs: matchedSongs,
    albums: Array.from(matchedAlbumsMap.values())
  }
}

export async function getDownload(id: string): Promise<DownloadedEntry | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

export async function getAllDownloads(): Promise<DownloadedEntry[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => {
      const entries = (req.result as DownloadedEntry[]).sort(
        (a, b) => b.downloadedAt - a.downloadedAt
      )
      resolve(entries)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function removeDownload(id: string) {
  const db = await openDb()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearAllDownloads() {
  const db = await openDb()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function isDownloaded(id: string) {
  const entry = await getDownload(id)
  return !!entry
}
