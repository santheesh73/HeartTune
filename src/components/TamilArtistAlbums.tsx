import { useEffect, useState } from 'react'
import { Disc3 } from 'lucide-react'
import { searchAlbums } from '../api/saavn'
import type { Album } from '../types'
import AlbumCard from './AlbumCard'
import { readOfflineCache, writeOfflineCache } from '../utils/offlineCache'

const TAMIL_ARTISTS = [
  { id: 'hiphop-tamizha', name: 'Hiphop Tamizha', query: 'Hiphop Tamizha Tamil albums' },
  { id: 'anirudh', name: 'Anirudh', query: 'Anirudh Ravichander Tamil albums' },
  { id: 'gv-prakash', name: 'G.V. Prakash', query: 'G.V. Prakash Kumar Tamil albums' },
  { id: 'ar-rahman', name: 'A.R. Rahman', query: 'A.R. Rahman Tamil albums' },
  { id: 'ilaiyaraaja', name: 'Ilaiyaraaja', query: 'Ilaiyaraaja Tamil albums' },
]

export default function TamilArtistAlbums() {
  const [selectedId, setSelectedId] = useState(TAMIL_ARTISTS[0].id)
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [offlineOnly, setOfflineOnly] = useState(false)
  const selected = TAMIL_ARTISTS.find((artist) => artist.id === selectedId) ?? TAMIL_ARTISTS[0]

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await searchAlbums(selected.query, 1, 8)
        const nextAlbums = data.results || []
        setAlbums(nextAlbums)
        writeOfflineCache(`hearttune-tamil-artist-albums:${selected.id}`, nextAlbums)
        setOfflineOnly(false)
      } catch {
        const cached = readOfflineCache<Album[]>(`hearttune-tamil-artist-albums:${selected.id}`, [])
        setAlbums(cached)
        setOfflineOnly(cached.length === 0)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [selected])

  return (
    <section className="section">
      <div className="section-header">
        <h2>
          <Disc3 size={22} /> Tamil Artist Albums
        </h2>
      </div>

      <div className="lyricist-chips">
        {TAMIL_ARTISTS.map((artist) => (
          <button
            key={artist.id}
            type="button"
            className={`lyricist-chip ${selected.id === artist.id ? 'active' : ''}`}
            onClick={() => setSelectedId(artist.id)}
          >
            {artist.name}
          </button>
        ))}
      </div>

      <p className="lyricist-subtitle">Albums and playlists featuring {selected.name}</p>

      {loading ? (
        <div className="album-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton-card" />
          ))}
        </div>
      ) : albums.length ? (
        <div className="album-grid">
          {albums.map((album, index) => (
            <AlbumCard key={album.id} album={album} index={index} />
          ))}
        </div>
      ) : offlineOnly ? (
        <p className="no-results">Connect online to load Tamil albums for {selected.name}.</p>
      ) : (
        <p className="no-results">No Tamil albums found for {selected.name}.</p>
      )}
    </section>
  )
}
