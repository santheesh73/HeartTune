import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Globe2, Sparkles, TrendingUp } from 'lucide-react'
import {
  searchSongs,
  searchAlbums,
  getHomeQuery,
  filterFullSongs,
  preferLanguageSongs,
} from '../api/saavn'
import type { Song, Album } from '../types'
import SongCard from '../components/SongCard'
import AlbumCard from '../components/AlbumCard'
import LyricistAlbums from '../components/LyricistAlbums'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { Play } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export default function Home() {
  const { user } = useAuth()
  const { playSong } = usePlayer()
  const { language, setLanguage, languages } = useLanguage()
  const [trending, setTrending] = useState<Song[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [songsData, albumsData] = await Promise.all([
          searchSongs(getHomeQuery(language), 1, 30),
          searchAlbums(language === 'all' ? 'bollywood' : language, 1, 8),
        ])
        const fullSongs = filterFullSongs(songsData.results)
        const filtered = preferLanguageSongs(fullSongs, language).slice(0, 12)
        setTrending(filtered)
        setAlbums(albumsData.results)
      } catch {
        /* ignore */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [language])

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="page home-page">
      <motion.header
        className="page-header hero-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1>{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
          <p>Discover music that moves your heart</p>
        </div>
      </motion.header>

      <section className="quick-picks">
        {languages.map((l, i) => (
          <motion.div
            key={l.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.03 }}
          >
            <button
              type="button"
              className={`quick-pick lang-pick ${language === l.id ? 'active' : ''}`}
              onClick={() => setLanguage(l.id)}
              title={`Show ${l.label} songs`}
            >
              <span className="quick-pick-icon">
                {i === 0 ? <Globe2 size={20} /> : i % 2 === 0 ? <Sparkles size={20} /> : <TrendingUp size={20} />}
              </span>
              {l.label}
            </button>
          </motion.div>
        ))}
      </section>

      {loading ? (
        <div className="loading-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      ) : (
        <>
          <section className="section">
            <div className="section-header">
              <h2><TrendingUp size={22} /> Top Picks</h2>
              {trending.length > 0 && (
                <button
                  className="play-all-btn"
                  onClick={() => playSong(trending[0], trending)}
                >
                  <Play size={16} fill="currentColor" /> Play All
                </button>
              )}
            </div>
            <div className="song-grid">
              {trending.map((song, i) => (
                <SongCard key={song.id} song={song} queue={trending} index={i} />
              ))}
            </div>
          </section>

          <section className="section">
            <div className="section-header">
              <h2><Sparkles size={22} /> Popular Albums</h2>
            </div>
            <div className="album-grid">
              {albums.map((album, i) => (
                <AlbumCard key={album.id} album={album} index={i} />
              ))}
            </div>
          </section>

          <LyricistAlbums language={language} />
        </>
      )}
    </div>
  )
}
