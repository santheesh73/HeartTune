import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Heart, Download, Loader2, Trash2, ListPlus } from 'lucide-react'
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
  const { playSong, addToQueue, currentSong, isPlaying, togglePlay } = usePlayer()
  const { isLiked, toggleLike, isDownloaded, downloadSong, downloadingIds, removeDownloaded } =
    useLibrary()
  const [swipeEnabled, setSwipeEnabled] = useState(false)
  const [queueMessage, setQueueMessage] = useState('')
  const queueMessageTimerRef = useRef<number | null>(null)

  const image = getBestImage(song.image, '150x150')
  const isCurrent = currentSong?.id === song.id
  const liked = isLiked(song.id)
  const downloaded = isDownloaded(song.id)
  const downloading = downloadingIds.has(song.id)

  const handlePlay = () => {
    if (isCurrent) togglePlay()
    else playSong(song, queue)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(max-width: 640px) and (pointer: coarse)')
    const updateSwipeState = (event?: MediaQueryListEvent) => {
      setSwipeEnabled(event ? event.matches : mediaQuery.matches)
    }

    updateSwipeState()
    mediaQuery.addEventListener('change', updateSwipeState)

    return () => {
      mediaQuery.removeEventListener('change', updateSwipeState)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (queueMessageTimerRef.current) {
        window.clearTimeout(queueMessageTimerRef.current)
      }
    }
  }, [])

  const showQueueMessage = (message: string) => {
    setQueueMessage(message)
    if (queueMessageTimerRef.current) {
      window.clearTimeout(queueMessageTimerRef.current)
    }
    queueMessageTimerRef.current = window.setTimeout(() => {
      setQueueMessage('')
      queueMessageTimerRef.current = null
    }, 1600)
  }

  const handleQueueGesture = () => {
    const queued = addToQueue(song)
    showQueueMessage(queued ? 'Added to queue' : 'Already in queue')
  }

  return (
    <motion.div
      className={`song-row ${isCurrent ? 'active' : ''} ${swipeEnabled ? 'swipe-enabled' : ''} ${queueMessage ? 'queue-feedback' : ''}`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      onDoubleClick={() => playSong(song, queue)}
      drag={swipeEnabled ? 'x' : false}
      dragConstraints={{ left: 0, right: 120 }}
      dragElastic={0.08}
      dragDirectionLock
      dragSnapToOrigin
      whileDrag={swipeEnabled ? { scale: 0.99 } : undefined}
      onDragEnd={(_event, info) => {
        if (swipeEnabled && info.offset.x >= 96) {
          handleQueueGesture()
        }
      }}
    >
      <div className="song-row-queue-hint" aria-hidden="true">
        <ListPlus size={16} />
        <span>{queueMessage || 'Swipe right to queue'}</span>
      </div>

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
            className="icon-btn"
            onClick={handleQueueGesture}
            title="Add to queue"
          >
            <ListPlus size={18} />
          </button>

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
