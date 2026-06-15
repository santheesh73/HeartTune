import { motion } from 'framer-motion'
import { Play } from 'lucide-react'
import { getBestImage } from '../api/saavn'
import type { Song } from '../types'
import { usePlayer } from '../context/PlayerContext'

interface SongCardProps {
  song: Song
  queue?: Song[]
  index?: number
}

export default function SongCard({ song, queue, index = 0 }: SongCardProps) {
  const { playSong, currentSong, isPlaying } = usePlayer()
  const image = getBestImage(song.image, '500x500')
  const isCurrent = currentSong?.id === song.id

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
        <img src={image} alt={song.name} className="song-card-image" loading="lazy" />
        <motion.button
          className={`play-overlay ${isCurrent && isPlaying ? 'playing' : ''}`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Play size={24} fill="currentColor" />
        </motion.button>
      </div>
      <h3 className="song-card-title">{song.name}</h3>
      <p className="song-card-artist">
        {song.artists?.primary?.map((a) => a.name).join(', ')}
      </p>
    </motion.div>
  )
}
