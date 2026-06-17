import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ListMusic, Play, Trash2 } from 'lucide-react'
import SongRow from '../components/SongRow'
import { useAuth } from '../hooks/useAuth'
import { usePlaylists } from '../hooks/usePlaylists'
import { usePlayer } from '../context/PlayerContext'
import type { UserPlaylist } from '../types'

export default function PlaylistDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { playSong } = usePlayer()
  const { loadPlaylist, removeSongFromPlaylist, deletePlaylist } = usePlaylists()
  const [playlist, setPlaylist] = useState<UserPlaylist | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const data = await loadPlaylist(id)
      if (!data) {
        setError('Playlist not found')
      } else {
        setPlaylist(data)
        setError(null)
      }
      setLoading(false)
    }

    void load()
  }, [id, loadPlaylist])

  if (!isAuthenticated) return <Navigate to="/login" replace />

  const songs = playlist?.songs || []

  const handleRemoveSong = async (songId: string) => {
    if (!playlist) return
    const result = await removeSongFromPlaylist(playlist.id, songId)
    if (!result.error) {
      setPlaylist((prev) =>
        prev
          ? {
              ...prev,
              songs: (prev.songs || []).filter((song) => song.id !== songId),
              songCount: Math.max((prev.songCount || prev.songs?.length || 1) - 1, 0),
            }
          : prev
      )
    }
  }

  const handleDeletePlaylist = async () => {
    if (!playlist) return
    const result = await deletePlaylist(playlist.id)
    if (!result.error) {
      navigate('/playlists')
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="skeleton-hero" />
        <div className="loading-list">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton-row" />
          ))}
        </div>
      </div>
    )
  }

  if (!playlist) {
    return (
      <div className="page">
        <div className="empty-state">
          <ListMusic size={64} />
          <h2>{error || 'Playlist not found'}</h2>
          <Link to="/playlists" className="play-all-btn">Back to Playlists</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <Link to="/playlists" className="back-link">
        <ArrowLeft size={18} />
        <span>Back to Playlists</span>
      </Link>

      <motion.div
        className="playlist-hero gradient-dark"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="playlist-hero-icon">
          <ListMusic size={48} />
        </div>
        <div>
          <p className="playlist-type">Supabase Playlist</p>
          <h1>{playlist.name}</h1>
          <p className="playlist-meta">
            {songs.length} songs
            {playlist.description ? ` | ${playlist.description}` : ''}
          </p>
        </div>
      </motion.div>

      <div className="playlist-toolbar">
        {songs.length > 0 ? (
          <motion.button
            className="play-all-btn large"
            onClick={() => playSong(songs[0], songs)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Play size={20} fill="currentColor" /> Play Playlist
          </motion.button>
        ) : null}

        <button type="button" className="playlist-delete-btn" onClick={handleDeletePlaylist}>
          <Trash2 size={18} />
          <span>Delete Playlist</span>
        </button>
      </div>

      {songs.length === 0 ? (
        <div className="empty-state">
          <ListMusic size={56} />
          <h2>This playlist is empty</h2>
          <p>Add songs from search results or liked songs using the playlist action.</p>
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
          {songs.map((song, index) => (
            <SongRow
              key={`${playlist.id}-${song.id}`}
              song={song}
              index={index}
              queue={songs}
              onRemove={() => void handleRemoveSong(song.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
