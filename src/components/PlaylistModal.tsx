import { useState, useEffect } from 'react'
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
    } catch (err: any) {
      setError(err.message || 'Failed to save playlist')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <h2 className="text-lg font-semibold text-white">
                {playlist ? 'Edit Playlist' : 'Create Playlist'}
              </h2>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {error && (
                <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500">
                  {error}
                </div>
              )}
              
              <div>
                <label className="mb-1 block text-sm font-medium text-white/70">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Awesome Playlist"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/30 outline-none transition focus:border-[var(--color-primary)] focus:bg-white/10"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-white/70">
                  Description <span className="text-white/40">(Optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this playlist about?"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/30 outline-none transition focus:border-[var(--color-primary)] focus:bg-white/10"
                />
              </div>

              <div className="flex items-center gap-3 py-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPublic}
                  onClick={() => setIsPublic(!isPublic)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isPublic ? 'bg-[var(--color-primary)]' : 'bg-white/10'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isPublic ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <div>
                  <p className="text-sm font-medium text-white">Public Playlist</p>
                  <p className="text-xs text-white/50">Let others find and view this playlist</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full px-5 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-black transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {loading && <Loader size={16} className="animate-spin" />}
                  {playlist ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
