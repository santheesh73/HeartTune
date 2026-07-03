import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Play, Shuffle, Edit, Trash2 } from 'lucide-react'
import { getPlaylistById, deletePlaylist, removeSongFromPlaylist } from '../services/playlistService'
import { useAuth } from '../hooks/useAuth'
import { useLibrary } from '../context/LibraryContext'
import { usePlayer } from '../context/PlayerContext'
import type { UserPlaylist } from '../types'
import SongRow from '../components/SongRow'
import PlaylistModal from '../components/PlaylistModal'

export default function PlaylistPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { refreshPlaylists } = useLibrary()
  const { playSong } = usePlayer()

  const [playlist, setPlaylist] = useState<UserPlaylist | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (!id || !user) return
    let mounted = true
    setLoading(true)
    getPlaylistById(user.id, id)
      .then((data) => {
        if (mounted) setPlaylist(data || null)
      })
      .catch(() => {
        if (mounted) setPlaylist(null)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [id, user, refreshPlaylists]) // Refetch if playlists refresh

  const handleDelete = async () => {
    if (!playlist || !window.confirm('Are you sure you want to delete this playlist?')) return
    await deletePlaylist(playlist.id)
    await refreshPlaylists()
    navigate('/library')
  }

  const handleRemoveSong = async (songId: string) => {
    if (!playlist) return
    await removeSongFromPlaylist(playlist.id, songId)
    setPlaylist(prev => prev ? { ...prev, songs: prev.songs?.filter(s => s.id !== songId) } : null)
    await refreshPlaylists()
  }

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

  if (!playlist) {
    return (
      <div className="page">
        <div className="empty-state">
          <h2>Playlist not found</h2>
        </div>
      </div>
    )
  }

  const songs = playlist.songs || []

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
        {playlist.cover_image ? (
          <img
            src={playlist.cover_image}
            alt={playlist.name}
            className="album-hero-image"
          />
        ) : (
          <div className="album-hero-image bg-white/5 flex items-center justify-center border border-white/10 rounded-lg">
            <span className="text-white/30 text-4xl font-bold">{playlist.name.charAt(0)}</span>
          </div>
        )}
        
        <div className="flex-1">
          <p className="playlist-type">{playlist.is_public ? 'Public Playlist' : 'Private Playlist'}</p>
          <h1 className="text-5xl font-bold mb-4">{playlist.name}</h1>
          <p className="playlist-meta text-white/70 mb-4">{playlist.description}</p>
          <p className="playlist-meta">{songs.length} songs</p>
        </div>
      </motion.div>

      <div className="flex items-center justify-between mb-8">
        <div className="album-actions flex gap-4">
          <motion.button
            className="play-all-btn large"
            onClick={() => songs.length && playSong(songs[0], songs)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={!songs.length}
          >
            <Play size={20} fill="currentColor" /> Play
          </motion.button>
          <button className="shuffle-btn" onClick={shufflePlay} disabled={!songs.length}>
            <Shuffle size={20} /> Shuffle
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsEditing(true)} className="p-2 text-white/50 hover:text-white transition">
            <Edit size={20} />
          </button>
          <button onClick={handleDelete} className="p-2 text-white/50 hover:text-red-500 transition">
            <Trash2 size={20} />
          </button>
        </div>
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
          <SongRow 
            key={song.id} 
            song={song} 
            index={i} 
            queue={songs} 
            onRemove={() => handleRemoveSong(song.id)}
          />
        ))}
        {!songs.length && (
          <div className="text-center py-12 text-white/50">
            No songs added yet.
          </div>
        )}
      </div>

      <PlaylistModal isOpen={isEditing} onClose={() => setIsEditing(false)} playlist={playlist} />
    </div>
  )
}
