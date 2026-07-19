import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mic2, Loader } from 'lucide-react'
import { usePlayer, usePlayerProgress } from '../context/PlayerContext'
import { getLyrics, LyricsData } from '../api/lyrics'
import { parseLrc, SyncedLyricLine } from '../utils/lyrics'

interface LyricsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function LyricsPanel({ isOpen, onClose }: LyricsPanelProps) {
  const { currentSong } = usePlayer()
  const { progress } = usePlayerProgress()
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null)
  const [syncedLines, setSyncedLines] = useState<SyncedLyricLine[]>([])
  const [loading, setLoading] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const activeLineRef = useRef<HTMLParagraphElement>(null)

  let activeIndex = -1
  if (syncedLines.length > 0) {
    for (let i = 0; i < syncedLines.length; i++) {
      if (syncedLines[i].time <= progress) {
        activeIndex = i
      } else {
        break
      }
    }
  }

  useEffect(() => {
    if (!isOpen || !currentSong) return
    let mounted = true
    setLoading(true)
    setLyricsData(null)
    setSyncedLines([])

    const fetchLyrics = async () => {
      const artistName = currentSong.artists?.primary?.[0]?.name || ''
      const data = await getLyrics(currentSong.name, artistName)
      
      if (mounted) {
        setLyricsData(data)
        if (data?.syncedLyrics) {
          setSyncedLines(parseLrc(data.syncedLyrics))
        }
        setLoading(false)
      }
    }

    fetchLyrics()

    return () => { mounted = false }
  }, [isOpen, currentSong])

  useEffect(() => {
    if (activeLineRef.current && containerRef.current && !loading) {
      const container = containerRef.current
      const activeLine = activeLineRef.current
      const offsetTop = activeLine.offsetTop
      const scrollTarget = offsetTop - container.clientHeight / 2 + activeLine.clientHeight / 2
      
      container.scrollTo({
        top: scrollTarget,
        behavior: 'smooth'
      })
    }
  }, [activeIndex, loading])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-[#121212] border-l border-white/10 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2 text-[var(--color-primary)]">
                <Mic2 size={20} />
                <h2 className="text-lg font-bold text-white">Lyrics</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-white/50 hover:text-white transition rounded-full hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div ref={containerRef} className="flex-1 overflow-y-auto p-6 pb-32 scrollbar-hide scroll-smooth relative">
              {!currentSong ? (
                <div className="flex h-full items-center justify-center text-white/50 text-center">
                  Play a song to see lyrics
                </div>
              ) : loading ? (
                <div className="flex h-full flex-col items-center justify-center text-white/50 gap-4">
                  <Loader size={32} className="animate-spin text-[var(--color-primary)]" />
                  <p>Searching for lyrics...</p>
                </div>
              ) : syncedLines.length > 0 ? (
                <div className="space-y-6 pt-[30vh]">
                  {syncedLines.map((line, i) => {
                    const isActive = i === activeIndex
                    const isPassed = i < activeIndex
                    
                    return (
                      <p 
                        key={i} 
                        ref={isActive ? activeLineRef : null}
                        className={`text-2xl lg:text-3xl font-bold leading-tight transition-all duration-300 ${
                          isActive 
                            ? 'text-white scale-105 origin-left' 
                            : isPassed
                              ? 'text-white/30'
                              : 'text-white/50 hover:text-white/70'
                        }`}
                      >
                        {line.text || '♪'}
                      </p>
                    )
                  })}
                </div>
              ) : lyricsData?.plainLyrics ? (
                <div className="space-y-6 pt-4">
                  {lyricsData.plainLyrics.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="text-lg leading-relaxed text-white/80 font-medium text-center">
                      {paragraph.split('\n').map((line, j) => (
                        <span key={j}>
                          {line}
                          <br />
                        </span>
                      ))}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-white/50 text-center">
                  No lyrics found for this song
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
