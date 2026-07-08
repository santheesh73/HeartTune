import { motion } from 'framer-motion'
import { ListPlus, Play, ListMusic, MoreVertical } from 'lucide-react'
import { getArtistNames } from '../api/saavn'
import type { Song } from '../types'
import { usePlayer } from '../context/PlayerContext'
import { useState } from 'react'
import SongArtwork from './SongArtwork'
import AddToPlaylistModal from './AddToPlaylistModal'

interface SongCardProps {
  song: Song
  queue?: Song[]
  index?: number
  eager?: boolean
}

export default function SongCard({ song, queue, index = 0, eager = false }: SongCardProps) {
  const { playSong, addToQueue, currentSong, isPlaying } = usePlayer()
  const [queueMessage, setQueueMessage] = useState('')
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const isCurrent = currentSong?.id === song.id

  const handleAddToQueue = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setQueueMessage(addToQueue(song) ? 'Added to queue' : 'Already in queue')
    window.setTimeout(() => setQueueMessage(''), 1500)
  }

  return (
    <motion.div
      className="song-card hover:-translate-y-1.5 transition-transform duration-200"
      style={{ zIndex: isMenuOpen ? 50 : 1, position: 'relative' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 6) * 0.03 }}
      role="button"
      tabIndex={0}
      onClick={() => {
        setIsMenuOpen(false)
        playSong(song, queue || [song])
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          setIsMenuOpen(false)
          playSong(song, queue || [song])
        }
      }}
    >
      <div 
        className="song-card-image-wrap"
        onClick={(e) => {
          e.stopPropagation()
          setIsMenuOpen(false)
          playSong(song, queue || [song])
        }}
      >
        <SongArtwork
          images={song.image}
          alt={song.name}
          className="song-card-image"
          size="500x500"
          loading={eager ? 'eager' : 'lazy'}
        />
        <motion.button
          className={`play-overlay ${isCurrent && isPlaying ? 'playing' : ''}`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={(event) => {
            event.stopPropagation()
            playSong(song, queue || [song])
          }}
        >
          <Play size={24} fill="currentColor" />
        </motion.button>
      </div>
      
      <div className="flex justify-between items-start mt-2 relative">
        <div className="flex-1 overflow-hidden pr-2">
          <h3 className="song-card-title truncate" title={song.name}>{song.name}</h3>
          <p className="song-card-artist truncate" title={getArtistNames(song)}>{queueMessage || getArtistNames(song)}</p>
        </div>
        
        <div className="relative">
          <button 
            className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              setIsMenuOpen(!isMenuOpen)
            }}
          >
            <MoreVertical size={16} />
          </button>
          
          {isMenuOpen && (
            <div 
              style={{
                position: 'absolute',
                left: '100%',
                bottom: '0',
                marginLeft: '8px',
                width: '180px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                padding: '8px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  width: '100%',
                  textAlign: 'left',
                  fontSize: '0.95rem',
                  color: 'var(--text-primary)',
                  borderRadius: '8px',
                  background: 'transparent',
                  transition: 'background 0.2s',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  border: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={(e) => {
                  e.stopPropagation()
                  setIsMenuOpen(false)
                  handleAddToQueue(e)
                }}
              >
                <ListPlus size={18} /> Add to queue
              </button>
              <button 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  width: '100%',
                  textAlign: 'left',
                  fontSize: '0.95rem',
                  color: 'var(--text-primary)',
                  borderRadius: '8px',
                  background: 'transparent',
                  transition: 'background 0.2s',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  border: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={(e) => {
                  e.stopPropagation()
                  setIsMenuOpen(false)
                  setIsPlaylistModalOpen(true)
                }}
              >
                <ListMusic size={18} /> Add to playlist
              </button>
            </div>
          )}
        </div>
      </div>

      {isPlaylistModalOpen && (
        <AddToPlaylistModal
          isOpen={isPlaylistModalOpen}
          onClose={() => setIsPlaylistModalOpen(false)}
          song={song}
        />
      )}
    </motion.div>
  )
}
