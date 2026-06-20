import { motion } from 'framer-motion'
import { ListPlus, Play } from 'lucide-react'
import { getArtistNames } from '../api/saavn'
import type { Song } from '../types'
import { usePlayer } from '../context/PlayerContext'
import { useState } from 'react'
import SongArtwork from './SongArtwork'

interface SongCardProps {
  song: Song
  queue?: Song[]
  index?: number
  eager?: boolean
}

export default function SongCard({ song, queue, index = 0, eager = false }: SongCardProps) {
  const { playSong, addToQueue, currentSong, isPlaying } = usePlayer()
  const [queueMessage, setQueueMessage] = useState('')
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
      transition={{ delay: index * 0.05 }}
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
    </motion.div>
  )
}
