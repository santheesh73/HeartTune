import { motion } from 'framer-motion'
import { Heart, Play } from 'lucide-react'
import { useLibrary } from '../context/LibraryContext'
import { usePlayer } from '../context/PlayerContext'
import SongRow from '../components/SongRow'

export default function LikedSongs() {
  const { likedSongs } = useLibrary()
  const { playSong } = usePlayer()

  return (
    <div className="page liked-page">
      <motion.div
        className="playlist-hero gradient-red"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="playlist-hero-icon">
          <Heart size={48} fill="currentColor" />
        </div>
        <div>
          <p className="playlist-type">Playlist</p>
          <h1>Liked Songs</h1>
          <p className="playlist-meta">{likedSongs.length} songs</p>
        </div>
      </motion.div>

      {likedSongs.length > 0 && (
        <motion.button
          className="play-all-btn large"
          onClick={() => playSong(likedSongs[0], likedSongs)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Play size={20} fill="currentColor" /> Play All
        </motion.button>
      )}

      {likedSongs.length === 0 ? (
        <div className="empty-state">
          <Heart size={64} />
          <h2>Songs you like will appear here</h2>
          <p>Tap the heart icon on any song to save it</p>
        </div>
      ) : (
        <div className="song-list">
          <div className="song-list-header">
            <span>#</span>
            <span>Title</span>
            <span>Album</span>
            <span>Duration</span>
            <span />
          </div>
          {likedSongs.map((song, i) => (
            <SongRow key={song.id} song={song} index={i} queue={likedSongs} />
          ))}
        </div>
      )}
    </div>
  )
}
