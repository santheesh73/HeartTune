import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Play, Shuffle, Heart, Share2, BadgeCheck, Users, Info } from 'lucide-react'
import { getArtist, getArtistSongs, getArtistAlbums } from '../api/saavn'
import type { ArtistDetail, Song, Album } from '../types'
import { usePlayer } from '../context/PlayerContext'
import SongRow from '../components/SongRow'
import AlbumCard from '../components/AlbumCard'
import { getArtworkCandidates } from '../lib/utils/artwork'

export default function ArtistPage() {
  const { id } = useParams<{ id: string }>()
  const [artist, setArtist] = useState<ArtistDetail | null>(null)
  const [topSongs, setTopSongs] = useState<Song[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [singles, setSingles] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [scrollY, setScrollY] = useState(0)
  
  const { playSong } = usePlayer()

  useEffect(() => {
    const mainContent = document.querySelector('.main-content')
    if (!mainContent) return
    const handleScroll = () => {
      setScrollY(mainContent.scrollTop)
    }
    mainContent.addEventListener('scroll', handleScroll)
    return () => mainContent.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    
    Promise.all([
      getArtist(id).catch(() => null),
      getArtistSongs(id, 1, 10).catch(() => ({ songs: [] })),
      getArtistAlbums(id, 1, 12).catch(() => ({ albums: [] }))
    ]).then(([artistData, songsData, albumsData]) => {
      setArtist(artistData || null)
      setTopSongs(artistData?.topSongs || songsData?.songs || [])
      
      const allAlbums = artistData?.topAlbums || albumsData?.albums || []
      const allSingles = artistData?.singles || []
      
      setAlbums(allAlbums)
      setSingles(allSingles)
      
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div className="page artist-page">
        {/* Premium Skeleton: Artist Banner */}
        <div className="artist-hero skeleton-hero" style={{ height: '340px' }}>
          <div className="artist-hero-content" style={{ justifyContent: 'flex-end', height: '100%', paddingBottom: '32px' }}>
            <div className="skeleton-text" style={{ width: '96px', height: '24px', borderRadius: '24px', marginBottom: '16px', background: 'rgba(255,255,255,0.2)' }} />
            <div className="skeleton-text" style={{ width: '75%', maxWidth: '600px', height: '72px', borderRadius: '8px', marginBottom: '16px', background: 'rgba(255,255,255,0.2)' }} />
            
            {/* Premium Skeletons: Stats Placeholders */}
            <div className="flex" style={{ gap: '16px', marginTop: '8px' }}>
              <div className="skeleton-text skeleton-stat" style={{ width: '128px' }} />
              <div className="skeleton-text skeleton-stat" style={{ width: '96px' }} />
            </div>
          </div>
        </div>

        <div className="album-actions" style={{ marginBottom: '32px', marginTop: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="skeleton-img" style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div className="skeleton-img" style={{ width: '96px', height: '40px', borderRadius: '24px', background: 'rgba(255,255,255,0.1)' }} />
          <div className="skeleton-img" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div className="skeleton-img" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
        </div>

        <div className="artist-page-grid">
          <div>
            <h2 className="section-title" style={{ marginBottom: '16px' }}>Popular</h2>
            <div className="loading-list">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton-row" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', height: '64px' }} />
              ))}
            </div>
          </div>
          
          <div>
            {/* Premium Skeleton: Biography placeholder */}
            <h2 className="section-title" style={{ marginBottom: '16px' }}>About</h2>
            <div className="skeleton-bio">
              <div className="skeleton-bio-title" />
              <div className="skeleton-bio-line" style={{ width: '100%' }} />
              <div className="skeleton-bio-line" style={{ width: '83%' }} />
              <div className="skeleton-bio-line" style={{ width: '80%' }} />
              <div className="skeleton-bio-line" style={{ width: '100%', marginTop: '16px' }} />
              <div className="skeleton-bio-line" style={{ width: '66%' }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!artist) {
    return (
      <div className="page">
        <div className="empty-state">
          <h2>Artist not found</h2>
        </div>
      </div>
    )
  }

  const shufflePlay = () => {
    if (!topSongs.length) return
    const shuffled = [...topSongs].sort(() => Math.random() - 0.5)
    playSong(shuffled[0], shuffled)
  }

  const formatNumber = (num?: number | string) => {
    if (!num) return '0'
    return Number(num).toLocaleString()
  }

  const bgImage = getArtworkCandidates(artist.image, '500x500')[0] || ''
  
  // Fallback calculations
  const hasStats = artist.fanCount || artist.followerCount;

  return (
    <div className="page artist-page">
      <div 
        className="artist-sticky-header"
        style={{
          opacity: scrollY > 280 ? 1 : 0,
          pointerEvents: scrollY > 280 ? 'auto' : 'none',
        }}
      >
        <div className="sticky-header-content">
          <button 
            className="play-btn-small transition-transform duration-200"
            onClick={() => topSongs.length && playSong(topSongs[0], topSongs)}
            aria-label="Play top song"
          >
            <Play size={20} fill="currentColor" />
          </button>
          <h2>{artist.name}</h2>
        </div>
      </div>

      <motion.div
        className="artist-hero"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {bgImage && (
          <div 
            className="artist-hero-bg" 
            style={{ backgroundImage: `url(${bgImage})` }} 
          />
        )}
        <div className="artist-hero-overlay" />
        
        <div className="artist-hero-content">
          {artist.isVerified && (
            <div className="artist-badge">
              <BadgeCheck size={16} fill="currentColor" className="text-blue-400" />
              <span>Verified Artist</span>
            </div>
          )}
          <h1 className="drop-shadow-lg">{artist.name}</h1>
          
          <div className="artist-stats">
            {hasStats ? (
              <>
                {artist.fanCount && (
                  <span>
                    <Users size={16} className="text-white/70" />
                    {formatNumber(artist.fanCount)} monthly listeners
                  </span>
                )}
                {artist.followerCount && (
                  <span>
                    <Heart size={16} className="text-white/70" />
                    {formatNumber(artist.followerCount)} followers
                  </span>
                )}
              </>
            ) : (
              <span className="artist-stats-fallback">
                <Info size={16} />
                Stats unavailable
              </span>
            )}
          </div>
        </div>
      </motion.div>

      <div className="album-actions mb-10 flex items-center gap-4">
        <motion.button
          className="play-btn-large"
          onClick={() => topSongs.length && playSong(topSongs[0], topSongs)}
          title="Play"
          aria-label="Play all"
        >
          <Play size={24} fill="currentColor" className="ml-1" />
        </motion.button>
        
        <button 
          className="shuffle-btn flex gap-2 items-center px-6 py-2 rounded-full border border-white/20"
          onClick={shufflePlay}
          aria-label="Shuffle play"
        >
          <Shuffle size={18} /> Shuffle
        </button>
        
        <button
          className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/80"
          title="Follow"
          aria-label="Follow artist"
        >
          <Heart size={20} />
        </button>
        
        <button
          className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/80"
          onClick={() => {
            navigator.clipboard.writeText(window.location.href)
            window.alert('Link copied to clipboard!')
          }}
          title="Share"
          aria-label="Share artist"
        >
          <Share2 size={20} />
        </button>
      </div>

      <div className="artist-page-grid">
        <div>
          {topSongs.length > 0 && (
            <section style={{ marginBottom: '40px' }}>
              <h2 className="section-title">Popular</h2>
              <div className="song-list" style={{ marginTop: '16px' }}>
                {topSongs.map((song, i) => (
                  <SongRow 
                    key={song.id} 
                    song={song} 
                    index={i} 
                    queue={topSongs} 
                    hideDesktopRemove 
                  />
                ))}
              </div>
            </section>
          )}

          {albums.length > 0 && (
            <section style={{ marginBottom: '40px' }}>
              <h2 className="section-title">Albums</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px', marginTop: '16px' }}>
                {albums.map((album, i) => (
                  <AlbumCard key={album.id} album={album} index={i} />
                ))}
              </div>
            </section>
          )}

          {singles.length > 0 && (
            <section style={{ marginBottom: '40px' }}>
              <h2 className="section-title">Singles & EPs</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px', marginTop: '16px' }}>
                {singles.map((single, i) => (
                  <AlbumCard key={single.id} album={single} index={i} />
                ))}
              </div>
            </section>
          )}
        </div>

        <div>
          <section style={{ marginBottom: '40px' }}>
            <h2 className="section-title">About</h2>
            {artist.bio && artist.bio.length > 0 ? (
              <div className="bio-card" style={{ marginTop: '16px' }}>
                {artist.bio.map((b, idx) => (
                  <div key={idx} style={{ marginBottom: '16px' }}>
                    {b.title && <h3>{b.title}</h3>}
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                      {b.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bio-fallback" style={{ marginTop: '16px' }}>
                <Info size={32} />
                <h3>Biography not available</h3>
                <p>We don't have a biography for {artist.name} yet.</p>
              </div>
            )}
          </section>

          {artist.similarArtists && artist.similarArtists.length > 0 ? (
            <section style={{ marginBottom: '40px' }}>
              <h2 className="section-title">Similar Artists</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '16px' }}>
                {artist.similarArtists.map((similar, i) => (
                  <div key={similar.id || i} className="similar-artist-card" style={{ cursor: 'pointer' }}>
                    <div className="similar-artist-img-wrapper" style={{ overflow: 'hidden', borderRadius: '50%', marginBottom: '12px', aspectRatio: '1/1' }}>
                      <img 
                        src={getArtworkCandidates(similar.image, '150x150')[0] || ''} 
                        alt={similar.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
                        onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                        onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      />
                    </div>
                    <p className="similar-artist-name" style={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: 500 }}>{similar.name}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section style={{ marginBottom: '40px' }}>
              <h2 className="section-title">Similar Artists</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '16px' }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="similar-artist-card">
                    <div className="similar-artist-img-wrapper skeleton-img" style={{ marginBottom: '12px' }} />
                    <div className="skeleton-text" style={{ marginTop: '12px', height: '16px', width: '75%', margin: '0 auto', borderRadius: '4px' }} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
