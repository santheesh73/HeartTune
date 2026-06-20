import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, Download, Clock, ChevronRight } from 'lucide-react'
import { useLibrary } from '../context/LibraryContext'
import { useAuth } from '../hooks/useAuth'
import { getArtworkCandidates } from '../lib/utils/artwork'
import ArtworkImage from '../components/ArtworkImage'

export default function Library() {
  const { likedSongs, downloadCount } = useLibrary()
  const { user } = useAuth()

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
    </div>
  )
}
