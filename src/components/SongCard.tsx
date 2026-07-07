import { motion } from 'framer-motion'
import { ListPlus, Play, ListMusic } from 'lucide-react'
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
  const isCurrent = currentSong?.id === song.id

  const handleAddToQueue = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setQueueMessage(addToQueue(song) ? 'Added to queue' : 'Already in queue')
    window.setTimeout(() => setQueueMessage(''), 1500)
  }

  return (
    <motion.div
      className="song-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 6) * 0.03 }}
      whileHover={{ y: -6 }}
      onClick={() => playSong(song, queue || [song])}
    >
      <div className="song-card-image-wrap">
        <SongArtwork
          images={song.image}
          alt={song.name}
          className="song-card-image"
          size="500x500"
          loading={eager ? 'eager' : 'lazy'}
        />
        <motion.button
          className={`queue-overlay ${queueMessage ? 'visible' : ''}`}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleAddToQueue}
          title={queueMessage || 'Add to queue'}
        >
          <ListPlus size={20} />
        </motion.button>
        <motion.button
          className="playlist-overlay"
          style={{ position: 'absolute', top: '8px', right: '40px', zIndex: 10, background: 'rgba(0,0,0,0.5)', padding: '6px', borderRadius: '50%', color: 'white', opacity: 0 }}
          whileHover={{ scale: 1.08, opacity: 1 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation()
            setIsPlaylistModalOpen(true)
          }}
          title="Add to playlist"
        >
          <ListMusic size={20} />
        </motion.button>
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
      <h3 className="song-card-title">{song.name}</h3>
      <p className="song-card-artist">{queueMessage || getArtistNames(song)}</p>

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
