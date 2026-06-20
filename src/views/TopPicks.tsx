import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, TrendingUp, Play } from 'lucide-react'
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
import { usePlayer } from '../context/PlayerContext'
import { useLanguage } from '../context/LanguageContext'
import { useRecentlyPlayed } from '../hooks/useRecentlyPlayed'
import { readOfflineCache, writeOfflineCache } from '../utils/offlineCache'
import { useAuth } from '../hooks/useAuth'
import { useIsMobile } from '../hooks/useIsMobile'

export default function TopPicks() {
  const isMobile = useIsMobile()
  const { user } = useAuth()
  const { playSong } = usePlayer()
  const { language } = useLanguage()
  const { recentlyPlayed, loading: recentLoading } = useRecentlyPlayed(8)
  const [trending, setTrending] = useState<Song[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [offlineRecommendationsOnly, setOfflineRecommendationsOnly] = useState(false)

  useEffect(() => {
    if (!isMobile) {
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

  if (!isMobile) return <Navigate to="/" replace />

  return (
    <div className="page top-picks-page">
      <motion.header
        className="page-header mobile-feed-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <p className="mobile-feed-kicker">Selected Language</p>
          <h1>{language === 'all' ? 'Top Picks' : `${language[0].toUpperCase()}${language.slice(1)} Picks`}</h1>
        </div>
      </motion.header>

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
                      eager={i === 0}
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
                  <SongCard
                    key={song.id}
                    song={song}
                    queue={trending}
                    index={i}
                    eager={i === 0 && (!user || recentlyPlayed.length === 0)}
                  />
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
