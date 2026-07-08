import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPlaylist, updatePlaylist } from '../services/playlistService'
import { useAuth } from '../hooks/useAuth'
import { useLibrary } from '../context/LibraryContext'
import type { UserPlaylist } from '../types'

interface PlaylistModalProps {
  isOpen: boolean
  onClose: () => void
  playlist?: UserPlaylist // if provided, we are editing
}

export default function PlaylistModal({ isOpen, onClose, playlist }: PlaylistModalProps) {
  const { user } = useAuth()
  const { refreshPlaylists } = useLibrary()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setName(playlist?.name || '')
      setDescription(playlist?.description || '')
      setIsPublic(playlist?.is_public || false)
      setError(null)
    }
  }, [isOpen, playlist])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !name.trim()) return

    setLoading(true)
    setError(null)

    try {
      if (playlist) {
        await updatePlaylist(playlist.id, { name, description, is_public: isPublic })
      } else {
        await createPlaylist(user.id, { name, description, is_public: isPublic })
      }
      await refreshPlaylists()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save playlist')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="modal-backdrop">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="modal-content"
          >
            <div className="modal-header">
              <h2 className="modal-title">
                {playlist ? 'Edit Playlist' : 'Create Playlist'}
              </h2>
              <button
                onClick={onClose}
                className="modal-close-btn"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {error && (
                <div style={{ color: 'var(--red-primary)', fontSize: '0.875rem' }}>
                  {error}
                </div>
              )}
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Awesome Playlist"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Description <span style={{ opacity: 0.5, fontWeight: 'normal' }}>(Optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this playlist about?"
                  rows={3}
                  className="form-input"
                  style={{ resize: 'none' }}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 0, marginTop: '8px' }}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPublic}
                  onClick={() => setIsPublic(!isPublic)}
                  className={`toggle-switch ${isPublic ? 'active' : 'inactive'}`}
                >
                  <span aria-hidden="true" className="toggle-thumb" />
                </button>
                <div>
                  <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>Public Playlist</p>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>Let others find and view this playlist</p>
                </div>
              </div>
            </form>

            <div className="modal-footer">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={loading || !name.trim()}
                className="btn-primary"
              >
                {loading && <Loader size={16} className="spin" />}
                {playlist ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
