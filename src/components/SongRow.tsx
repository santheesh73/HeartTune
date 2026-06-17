import { motion } from 'framer-motion'
import { Play, Pause, Heart, Download, Loader2, Trash2 } from 'lucide-react'
import { getBestImage, getArtistNames } from '../api/saavn'
import { formatDuration } from '../utils/format'
import type { Song } from '../types'
import { usePlayer } from '../context/PlayerContext'
import { useLibrary } from '../context/LibraryContext'

interface SongRowProps {
  song: Song
  index: number
  queue?: Song[]
  showActions?: boolean
  onRemove?: () => void
}

export default function SongRow({
  song,
  index,
  queue,
  showActions = true,
  onRemove,
}: SongRowProps) {
  const { playSong, currentSong, isPlaying, togglePlay } = usePlayer()
  const { isLiked, toggleLike, isDownloaded, downloadSong, downloadingIds, removeDownloaded } =
    useLibrary()

  const image = getBestImage(song.image, '150x150')
  const isCurrent = currentSong?.id === song.id
  const liked = isLiked(song.id)
  const downloaded = isDownloaded(song.id)
  const downloading = downloadingIds.has(song.id)

  const handlePlay = () => {
    if (isCurrent) togglePlay()
    else playSong(song, queue)
  }

  return (
    <motion.div
      className={`song-row ${isCurrent ? 'active' : ''}`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      onDoubleClick={() => playSong(song, queue)}
    >
      <span className="song-row-index">
        {isCurrent && isPlaying ? (
          <div className="equalizer">
            <span /><span /><span />
          </div>
        ) : (
          index + 1
        )}
      </span>

      <div className="song-row-info" onClick={handlePlay}>
        <img src={image} alt="" className="song-row-thumb" />
        <div>
          <p className={`song-row-title ${isCurrent ? 'playing' : ''}`}>{song.name}</p>
          <p className="song-row-artist">{getArtistNames(song)}</p>
        </div>
      </div>

      <span className="song-row-album">{song.album?.name}</span>
      <span className="song-row-duration">{formatDuration(song.duration)}</span>

      {showActions && (
        <div className="song-row-actions">
          <button
            className={`icon-btn ${liked ? 'liked' : ''}`}
            onClick={() => void toggleLike(song)}
            title={liked ? 'Remove from liked' : 'Like'}
          >
            <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
          </button>

          {onRemove ? (
            <button className="icon-btn" onClick={onRemove} title="Remove from playlist">
              <Trash2 size={18} />
            </button>
          ) : downloaded ? (
            <button
              className="icon-btn downloaded"
              onClick={() => removeDownloaded(song.id)}
              title="Remove download"
            >
              <Download size={18} />
            </button>
          ) : (
            <button
              className="icon-btn"
              onClick={() => downloadSong(song)}
              disabled={downloading}
              title="Download"
            >
              {downloading ? (
                <Loader2 size={18} className="spin" />
              ) : (
                <Download size={18} />
              )}
            </button>
          )}

          <button className="icon-btn play-btn" onClick={handlePlay}>
            {isCurrent && isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
        </div>
      )}
    </motion.div>
  )
}
