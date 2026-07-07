import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { getGenericSections } from '../services/recommendationService'
import { useLanguage } from '../context/LanguageContext'
import { motion } from 'framer-motion'
import { ArrowLeft, ListMusic, Play, Trash2, Edit2, Shuffle } from 'lucide-react'
import SongRow from '../components/SongRow'
import ShareButton from '../components/ShareButton'
import { useAuth } from '../hooks/useAuth'
import { usePlaylists } from '../hooks/usePlaylists'
import { usePlayer } from '../context/PlayerContext'
import type { UserPlaylist } from '../types'
import { formatDuration } from '../utils/format'
import PlaylistModal from '../components/PlaylistModal'
import ConfirmationDialog from '../components/ConfirmationDialog'

export default function PlaylistDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { language } = useLanguage()
  const { playSong } = usePlayer()
  const { loadPlaylist, removeSongFromPlaylist, deletePlaylist } = usePlaylists()
  const [playlist, setPlaylist] = useState<UserPlaylist | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      
      if (id.startsWith('curated-')) {
        const sections = await getGenericSections(language)
        const section = sections.find(s => s.id === id.replace('curated-', ''))
        if (section) {
          setPlaylist({
            id: section.id,
            name: section.title.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim(),
            description: 'Curated by HeartTune',
            is_public: true,
            user_id: 'system',
            created_at: new Date().toISOString(),
            songCount: section.items.length,
            songs: section.items,
            cover_image: section.items[0]?.image.find((img: any) => img.quality === '500x500')?.url || section.items[0]?.image[0]?.url,
          })
          setError(null)
        } else {
          setError('Playlist not found')
        }
      } else {
        const data = await loadPlaylist(id)
        if (!data) {
          setError('Playlist not found')
        } else {
          setPlaylist(data)
          setError(null)
        }
      }
      
      setLoading(false)
    }

    void load()
  }, [id, loadPlaylist])

  if (!isAuthenticated) return <Navigate to="/login" replace />

  const songs = playlist?.songs || []
  const totalDuration = songs.reduce((acc, song) => acc + (Number(song.duration) || 0), 0)

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

  const confirmDeletePlaylist = async () => {
    if (!playlist) return
    const result = await deletePlaylist(playlist.id)
    if (!result.error) {
      navigate('/library')
    }
  }

  const handleShufflePlaylist = () => {
    if (songs.length === 0) return
    const shuffled = [...songs].sort(() => Math.random() - 0.5)
    playSong(shuffled[0], shuffled)
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
          <Link to="/library" className="play-all-btn">Back to Library</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page pb-24">
      <Link to="/library" className="back-link !mt-0 !mb-4 absolute z-10 top-4 left-4 mix-blend-difference hover:opacity-70 transition">
        <ArrowLeft size={18} />
        <span>Back to Library</span>
      </Link>

      <motion.div
        className="premium-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {playlist.cover_image && (
          <div 
            className="premium-hero-bg" 
            style={{ backgroundImage: `url(${playlist.cover_image})` }} 
          />
        )}
        <div className="premium-hero-overlay" />
        
        <div className="premium-hero-content">
          <div className="premium-hero-image-wrapper flex-shrink-0 bg-white/5 border border-white/10" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            {playlist.cover_image ? (
              <img src={playlist.cover_image} alt={playlist.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/10 to-transparent">
                <ListMusic size={64} className="text-white/20 drop-shadow-md" />
              </div>
            )}
          </div>
          
          <div className="premium-hero-info">
            <span className="premium-hero-type uppercase tracking-widest text-xs font-bold text-white/70 mb-2 block">
              {playlist.is_public ? 'Public Playlist' : 'Private Playlist'}
            </span>
            <h1 className="premium-hero-title line-clamp-2">{playlist.name}</h1>
            <p className="premium-hero-meta mt-2 text-white/80">
              {playlist.description && <span className="block mb-2 text-white/90 font-medium">{playlist.description}</span>}
              <span>
                {songs.length} songs
                {totalDuration > 0 && ` • ${formatDuration(totalDuration)}`}
              </span>
            </p>
          </div>
        </div>
      </motion.div>

      <div className="playlist-toolbar flex items-center gap-4">
        {songs.length > 0 ? (
          <>
            <motion.button
              className="play-all-btn large flex items-center gap-2"
              onClick={() => playSong(songs[0], songs)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Play size={20} fill="currentColor" /> Play
            </motion.button>
            <motion.button
              className="play-all-btn large flex items-center gap-2 !bg-white/10 !text-white hover:!bg-white/20"
              onClick={handleShufflePlaylist}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Shuffle Playlist"
            >
              <Shuffle size={20} /> Shuffle
            </motion.button>
            {playlist.is_public && (
              <ShareButton title={playlist.name} />
            )}
          </>
        ) : null}

        <div className="flex-1" />

        {!id.startsWith('curated-') && (
          <>
            <button type="button" className="icon-btn border border-white/10 hover:bg-white/10 p-2 rounded-full transition" onClick={() => setIsEditModalOpen(true)} title="Edit Playlist">
              <Edit2 size={18} />
            </button>

            <button type="button" className="icon-btn text-red-400 border border-red-500/20 hover:bg-red-500/10 p-2 rounded-full transition" onClick={() => setIsDeleteDialogOpen(true)} title="Delete Playlist">
              <Trash2 size={18} />
            </button>
          </>
        )}
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
              onRemove={!id.startsWith('curated-') ? () => void handleRemoveSong(song.id) : undefined}
            />
          ))}
        </div>
      )}

      <PlaylistModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          void loadPlaylist(id).then(data => {
            if (data) setPlaylist(data)
          })
        }}
        playlist={playlist}
      />

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Playlist"
        message={`Are you sure you want to delete "${playlist.name}"? This action cannot be undone.`}
        confirmText="Delete"
        isDestructive={true}
        onConfirm={() => {
          void confirmDeletePlaylist()
          setIsDeleteDialogOpen(false)
        }}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </div>
  )
}
