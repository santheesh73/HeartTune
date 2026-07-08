import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, ListMusic, Loader, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlaylists } from '../hooks/usePlaylists'
import { useAuth } from '../hooks/useAuth'
import type { Song } from '../types'
import PlaylistModal from './PlaylistModal'

interface AddToPlaylistModalProps {
  isOpen: boolean
  onClose: () => void
  song?: Song | null
  songs?: Song[] | null
}

export default function AddToPlaylistModal({ isOpen, onClose, song, songs }: AddToPlaylistModalProps) {
  const { user } = useAuth()
  const { playlists, loading: playlistsLoading, addSongToPlaylist, addSongsToPlaylist } = usePlaylists()
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  // Reset state when modal opens for a new song
  useEffect(() => {
    if (isOpen) {
      setAddedTo(new Set())
      setError(null)
    }
  }, [isOpen, song, songs])

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!user) return
    if (!song && (!songs || songs.length === 0)) return
    
    setAddingTo(playlistId)
    setError(null)
    
    try {
      let added = false
      let addError = null

      if (songs && songs.length > 0) {
        const result = await addSongsToPlaylist(playlistId, songs)
        added = result.added
        addError = result.error
      } else if (song) {
        const result = await addSongToPlaylist(playlistId, song)
        added = result.added
        addError = result.error
      }

      if (addError) {
        setError(addError)
      } else if (added) {
        setAddedTo((prev) => {
          const next = new Set(prev)
          next.add(playlistId)
          return next
        })
        // Close modal automatically after brief success indication
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        // Was already in playlist (or empty)
        setError(songs ? 'All songs are already in this playlist.' : 'Song is already in this playlist.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add to playlist')
    } finally {
      setAddingTo(null)
    }
  }

  if (!mounted) return null

  return createPortal(
    <>
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
                <h2 className="modal-title">Add to Playlist</h2>
                <button
                  onClick={onClose}
                  className="modal-close-btn"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {error && (
                  <div style={{ color: 'var(--red-primary)', fontSize: '0.875rem' }}>
                    {error}
                  </div>
                )}
                
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="btn-secondary"
                  style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '12px', justifyContent: 'flex-start' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)' }}>
                    <Plus size={20} />
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    New Playlist
                  </span>
                </button>

                <div style={{ marginTop: '12px' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.5)', marginBottom: '12px', paddingLeft: '4px' }}>
                    Your Playlists
                  </h3>
                  
                  {playlistsLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.5)' }}>
                      <Loader size={24} className="spin" />
                    </div>
                  ) : playlists.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
                      You don't have any playlists yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {playlists.map(playlist => (
                        <button
                          key={playlist.id}
                          onClick={() => handleAddToPlaylist(playlist.id)}
                          disabled={addingTo === playlist.id || addedTo.has(playlist.id)}
                          className="btn-secondary"
                          style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', padding: '8px', opacity: (addingTo === playlist.id || addedTo.has(playlist.id)) ? 0.7 : 1 }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)' }}>
                              <ListMusic size={20} color="rgba(255,255,255,0.5)" />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                              <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{playlist.name}</p>
                              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{playlist.songCount || 0} songs</p>
                            </div>
                          </div>
                          
                          <div style={{ paddingRight: '8px' }}>
                            {addedTo.has(playlist.id) ? (
                              <div style={{ color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '6px', borderRadius: '50%' }}>
                                <Check size={16} />
                              </div>
                            ) : addingTo === playlist.id ? (
                              <Loader size={18} className="spin" color="var(--color-primary)" />
                            ) : (
                              <div style={{ opacity: 0.7 }}>
                                <Plus size={18} />
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Create New Playlist Modal (stacked on top if needed, though they shouldn't usually be open exactly at the same time if we close this one, but it's fine to render conditionally) */}
      <PlaylistModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>,
    document.body
  )
}
