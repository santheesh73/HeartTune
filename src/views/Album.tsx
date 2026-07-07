import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Play, Shuffle, Heart, Share2, Download, Loader2, ListPlus } from 'lucide-react'
import { getAlbum } from '../api/saavn'
import { useLibrary } from '../context/LibraryContext'
import { getArtworkCandidates } from '../lib/utils/artwork'
import type { Album } from '../types'
import { usePlayer } from '../context/PlayerContext'
import SongRow from '../components/SongRow'
import ArtworkImage from '../components/ArtworkImage'
import ShareButton from '../components/ShareButton'
import { formatDuration } from '../utils/format'
import { saveDownload, isDownloaded } from '../utils/downloads'
import { getPlayableAudioUrl } from '../api/saavn'
import AddToPlaylistModal from '../components/AddToPlaylistModal'

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>()
  const [album, setAlbum] = useState<Album | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false)

  const { playSong } = usePlayer()
  const { isAlbumLiked, toggleLikedAlbum } = useLibrary()

  useEffect(() => {
    if (!id) return
    getAlbum(id)
      .then((data) => setAlbum(data || null))
      .catch(() => setAlbum(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="page">
        <div className="skeleton-hero" style={{ height: '280px', marginBottom: '32px' }} />
        <div className="album-actions" style={{ marginBottom: '32px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="skeleton-img" style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div className="skeleton-img" style={{ width: '96px', height: '40px', borderRadius: '24px', background: 'rgba(255,255,255,0.1)' }} />
          <div className="skeleton-img" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div className="skeleton-img" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div className="skeleton-img" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
        </div>
        <div className="loading-list">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-row" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', height: '64px' }} />
          ))}
        </div>
      </div>
    )
  }

  if (!album) {
    return (
      <div className="page">
        <div className="empty-state">
          <h2>Album not found</h2>
        </div>
      </div>
    )
  }

  const songs = album.songs || []
  const images = getArtworkCandidates(album.image, '500x500')
  const artists = album.artists?.primary?.map((a) => a.name).join(', ')
  const totalDuration = songs.reduce((acc, song) => acc + (song.duration || 0), 0)
  
  const albumMeta = [
    artists, 
    album.year, 
    `${songs.length} songs`, 
    totalDuration > 0 ? formatDuration(totalDuration) : ''
  ].filter(Boolean).join(' • ')

  const shufflePlay = () => {
    if (!songs.length) return
    const shuffled = [...songs].sort(() => Math.random() - 0.5)
    playSong(shuffled[0], shuffled)
  }

  const handleDownloadAlbum = async () => {
    if (!songs.length) return
    setDownloading(true)
    try {
      for (const song of songs) {
        const alreadyDownloaded = await isDownloaded(song.id)
        if (alreadyDownloaded) continue
        
        try {
          const { url, song: resolvedSong } = await getPlayableAudioUrl(song)
          const response = await fetch(url)
          if (!response.ok) throw new Error('Network response was not ok')
          const blob = await response.blob()
          await saveDownload(resolvedSong, blob)
        } catch (err) {
          console.error(`Failed to download song ${song.id}:`, err)
        }
      }
      window.alert('Album downloaded successfully!')
    } catch (err) {
      console.error('Album download failed:', err)
      window.alert('Failed to download album. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const bgImage = images[0] || ''

  return (
    <div className="page album-page">
      <motion.div
        className="premium-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {bgImage && (
          <div 
            className="premium-hero-bg" 
            style={{ backgroundImage: `url(${bgImage})` }} 
          />
        )}
        <div className="premium-hero-overlay" />
        
        <div className="premium-hero-content">
          <div className="premium-hero-image-wrapper" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <ArtworkImage
              src={images[0]}
              fallbackSrcs={images.slice(1)}
              alt={album.name}
              className="premium-hero-image"
              priority
              sizes="(max-width: 640px) 260px, 220px"
            />
          </div>
          
          <div className="premium-hero-info">
            <p className="playlist-type font-bold text-sm tracking-widest uppercase mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Album</p>
            <h1 style={{ textShadow: '0 4px 24px rgba(0,0,0,0.5)', marginBottom: '16px' }}>{album.name}</h1>
            <p className="playlist-meta text-white/80 font-medium mt-2">{albumMeta}</p>
          </div>
        </div>
      </motion.div>

      <div className="album-actions" style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <motion.button
          className="play-btn-large"
          onClick={() => songs.length && playSong(songs[0], songs)}
          title="Play Album"
        >
          <Play size={24} fill="currentColor" style={{ marginLeft: '4px' }} />
        </motion.button>
        
        <button 
          className="shuffle-btn flex"
          style={{ gap: '8px', alignItems: 'center', padding: '8px 24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.2)', transition: 'all 0.2s' }}
          onClick={shufflePlay}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
          }}
        >
          <Shuffle size={20} />
          <span style={{ fontWeight: 600 }}>Shuffle</span>
        </button>

        <ShareButton title={album.name} />

        <button
          className="flex items-center justify-center"
          style={{ 
            width: '40px', height: '40px', borderRadius: '50%', 
            border: '1px solid rgba(255,255,255,0.2)', 
            transition: 'all 0.2s',
            borderColor: isAlbumLiked(album.id) ? 'var(--red-primary)' : 'rgba(255,255,255,0.2)',
            color: isAlbumLiked(album.id) ? 'var(--red-primary)' : 'rgba(255,255,255,0.8)'
          }}
          onClick={() => toggleLikedAlbum(album)}
          title={isAlbumLiked(album.id) ? 'Unlike Album' : 'Like Album'}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Heart size={20} fill={isAlbumLiked(album.id) ? 'currentColor' : 'none'} />
        </button>

        <button
          className="flex items-center justify-center"
          style={{ 
            width: '40px', height: '40px', borderRadius: '50%', 
            border: '1px solid rgba(255,255,255,0.2)', 
            transition: 'all 0.2s', color: 'rgba(255,255,255,0.8)'
          }}
          onClick={() => setIsPlaylistModalOpen(true)}
          title="Add Album to Playlist"
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <ListPlus size={20} />
        </button>

        <button
          className="flex items-center justify-center"
          style={{ 
            width: '40px', height: '40px', borderRadius: '50%', 
            border: '1px solid rgba(255,255,255,0.2)', 
            transition: 'all 0.2s', color: 'rgba(255,255,255,0.8)'
          }}
          onClick={handleDownloadAlbum}
          disabled={downloading}
          title="Download Album"
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {downloading ? <Loader2 size={20} className="spin" /> : <Download size={20} />}
        </button>
        
        <button
          className="flex items-center justify-center"
          style={{ 
            width: '40px', height: '40px', borderRadius: '50%', 
            border: '1px solid rgba(255,255,255,0.2)', 
            transition: 'all 0.2s', color: 'rgba(255,255,255,0.8)'
          }}
          onClick={() => {
            navigator.clipboard.writeText(window.location.href)
            window.alert('Link copied to clipboard!')
          }}
          title="Share"
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Share2 size={20} />
        </button>
      </div>

      <div className="song-list">
        <div className="song-list-header">
          <span>#</span>
          <span>Title</span>
          <span>Album</span>
          <span>Duration</span>
          <span />
        </div>
        {songs.map((song, i) => (
          <SongRow key={song.id} song={song} index={i} queue={songs} />
        ))}
      </div>

      <AddToPlaylistModal 
        isOpen={isPlaylistModalOpen} 
        onClose={() => setIsPlaylistModalOpen(false)} 
        songs={songs} 
      />
    </div>
  )
}
