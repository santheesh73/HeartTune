import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Play } from 'lucide-react'
import { getAllDownloads, type DownloadedEntry } from '../utils/downloads'
import { usePlayer } from '../context/PlayerContext'
import { useLibrary } from '../context/LibraryContext'
import SongRow from '../components/SongRow'

export default function Downloads() {
  const [entries, setEntries] = useState<DownloadedEntry[]>([])
  const [loading, setLoading] = useState(true)
  const { playSong } = usePlayer()
  const { removeDownloaded, refreshDownloads, downloadCount, downloadMetadataError } = useLibrary()

  const loadDownloads = useCallback(async () => {
    setLoading(true)
    const data = await getAllDownloads()
    setEntries(data)
    await refreshDownloads()
    setLoading(false)
  }, [refreshDownloads])

  useEffect(() => {
    void loadDownloads()
  }, [loadDownloads])

  const handleRemove = async (id: string) => {
    await removeDownloaded(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const songs = entries.map((e) => e.song)

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
          <p className="playlist-meta">{downloadCount} songs tracked in your library</p>
        </div>
      </motion.div>

      {downloadMetadataError ? <p className="login-error">{downloadMetadataError}</p> : null}

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
              removeTitle="Remove download"
              onRemove={() => handleRemove(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
