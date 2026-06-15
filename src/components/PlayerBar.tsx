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
  Repeat1,
  Heart,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { getBestImage, getArtistNames, getSongDuration } from '../api/saavn'
import { formatDuration } from '../utils/format'
import { usePlayer } from '../context/PlayerContext'
import { useLibrary } from '../context/LibraryContext'
import { useEffect, useState } from 'react'

export default function PlayerBar() {
  const {
    currentSong,
    isPlaying,
    progress,
    duration,
    volume,
    shuffle,
    repeat,
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

  if (!currentSong) return null

  const image = getBestImage(currentSong.image, '150x150')
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

  return (
    <AnimatePresence>
      <>
        <motion.footer
          className="player-bar"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
        >
          <div className="player-track">
            <img src={image} alt="" className="player-thumb" />
            <div className="player-track-info">
              <p className="player-title">{currentSong.name}</p>
              <p className="player-artist">{getArtistNames(currentSong)}</p>
            </div>
            <button
              className={`icon-btn ${liked ? 'liked' : ''}`}
              onClick={() => toggleLike(currentSong)}
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
                {repeat === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
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
        </motion.footer>

        <AnimatePresence>
          {expanded && (
            <motion.div
              className="player-fullscreen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="player-fullscreen-backdrop" onClick={() => setExpanded(false)} />
              <motion.div
                className="player-fullscreen-panel"
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <div className="player-fullscreen-topbar">
                  <div>
                    <p className="player-fullscreen-kicker">Now Playing</p>
                    <h2 className="player-fullscreen-heading">HeartWave Player</h2>
                  </div>
                  <button className="icon-btn player-fullscreen-close" onClick={() => setExpanded(false)}>
                    <Minimize2 size={20} />
                  </button>
                </div>

                <div className="player-fullscreen-body">
                  <div className="player-fullscreen-art-wrap">
                    <img src={getBestImage(currentSong.image, '500x500')} alt="" className="player-fullscreen-art" />
                  </div>

                  <div className="player-fullscreen-content">
                    <div className="player-fullscreen-meta">
                      <p className="player-fullscreen-title">{currentSong.name}</p>
                      <p className="player-fullscreen-artist">{getArtistNames(currentSong)}</p>
                    </div>

                    <div className="player-fullscreen-actions">
                      <button
                        className={`icon-btn player-fullscreen-like ${liked ? 'liked' : ''}`}
                        onClick={() => toggleLike(currentSong)}
                      >
                        <Heart size={20} fill={liked ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        className={`icon-btn ${shuffle ? 'active' : ''}`}
                        onClick={toggleShuffle}
                      >
                        <Shuffle size={20} />
                      </button>
                      <button className="icon-btn" onClick={playPrev}>
                        <SkipBack size={24} fill="currentColor" />
                      </button>
                      <motion.button
                        className="play-btn-main player-fullscreen-play"
                        onClick={togglePlay}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isPlaying ? (
                          <Pause size={28} fill="currentColor" />
                        ) : (
                          <Play size={28} fill="currentColor" />
                        )}
                      </motion.button>
                      <button className="icon-btn" onClick={playNext}>
                        <SkipForward size={24} fill="currentColor" />
                      </button>
                      <button
                        className={`icon-btn ${repeat !== 'off' ? 'active' : ''}`}
                        onClick={toggleRepeat}
                      >
                        {repeat === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
                      </button>
                    </div>

                    <div className="player-fullscreen-progress">
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
                      <div className="player-fullscreen-times">
                        <span className="time">{formatDuration(progress)}</span>
                        <span className="time">{formatDuration(totalDuration)}</span>
                      </div>
                    </div>

                    <div className="player-fullscreen-volume">
                      <button className="icon-btn" onClick={toggleMute}>
                        {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
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
                        className="volume-slider player-fullscreen-volume-slider"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    </AnimatePresence>
  )
}
