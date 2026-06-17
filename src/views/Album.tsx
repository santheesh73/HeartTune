import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Play, Shuffle } from 'lucide-react'
import { getAlbum, getBestImage } from '../api/saavn'
import type { Album } from '../types'
import { usePlayer } from '../context/PlayerContext'
import SongRow from '../components/SongRow'

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>()
  const [album, setAlbum] = useState<Album | null>(null)
  const [loading, setLoading] = useState(true)
  const { playSong } = usePlayer()

  useEffect(() => {
    if (!id) return
    getAlbum(id)
      .then((data) => setAlbum(data || null))
      .catch(() => setAlbum(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="page">
        <div className="skeleton-hero" />
        <div className="loading-list">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-row" />
          ))}
        </div>
      </div>
    )
  }

  if (!album) {
    return (
      <div className="empty-state">
        <h2>Album not found</h2>
      </div>
    )
  }

  const songs = album.songs || []
  const image = getBestImage(album.image, '500x500')
  const artists = album.artists?.primary?.map((a) => a.name).join(', ')

  const shufflePlay = () => {
    if (!songs.length) return
    const shuffled = [...songs].sort(() => Math.random() - 0.5)
    playSong(shuffled[0], shuffled)
  }

  return (
    <div className="page album-page">
      <motion.div
        className="album-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <img src={image} alt={album.name} className="album-hero-image" />
        <div>
          <p className="playlist-type">Album</p>
          <h1>{album.name}</h1>
          <p className="playlist-meta">
            {artists} · {album.year} · {songs.length} songs
          </p>
        </div>
      </motion.div>

      <div className="album-actions">
        <motion.button
          className="play-all-btn large"
          onClick={() => songs.length && playSong(songs[0], songs)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Play size={20} fill="currentColor" /> Play
        </motion.button>
        <button className="shuffle-btn" onClick={shufflePlay}>
          <Shuffle size={20} /> Shuffle
        </button>
      </div>

      <div className="song-list">
        <div className="song-list-header">
          <span>#</span>
          <span>Title</span>
          <span>Album</span>
          <span>Duration</span>
          <span />
        </div>
        {songs.map((song, i) => (
          <SongRow key={song.id} song={song} index={i} queue={songs} />
        ))}
      </div>
    </div>
  )
}
