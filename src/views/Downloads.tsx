import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Play } from 'lucide-react'
import { getAllDownloads } from '../utils/downloads'
import { usePlayer } from '../context/PlayerContext'
import { useLibrary } from '../context/LibraryContext'
import { useAuth } from '../hooks/useAuth'
import { getSongs } from '../api/saavn'
import { getDownloads } from '../services/downloadService'
import { getErrorMessage } from '../services/serviceUtils'
import { mapRecordToSong } from '../services/songRecord'
import type { DownloadMetadata, Song } from '../types'
import SongRow from '../components/SongRow'

interface DownloadListEntry {
  id: string
  song: Song
}

function mergeTrackedSong(record: DownloadMetadata, fullSong: Song | undefined) {
  const fallbackSong = mapRecordToSong(record)
  if (!fullSong) return fallbackSong

  return {
    ...fallbackSong,
    ...fullSong,
    album: fullSong.album?.name ? fullSong.album : fallbackSong.album,
    artists: fullSong.artists?.primary?.length ? fullSong.artists : fallbackSong.artists,
    image: fullSong.image?.length ? fullSong.image : fallbackSong.image,
    downloadUrl: fullSong.downloadUrl?.length ? fullSong.downloadUrl : fallbackSong.downloadUrl,
    duration: fullSong.duration || fallbackSong.duration,
  }
}

export default function Downloads() {
  const [entries, setEntries] = useState<DownloadListEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [localError, setLocalError] = useState<string | null>(null)
  const [cloudError, setCloudError] = useState<string | null>(null)
  const { playSong } = usePlayer()
  const { removeDownloaded, refreshDownloads, downloadCount, downloadMetadataError } = useLibrary()
  const { user } = useAuth()

  const loadDownloads = useCallback(async () => {
    setLoading(true)
    setLocalError(null)
    setCloudError(null)

    try {
      const localDownloads = await getAllDownloads()
      const nextEntries: DownloadListEntry[] = localDownloads.map((entry) => ({
        id: entry.id,
        song: entry.song,
      }))
      const seenIds = new Set(nextEntries.map((entry) => entry.id))
      setEntries(nextEntries)
      setLoading(false)

      if (user) {
        try {
          const metadata = await getDownloads(user.id)
          const missingRecords = metadata.filter((record) => !seenIds.has(record.song_id))
          const fullSongs = await getSongs(missingRecords.map((record) => record.song_id))
          const fullSongsById = new Map(fullSongs.map((song) => [song.id, song]))
          const trackedEntries = missingRecords.map((record) => ({
            id: record.song_id,
            song: mergeTrackedSong(record, fullSongsById.get(record.song_id)),
          }))

          nextEntries.push(...trackedEntries)
          setEntries([...nextEntries])
        } catch (error) {
          setCloudError(getErrorMessage(error, 'Unable to load downloads from your account'))
        }
      }

      await refreshDownloads()
    } catch (error) {
      setEntries([])
      setLocalError(getErrorMessage(error, 'Unable to open downloaded songs on this device'))
    } finally {
      setLoading(false)
    }
  }, [refreshDownloads, user])

  useEffect(() => {
    void loadDownloads()
  }, [loadDownloads])

  const handleRemove = async (id: string) => {
    await removeDownloaded(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const songs = entries.map((e) => e.song)
  const trackedCount = Math.max(downloadCount, entries.length)

  return (
    <div className="page downloads-page">
      <motion.div
        className="playlist-hero gradient-dark"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="playlist-hero-icon">
          <Download size={48} />
        </div>
        <div>
          <p className="playlist-type">Offline</p>
          <h1>Downloaded Songs</h1>
          <p className="playlist-meta">{trackedCount} songs tracked in your library</p>
        </div>
      </motion.div>

      {downloadMetadataError ? <p className="login-error">{downloadMetadataError}</p> : null}
      {localError ? <p className="login-error">{localError}</p> : null}
      {cloudError ? <p className="login-error">{cloudError}</p> : null}

      {entries.length > 0 && (
        <motion.button
          className="play-all-btn large"
          onClick={() => playSong(songs[0], songs)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Play size={20} fill="currentColor" /> Play All
        </motion.button>
      )}

      {loading ? (
        <div className="loading-list">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-row" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="empty-state">
          <Download size={64} />
          <h2>No downloads yet</h2>
          <p>Download songs to listen offline</p>
        </div>
      ) : (
        <div className="song-list">
          <div className="song-list-header">
            <span>#</span>
            <span>Title</span>
            <span>Album</span>
            <span>Duration</span>
            <span />
          </div>
          {entries.map((entry, i) => (
            <SongRow
              key={entry.id}
              song={entry.song}
              index={i}
              queue={songs}
              showMobileRemove
              compactDesktopActions
              showCompactQueue
              hideDesktopDownload
              removeTitle="Remove download"
              onRemove={() => handleRemove(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
