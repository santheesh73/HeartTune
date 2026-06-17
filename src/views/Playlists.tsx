import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight, ListMusic, Plus } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { usePlaylists } from '../hooks/usePlaylists'

export default function Playlists() {
  const { isAuthenticated } = useAuth()
  const { playlists, loading, error, createPlaylist } = usePlaylists()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isAuthenticated) return <Navigate to="/login" replace />

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return

    setSubmitting(true)
    const result = await createPlaylist(name.trim(), description.trim())
    if (!result.error) {
      setName('')
      setDescription('')
    }
    setSubmitting(false)
  }

  return (
    <div className="page">
      <motion.div
        className="playlist-hero gradient-dark"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="playlist-hero-icon">
          <ListMusic size={48} />
        </div>
        <div>
          <p className="playlist-type">Your Library</p>
          <h1>Playlists</h1>
          <p className="playlist-meta">{playlists.length} playlists</p>
        </div>
      </motion.div>

      <form className="playlist-create-card" onSubmit={handleSubmit}>
        <div className="playlist-create-header">
          <div className="playlist-create-icon">
            <Plus size={22} />
          </div>
          <div>
            <h3>Create a playlist</h3>
            <p>Save your favorite JioSaavn tracks into a playlist stored in Supabase.</p>
          </div>
        </div>

        <div className="playlist-create-fields">
          <input
            type="text"
            placeholder="Playlist name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={50}
            required
          />
          <input
            type="text"
            placeholder="Short description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={120}
          />
          <button type="submit" className="play-all-btn" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Playlist'}
          </button>
        </div>

        {error ? <p className="login-error">{error}</p> : null}
      </form>

      {loading ? (
        <div className="loading-list">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton-row" />
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <div className="empty-state">
          <ListMusic size={56} />
          <h2>No playlists yet</h2>
          <p>Create your first playlist and start adding songs from search, albums, or liked songs.</p>
        </div>
      ) : (
        <div className="library-cards playlist-cards">
          {playlists.map((playlist, index) => (
            <motion.div
              key={playlist.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.06 }}
            >
              <Link to={`/playlists/${playlist.id}`} className="library-card gradient-dark">
                <div className="library-card-icon">
                  <ListMusic size={32} />
                </div>
                <div>
                  <h2>{playlist.name}</h2>
                  <p>{playlist.songCount || 0} songs</p>
                </div>
                <ChevronRight size={24} className="library-card-arrow" />
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
