import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mic2, Loader } from 'lucide-react'
import { usePlayer } from '../context/PlayerContext'

interface LyricsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function LyricsPanel({ isOpen, onClose }: LyricsPanelProps) {
  const { currentSong } = usePlayer()
  const [lyrics, setLyrics] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !currentSong) return
    let mounted = true
    setLoading(true)
    setLyrics(null)

    // Mock lyrics fetch - architecture ready for future API
    setTimeout(() => {
      if (mounted) {
        setLyrics(`(Instrumental Intro)\n\nThis is a placeholder for lyrics.\nCurrently the JioSaavn API wrapper doesn't provide synced lyrics.\n\nBut the architecture is ready.\nWe can plug in the lyrics API here.\n\nSong: ${currentSong.name}\nArtist: ${currentSong.artists?.primary?.map(a => a.name).join(', ') || 'Unknown'}\n\n(Chorus)\nLa la la la la\nHeartTune is the best PWA\n\nEnjoy your music!`)
        setLoading(false)
      }
    }, 1000)

    return () => { mounted = false }
  }, [isOpen, currentSong])

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

            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              {!currentSong ? (
                <div className="flex h-full items-center justify-center text-white/50 text-center">
                  Play a song to see lyrics
                </div>
              ) : loading ? (
                <div className="flex h-full flex-col items-center justify-center text-white/50 gap-4">
                  <Loader size={32} className="animate-spin text-[var(--color-primary)]" />
                  <p>Loading lyrics...</p>
                </div>
              ) : lyrics ? (
                <div className="space-y-6">
                  {lyrics.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="text-lg leading-relaxed text-white/90 font-medium">
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
