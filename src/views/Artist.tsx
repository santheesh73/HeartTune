import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Play, Shuffle, UserPlus } from 'lucide-react'
import { getArtist, getArtistSongs, getArtistAlbums } from '../api/saavn'
import { usePlayer } from '../context/PlayerContext'
import type { Song, Album } from '../types'
import SongRow from '../components/SongRow'
import AlbumCard from '../components/AlbumCard'

export default function ArtistPage() {
  const { id } = useParams<{ id: string }>()
  const { playSong } = usePlayer()

  const [artist, setArtist] = useState<any>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let mounted = true
    setLoading(true)

    Promise.all([
      getArtist(id),
      getArtistSongs(id, 1, 10),
      getArtistAlbums(id, 1, 10)
    ]).then(([artistData, songsData, albumsData]) => {
      if (!mounted) return
      setArtist(artistData)
      setSongs(songsData?.songs || [])
      setAlbums(albumsData?.albums || [])
    }).catch(console.error)
      .finally(() => mounted && setLoading(false))

    return () => { mounted = false }
  }, [id])

  if (loading) {
    return (
      <div className="page">
        <div className="skeleton-hero" />
        <div className="loading-list">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-row" />
          ))}
        </div>
      </div>
    )
  }

  if (!artist && !songs.length) {
    return (
      <div className="page">
        <div className="empty-state">
          <h2>Artist not found</h2>
        </div>
      </div>
    )
  }

  const shufflePlay = () => {
    if (!songs.length) return
    const shuffled = [...songs].sort(() => Math.random() - 0.5)
    playSong(shuffled[0], shuffled)
  }

  const imageUrl = artist?.image?.[artist.image.length - 1]?.url || ''

  return (
    <div className="page album-page">
      <motion.div
        className="album-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={artist?.name || 'Artist'}
            className="w-48 h-48 rounded-full object-cover shadow-2xl"
          />
        ) : (
          <div className="w-48 h-48 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-2xl">
            <span className="text-white/30 text-5xl font-bold">{(artist?.name || 'A').charAt(0)}</span>
          </div>
        )}
        
        <div className="flex-1">
          <p className="playlist-type">Artist</p>
          <h1 className="text-6xl font-bold mb-4">{artist?.name || 'Unknown Artist'}</h1>
          <p className="playlist-meta text-white/70 mb-4">{artist?.followerCount ? `${artist.followerCount.toLocaleString()} followers` : ''}</p>
        </div>
      </motion.div>

      <div className="flex items-center gap-4 mb-8">
        <motion.button
          className="play-all-btn large"
          onClick={() => songs.length && playSong(songs[0], songs)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={!songs.length}
        >
          <Play size={20} fill="currentColor" /> Play
        </motion.button>
        <button className="shuffle-btn" onClick={shufflePlay} disabled={!songs.length}>
          <Shuffle size={20} /> Shuffle
        </button>
        <button className="p-2 ml-4 rounded-full border border-white/20 text-white hover:border-white transition flex items-center gap-2 px-4 py-2">
          <UserPlus size={18} />
          <span className="font-semibold text-sm">Follow</span>
        </button>
      </div>

      {songs.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Popular Songs</h2>
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
        </div>
      )}

      {albums.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6">Albums</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
