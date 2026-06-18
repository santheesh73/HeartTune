import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Heart,
  Maximize2,
  Minimize2,
  MoreVertical,
  ListMusic,
  X,
} from 'lucide-react'
import { getBestImage, getArtistNames, getSongDuration } from '../api/saavn'
import { formatDuration } from '../utils/format'
import { extractSongTheme, type SongTheme } from '../utils/theme'
import { usePlayer } from '../context/PlayerContext'
import { useLibrary } from '../context/LibraryContext'
import { useEffect, useState, type CSSProperties } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'

const DEFAULT_THEME: SongTheme = {
  accent: 'rgb(225, 29, 72)',
  accentSoft: 'rgba(225, 29, 72, 0.16)',
  accentGlow: 'rgba(225, 29, 72, 0.34)',
  surface: 'rgb(54, 16, 24)',
  surfaceStrong: 'rgb(16, 10, 12)',
}

export default function PlayerBar() {
  const isMobile = useIsMobile()
  const {
    currentSong,
    queue,
    queueIndex,
    isPlaying,
    progress,
    duration,
    volume,
    shuffle,
    repeat,
    playQueueAt,
    removeFromQueue,
    togglePlay,
    playNext,
    playPrev,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
  } = usePlayer()

  const { isLiked, toggleLike } = useLibrary()
  const [expanded, setExpanded] = useState(false)
  const [muted, setMuted] = useState(false)
  const [prevVolume, setPrevVolume] = useState(volume)
  const [theme, setTheme] = useState<SongTheme>(DEFAULT_THEME)
  const [showQueue, setShowQueue] = useState(false)
  const image = currentSong ? getBestImage(currentSong.image, '150x150') : ''
  const fullscreenImage = currentSong ? getBestImage(currentSong.image, '500x500') || image : ''
  const upcomingQueue = queue.filter((_, index) => index > queueIndex)

  useEffect(() => {
    if (!expanded) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false)
    }

    window.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [expanded])

  useEffect(() => {
    if (!currentSong) return

    let cancelled = false

    const updateTheme = async () => {
      const nextTheme = await extractSongTheme(
        fullscreenImage || image,
        `${currentSong.id}-${currentSong.name}`
      )

      if (!cancelled) setTheme(nextTheme)
    }

    void updateTheme()

    return () => {
      cancelled = true
    }
  }, [currentSong, fullscreenImage, image])

  if (!currentSong) return null
  const liked = isLiked(currentSong.id)
  const totalDuration = getSongDuration(currentSong, duration)
  const progressPct = totalDuration ? (progress / totalDuration) * 100 : 0

  const toggleMute = () => {
    if (muted) {
      setVolume(prevVolume)
      setMuted(false)
    } else {
      setPrevVolume(volume)
      setVolume(0)
      setMuted(true)
    }
  }

  const themedStyle = {
    '--song-accent': (currentSong ? theme : DEFAULT_THEME).accent,
    '--song-accent-soft': (currentSong ? theme : DEFAULT_THEME).accentSoft,
    '--song-accent-glow': (currentSong ? theme : DEFAULT_THEME).accentGlow,
    '--song-surface': (currentSong ? theme : DEFAULT_THEME).surface,
    '--song-surface-strong': (currentSong ? theme : DEFAULT_THEME).surfaceStrong,
  } as CSSProperties

  return (
    <AnimatePresence>
      <>
        <motion.footer
          className="player-bar"
          style={themedStyle}
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
        >
          {isMobile ? (
            <div className="mobile-mini-player">
              <div
                className="mobile-mini-player-card"
                role="button"
                tabIndex={0}
                onClick={() => setExpanded(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setExpanded(true)
                  }
                }}
              >
                <img src={image} alt="" className="player-thumb mobile-mini-thumb" />
                <div className="player-track-info mobile-mini-info">
                  <p className="player-title">{currentSong.name}</p>
                  <p className="player-artist">{getArtistNames(currentSong)}</p>
                </div>
                <div className="mobile-mini-actions">
                  <button
                    className={`icon-btn mobile-mini-like ${liked ? 'liked' : ''}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      void toggleLike(currentSong)
                    }}
                    aria-label={liked ? 'Remove from liked songs' : 'Like song'}
                  >
                    <Heart size={20} fill={liked ? 'currentColor' : 'none'} />
                  </button>
                  <motion.button
                    className="play-btn-main mobile-mini-play"
                    onClick={(event) => {
                      event.stopPropagation()
                      togglePlay()
                    }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause size={24} fill="currentColor" />
                    ) : (
                      <Play size={24} fill="currentColor" />
                    )}
                  </motion.button>
                </div>
              </div>

              <div
                className="progress-bar mobile-mini-progress"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const pct = (e.clientX - rect.left) / rect.width
                  seek(pct * totalDuration)
                }}
              >
                <div className="progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          ) : (
            <>
              <div className="player-track">
                <img src={image} alt="" className="player-thumb" />
                <div
                  className="player-track-info"
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpanded(true)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setExpanded(true)
                    }
                  }}
                >
                  <p className="player-title">{currentSong.name}</p>
                  <p className="player-artist">{getArtistNames(currentSong)}</p>
                </div>
                <button className="icon-btn mobile-expand-btn" onClick={() => setExpanded(true)} title="Expand player">
                  <Maximize2 size={18} />
                </button>
                <button
                  className={`icon-btn ${liked ? 'liked' : ''}`}
                  onClick={() => void toggleLike(currentSong)}
                >
                  <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
                </button>
              </div>

              <div className="player-controls">
                <div className="player-buttons">
                  <button
                    className={`icon-btn ${shuffle ? 'active' : ''}`}
                    onClick={toggleShuffle}
                  >
                    <Shuffle size={18} />
                  </button>
                  <button className="icon-btn" onClick={playPrev}>
                    <SkipBack size={20} fill="currentColor" />
                  </button>
                  <motion.button
                    className="play-btn-main"
                    onClick={togglePlay}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isPlaying ? (
                      <Pause size={24} fill="currentColor" />
                    ) : (
                      <Play size={24} fill="currentColor" />
                    )}
                  </motion.button>
                  <button className="icon-btn" onClick={playNext}>
                    <SkipForward size={20} fill="currentColor" />
                  </button>
                    <button
                      className={`icon-btn ${repeat !== 'off' ? 'active' : ''}`}
                      onClick={toggleRepeat}
                    >
                      <Repeat size={18} />
                    </button>
                </div>

                <div className="progress-bar-wrap">
                  <span className="time">{formatDuration(progress)}</span>
                  <div
                    className="progress-bar"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const pct = (e.clientX - rect.left) / rect.width
                      seek(pct * totalDuration)
                    }}
                  >
                    <div className="progress-fill" style={{ width: `${progressPct}%` }}>
                      <div className="progress-thumb" />
                    </div>
                  </div>
                  <span className="time">{formatDuration(totalDuration)}</span>
                </div>
              </div>

              <div className="player-extra">
                <button className="icon-btn" onClick={() => setExpanded(true)}>
                  <Maximize2 size={18} />
                </button>
                <button className={`icon-btn ${showQueue ? 'active' : ''}`} onClick={() => setShowQueue((value) => !value)}>
                  <ListMusic size={18} />
                </button>
                <button className="icon-btn" onClick={toggleMute}>
                  {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value))
                    setMuted(false)
                  }}
                  className="volume-slider"
                />
              </div>
            </>
          )}

          {showQueue ? (
            <div className="player-queue-panel">
              <div className="player-queue-header">
                <span>Up Next</span>
                <span>{upcomingQueue.length} songs</span>
              </div>
              {upcomingQueue.length ? (
                <div className="player-queue-list">
                  {upcomingQueue.map((song, index) => (
                    <div
                      key={`${song.id}-${queueIndex + index + 1}`}
                      className="player-queue-item"
                      role="button"
                      tabIndex={0}
                      onClick={() => playQueueAt(queueIndex + index + 1)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          playQueueAt(queueIndex + index + 1)
                        }
                      }}
                    >
                      <img src={getBestImage(song.image, '150x150')} alt="" className="player-queue-thumb" />
                      <span className="player-queue-meta">
                        <strong>{song.name}</strong>
                        <small>{getArtistNames(song)}</small>
                      </span>
                      <button
                        type="button"
                        className="player-queue-remove"
                        title="Remove from queue"
                        aria-label={`Remove ${song.name} from queue`}
                        onClick={(event) => {
                          event.stopPropagation()
                          removeFromQueue(queueIndex + index + 1)
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="player-queue-empty">Add songs to queue from any song card or row.</p>
              )}
            </div>
          ) : null}
        </motion.footer>

        <AnimatePresence>
          {expanded && (
            <motion.div
              className="player-fullscreen"
              style={themedStyle}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="player-fullscreen-bg">
                <img src={fullscreenImage} alt="" />
                <div className="player-fullscreen-overlay"></div>
              </div>

              <div className="player-fullscreen-content-wrapper min-h-screen h-screen w-full flex flex-col justify-between">
                <div className="player-fullscreen-topbar">
                  <button
                    className="icon-btn fullscreen-minimize-btn"
                    onClick={() => setExpanded(false)}
                    title="Minimize player"
                    aria-label="Minimize player"
                  >
                    <Minimize2 size={24} color="white" />
                  </button>
                  <div className="player-fullscreen-header-text">
                    <p className="kicker">Playing From:</p>
                    <p className="context">HeartTune</p>
                  </div>
                  {isMobile ? (
                    <button className="icon-btn">
                      <MoreVertical size={24} color="white" />
                    </button>
                  ) : (
                    <span className="player-fullscreen-header-spacer" aria-hidden="true" />
                  )}
                </div>

                <div className="player-fullscreen-main h-screen w-full flex flex-col flex-1">
                  <div className="player-fullscreen-stage">
                    <div className="player-fullscreen-middle flex-1">
                      <motion.div
                        className="player-fullscreen-art-shell"
                        animate={{ scale: [1, 1.015, 1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <img src={fullscreenImage} alt="" className="player-fullscreen-artwork" />
                      </motion.div>
                    </div>
                  </div>

                  <div className="player-fullscreen-bottom">
                    <div className="player-fullscreen-info-row">
                      <div className="player-fullscreen-middle-info">
                        <h2 className="title">{currentSong.name}</h2>
                        <p className="artist">{getArtistNames(currentSong)}</p>
                      </div>
                      <button
                        className={`icon-btn fullscreen-heart-btn ${liked ? 'liked' : ''}`}
                        onClick={() => void toggleLike(currentSong)}
                        title={liked ? 'Remove from liked' : 'Like song'}
                      >
                        <Heart size={24} fill={liked ? 'currentColor' : 'none'} />
                      </button>
                    </div>

                    <div className="player-fullscreen-progress">
                      <div className="player-fullscreen-progress-row">
                        <span className="time">{formatDuration(progress)}</span>
                        <div
                          className="progress-bar player-fullscreen-progress-bar"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            const pct = (e.clientX - rect.left) / rect.width
                            seek(pct * totalDuration)
                          }}
                        >
                          <div className="progress-fill" style={{ width: `${progressPct}%` }}>
                            <div className="progress-thumb" />
                          </div>
                        </div>
                        <span className="time">{formatDuration(totalDuration)}</span>
                      </div>
                      <div className="player-fullscreen-times" aria-hidden="true">
                        <span className="time">{formatDuration(progress)}</span>
                        <span className="time">{formatDuration(totalDuration)}</span>
                      </div>
                    </div>

                    <div className="player-fullscreen-controls">
                      <button className={`icon-btn control-btn ${shuffle ? 'active' : ''}`} onClick={toggleShuffle}>
                        <Shuffle size={24} />
                      </button>
                      <button className="icon-btn control-btn" onClick={playPrev}>
                        <SkipBack size={30} fill="white" color="white" />
                      </button>
                      <motion.button
                        className="play-btn-circle"
                        onClick={togglePlay}
                        whileHover={{ scale: 1.05, boxShadow: '0 0 32px rgba(255, 45, 85, 0.45)' }}
                        whileTap={{ scale: 0.96 }}
                      >
                        {isPlaying ? (
                          <Pause size={34} fill="white" color="white" />
                        ) : (
                          <Play size={34} fill="white" color="white" />
                        )}
                      </motion.button>
                      <button className="icon-btn control-btn" onClick={playNext}>
                        <SkipForward size={30} fill="white" color="white" />
                      </button>
                      <button className={`icon-btn control-btn ${repeat !== 'off' ? 'active' : ''}`} onClick={toggleRepeat}>
                        <Repeat size={24} />
                      </button>
                    </div>

                    <div className="player-fullscreen-queue">
                      <div className="player-queue-header">
                        <span>Up Next</span>
                        <span>{upcomingQueue.length} songs</span>
                      </div>
                      {upcomingQueue.length ? (
                        <div className="player-queue-list fullscreen">
                          {upcomingQueue.map((song, index) => (
                            <div
                              key={`${song.id}-${queueIndex + index + 1}-fullscreen`}
                              className="player-queue-item"
                              role="button"
                              tabIndex={0}
                              onClick={() => playQueueAt(queueIndex + index + 1)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  playQueueAt(queueIndex + index + 1)
                                }
                              }}
                            >
                              <img src={getBestImage(song.image, '150x150')} alt="" className="player-queue-thumb" />
                              <span className="player-queue-meta">
                                <strong>{song.name}</strong>
                                <small>{getArtistNames(song)}</small>
                              </span>
                              <button
                                type="button"
                                className="player-queue-remove"
                                title="Remove from queue"
                                aria-label={`Remove ${song.name} from queue`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  removeFromQueue(queueIndex + index + 1)
                                }}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="player-queue-empty">Your queue will appear here.</p>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    </AnimatePresence>
  )
}
