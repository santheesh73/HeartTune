import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Globe2, Sparkles, TrendingUp, Play } from 'lucide-react'
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
import TamilArtistAlbums from '../components/TamilArtistAlbums'
import { useAuth } from '../hooks/useAuth'
import { usePlayer } from '../context/PlayerContext'
import { useLanguage } from '../context/LanguageContext'
import { useRecentlyPlayed } from '../hooks/useRecentlyPlayed'
import { readOfflineCache, writeOfflineCache } from '../utils/offlineCache'
import { useIsMobile } from '../hooks/useIsMobile'

export default function Home() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { playSong } = usePlayer()
  const { language, setLanguage, languages } = useLanguage()
  const { recentlyPlayed, loading: recentLoading } = useRecentlyPlayed(8)
  const [trending, setTrending] = useState<Song[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [offlineRecommendationsOnly, setOfflineRecommendationsOnly] = useState(false)

  useEffect(() => {
    if (isMobile) {
      setLoading(false)
      return
    }

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
        writeOfflineCache(`hearttune-home:${language}`, {
          trending: filtered,
          albums: albumsData.results,
        })
        setOfflineRecommendationsOnly(false)
      } catch {
        const cached = readOfflineCache<{ trending: Song[]; albums: Album[] }>(
          `hearttune-home:${language}`,
          { trending: [], albums: [] }
        )
        setTrending(cached.trending)
        setAlbums(cached.albums)
        setOfflineRecommendationsOnly(cached.trending.length === 0 && cached.albums.length === 0)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [isMobile, language])

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.name?.split(' ')[0]
  const greetingLine = firstName ? `${greeting}, ${firstName}` : greeting

  if (isMobile) {
    return (
      <div className="page home-page mobile-language-page">
        <motion.header
          className="page-header mobile-language-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1>
              {greetingLine}{' '}
              <span role="img" aria-label="waving hand">
                {'\u{1F44B}'}
              </span>
            </h1>
            <p>Discover music that moves your heart</p>
          </div>
        </motion.header>

        <div className="mobile-language-list">
          {languages.map((item, i) => (
            <motion.button
              key={item.id}
              type="button"
              className={`mobile-language-card ${language === item.id ? 'active' : ''}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => {
                setLanguage(item.id)
                navigate('/top-picks')
              }}
            >
              <span className="mobile-language-icon">
                {i === 0 ? <Globe2 size={22} /> : i % 2 === 0 ? <Sparkles size={22} /> : <TrendingUp size={22} />}
              </span>
              <span className="mobile-language-copy">
                <strong>{item.label}</strong>
                <small>{item.id === 'all' ? 'Browse every language' : `Play ${item.label} favorites`}</small>
              </span>
            </motion.button>
          ))}
        </div>

        <TamilArtistAlbums />
      </div>
    )
  }

  return (
    <div className="page home-page">
      <motion.header
        className="page-header hero-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1>
            {greetingLine}{' '}
            <span role="img" aria-label="waving hand">
              {'\u{1F44B}'}
            </span>
          </h1>
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
                {i === 0 ? (
                  <Globe2 size={20} />
                ) : i % 2 === 0 ? (
                  <Sparkles size={20} />
                ) : (
                  <TrendingUp size={20} />
                )}
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
          {user ? (
            <section className="section">
              <div className="section-header">
                <h2>
                  <Play size={22} /> Recently Played
                </h2>
              </div>
              {recentLoading ? (
                <div className="loading-grid">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton-card" />
                  ))}
                </div>
              ) : recentlyPlayed.length === 0 ? (
                <p className="lyricist-subtitle">Songs you play will appear here.</p>
              ) : (
                <div className="song-grid">
                  {recentlyPlayed.map((entry, i) => (
                    <SongCard
                      key={entry.id}
                      song={entry.song}
                      queue={recentlyPlayed.map((item) => item.song)}
                      index={i}
                    />
                  ))}
                </div>
              )}
            </section>
          ) : null}

          <section className="section">
            <div className="section-header">
              <h2>
                <TrendingUp size={22} /> Top Picks
              </h2>
              {trending.length > 0 && (
                <button className="play-all-btn" onClick={() => playSong(trending[0], trending)}>
                  <Play size={16} fill="currentColor" /> Play All
                </button>
              )}
            </div>
            {trending.length > 0 ? (
              <div className="song-grid">
                {trending.map((song, i) => (
                  <SongCard key={song.id} song={song} queue={trending} index={i} />
                ))}
              </div>
            ) : offlineRecommendationsOnly ? (
              <p className="lyricist-subtitle">Connect once online to refresh your top picks.</p>
            ) : null}
          </section>

          {language === 'tamil' ? <TamilArtistAlbums /> : null}

          <section className="section">
            <div className="section-header">
              <h2>
                <Sparkles size={22} /> Popular Albums
              </h2>
            </div>
            {albums.length > 0 ? (
              <div className="album-grid">
                {albums.map((album, i) => (
                  <AlbumCard key={album.id} album={album} index={i} />
                ))}
              </div>
            ) : offlineRecommendationsOnly ? (
              <p className="lyricist-subtitle">Popular albums will appear here after the next online refresh.</p>
            ) : null}
          </section>

          <LyricistAlbums language={language} />
        </>
      )}
    </div>
  )
}
