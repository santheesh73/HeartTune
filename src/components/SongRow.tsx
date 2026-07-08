import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, Download, Loader2, Trash2, Plus, ListStart, ListEnd, ListPlus, Play, Pause } from 'lucide-react'
import { getArtistNames } from '../api/saavn'
import { formatDuration } from '../utils/format'
import type { Song } from '../types'
import { usePlayer } from '../context/PlayerContext'
import { useLibrary } from '../context/LibraryContext'
import SongArtwork from './SongArtwork'
import AddToPlaylistModal from './AddToPlaylistModal'

interface SongRowProps {
  song: Song
  index: number
  queue?: Song[]
  showActions?: boolean
  showMobileDownload?: boolean
  showMobileRemove?: boolean
  hideDesktopDownload?: boolean
  hideDesktopRemove?: boolean
  compactDesktopActions?: boolean
  showCompactQueue?: boolean
  removeTitle?: string
  onRemove?: () => void
  onDownloadComplete?: () => void
}

export default function SongRow({
  song,
  index,
  queue,
  showActions = true,
  showMobileDownload = false,
  showMobileRemove = false,
  hideDesktopDownload = false,
  hideDesktopRemove = false,
  compactDesktopActions = false,
  showCompactQueue = false,
  removeTitle = 'Remove from playlist',
  onRemove,
  onDownloadComplete,
}: SongRowProps) {
  const { playSong, addToQueue, playSongNext, playSongLater, currentSong, isPlaying, togglePlay } = usePlayer()
  const { isLiked, toggleLike, isDownloaded, downloadSong, downloadingIds, removeDownloaded } =
    useLibrary()
  const [swipeEnabled, setSwipeEnabled] = useState(false)
  const [queueMessage, setQueueMessage] = useState('')
  const [isAddToPlaylistModalOpen, setIsAddToPlaylistModalOpen] = useState(false)
  const queueMessageTimerRef = useRef<number | null>(null)

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

  const handlePlayNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    playSongNext(song)
    showQueueMessage('Playing Next')
  }

  const handlePlayLater = (e: React.MouseEvent) => {
    e.stopPropagation()
    playSongLater(song)
    showQueueMessage('Added to Queue')
  }

  const handleDownload = async () => {
    await downloadSong(song)
    onDownloadComplete?.()
  }

  return (
    <motion.div
      className={`song-row ${isCurrent ? 'active' : ''} ${swipeEnabled ? 'swipe-enabled' : ''} ${queueMessage ? 'queue-feedback' : ''} ${showMobileDownload ? 'mobile-download-row' : ''} ${showMobileRemove ? 'mobile-remove-row' : ''}`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={() => playSong(song, queue)}
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
          <>
            <div className="equalizer index-number">
              <span /><span /><span />
            </div>
            <button className="play-icon-btn" onClick={handlePlay} aria-label="Pause song">
              <Pause size={16} fill="currentColor" />
            </button>
          </>
        ) : (
          <>
            <span className="index-number">{index + 1}</span>
            <button className="play-icon-btn" onClick={handlePlay} aria-label="Play song">
              <Play size={16} fill="currentColor" />
            </button>
          </>
        )}
      </span>

      <div className="song-row-info" onClick={handlePlay}>
        <SongArtwork images={song.image} alt={`${song.name} album artwork`} className="song-row-thumb" size="150x150" />
        <div>
          <p className={`song-row-title ${isCurrent ? 'playing' : ''}`}>{song.name}</p>
          <p className="song-row-artist">{getArtistNames(song)}</p>
        </div>
      </div>

      <span className="song-row-album">{song.album?.name}</span>
      <span className="song-row-duration">{formatDuration(song.duration)}</span>

      {showMobileDownload ? (
        downloaded ? (
          <button
            className="icon-btn song-row-mobile-download downloaded"
            onClick={(event) => {
              event.stopPropagation()
              void removeDownloaded(song.id)
            }}
            title="Remove download"
            aria-label={`Remove ${song.name} from downloads`}
          >
            <Download size={18} />
          </button>
        ) : (
          <button
            className="icon-btn song-row-mobile-download"
            onClick={(event) => {
              event.stopPropagation()
              void handleDownload()
            }}
            disabled={downloading}
            title="Download"
            aria-label={`Download ${song.name}`}
          >
            {downloading ? (
              <Loader2 size={18} className="spin" />
            ) : (
              <Download size={18} />
            )}
          </button>
        )
      ) : null}

      {showMobileRemove && onRemove ? (
        <button
          className="icon-btn song-row-mobile-remove"
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
          title={removeTitle}
          aria-label={`${removeTitle}: ${song.name}`}
        >
          <Trash2 size={18} />
        </button>
      ) : null}

      {showActions && (
        <div className="song-row-actions">
          {!compactDesktopActions || showCompactQueue ? (
            <>
              <button
                className="icon-btn"
                onClick={handlePlayNext}
                title="Play Next"
                aria-label={`Play ${song.name} next`}
              >
                <ListStart size={18} />
              </button>
              <button
                className="icon-btn"
                onClick={handlePlayLater}
                title="Play Later"
                aria-label={`Play ${song.name} later`}
              >
                <ListEnd size={18} />
              </button>
              <button
                className="icon-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsAddToPlaylistModalOpen(true)
                }}
                title="Add to playlist"
                aria-label={`Add ${song.name} to playlist`}
              >
                <Plus size={18} />
              </button>
            </>
          ) : null}

          {compactDesktopActions ? null : (
            <button
              className={`icon-btn ${liked ? 'liked' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                void toggleLike(song)
              }}
              title={liked ? 'Remove from liked' : 'Like'}
            >
              <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
            </button>
          )}

          {onRemove && !hideDesktopRemove ? (
            <button
              className="icon-btn"
              onClick={onRemove}
              title={removeTitle}
              aria-label={`${removeTitle}: ${song.name}`}
            >
              <Trash2 size={18} />
            </button>
          ) : null}

          {hideDesktopRemove ? null : hideDesktopDownload ? null : downloaded ? (
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
              onClick={() => void handleDownload()}
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
        </div>
      )}

      {isAddToPlaylistModalOpen && (
        <AddToPlaylistModal
          isOpen={isAddToPlaylistModalOpen}
          onClose={() => setIsAddToPlaylistModalOpen(false)}
          song={song}
        />
      )}
    </motion.div>
  )
}
