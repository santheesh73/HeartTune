import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, Download, Clock, ChevronRight, ListMusic, Plus } from 'lucide-react'
import { useLibrary } from '../context/LibraryContext'
import { useAuth } from '../hooks/useAuth'
import { usePlaylists } from '../hooks/usePlaylists'
import { getArtworkCandidates } from '../lib/utils/artwork'
import ArtworkImage from '../components/ArtworkImage'
import PlaylistModal from '../components/PlaylistModal'
import { getGenericSections, type HomeSection } from '../services/recommendationService'
import { useLanguage } from '../context/LanguageContext'

export default function Library() {
  const { likedSongs, downloadCount } = useLibrary()
  const { playlists, loading: playlistsLoading } = usePlaylists()
  const { user } = useAuth()
  const { language } = useLanguage()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [genericSections, setGenericSections] = useState<HomeSection[]>([])
  
  useEffect(() => {
    void getGenericSections(language).then(setGenericSections)
  }, [language])

  const items = [
    {
      to: '/liked',
      icon: Heart,
      title: 'Liked Songs',
      desc: `${likedSongs.length} songs`,
      gradient: 'gradient-red',
    },
    {
      to: '/downloads',
      icon: Download,
      title: 'Downloaded',
      desc: `${downloadCount} songs tracked`,
      gradient: 'gradient-dark',
    },
  ]

  return (
    <div className="page library-page">
      <motion.header
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>Your Library</h1>
        <p>Welcome back, {user?.name}</p>
      </motion.header>

      <div className="library-cards">
        {items.map(({ to, icon: Icon, title, desc, gradient }, i) => (
          <motion.div
            key={to}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link to={to} className={`library-card ${gradient}`}>
              <div className="library-card-icon">
                <Icon size={32} />
              </div>
              <div>
                <h2>{title}</h2>
                <p>{desc}</p>
              </div>
              <ChevronRight size={24} className="library-card-arrow" />
            </Link>
          </motion.div>
        ))}
      </div>

      <section className="section mt-8">
        <div className="section-header">
          <h2><ListMusic size={22} /> Your Playlists</h2>
        </div>

        {playlistsLoading ? (
          <div className="loading-list">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="skeleton-row" />
            ))}
          </div>
        ) : (
          <div className="album-grid" style={{ marginTop: '16px' }}>
            {playlists.map((playlist, index) => (
              <motion.div
                key={playlist.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/playlist/${playlist.id}`} className="album-card">
                  <div className="album-card-image-wrap" style={{ border: '1px solid var(--border)' }}>
                    {playlist.cover_image ? (
                      <img src={playlist.cover_image} alt={playlist.name} className="album-card-image" />
                    ) : (
                      <div className="album-card-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)' }}>
                        <ListMusic size={48} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    )}
                  </div>
                  
                  <h3 className="album-card-title">{playlist.name}</h3>
                  <p className="album-card-artist" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span>{playlist.songCount || 0} songs</span>
                    {playlist.is_public && (
                      <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Public
                      </span>
                    )}
                  </p>
                </Link>
              </motion.div>
            ))}

            {genericSections.map((section, index) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (playlists.length + index) * 0.05 }}
              >
                <Link to={`/playlist/curated-${section.id}`} className="album-card">
                  <div className="album-card-image-wrap" style={{ border: '1px solid var(--border)' }}>
                    {section.items[0]?.image ? (
                      <img src={section.items[0].image.find(img => img.quality === '500x500')?.url || section.items[0].image[0]?.url} alt={section.title} className="album-card-image" />
                    ) : (
                      <div className="album-card-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)' }}>
                        <ListMusic size={48} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    )}
                  </div>
                  
                  <h3 className="album-card-title">{section.title.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()}</h3>
                  <p className="album-card-artist" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span>{section.items.length || 0} songs</span>
                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Curated
                    </span>
                  </p>
                </Link>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (playlists.length + genericSections.length) * 0.05 }}
            >
              <button 
                onClick={() => setIsModalOpen(true)}
                className="album-card w-full h-full text-left"
                style={{ background: 'transparent', padding: 0 }}
              >
                <div className="album-card-image-wrap flex items-center justify-center transition-colors" style={{ border: '1px dashed var(--border)', background: 'var(--bg-elevated)' }}>
                  <Plus size={48} className="text-white/40" />
                </div>
                <h3 className="album-card-title mt-3">Create Playlist</h3>
              </button>
            </motion.div>
          </div>
        )}
      </section>

      {likedSongs.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2><Clock size={22} /> Recently Liked</h2>
            <Link to="/liked" className="see-all">See all</Link>
          </div>
          <div className="recent-liked">
            {likedSongs.slice(0, 5).map((song) => {
              const images = getArtworkCandidates(song.image, '150x150')
              return (
              <div key={song.id} className="recent-item">
                <ArtworkImage
                  src={images[0]}
                  fallbackSrcs={images.slice(1)}
                  alt={`${song.name} album artwork`}
                  sizes="48px"
                />
                <span>{song.name}</span>
              </div>
              )
            })}
          </div>
        </section>
      )}

      <PlaylistModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}
