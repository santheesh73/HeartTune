import { useEffect, useMemo, useState } from 'react'
import { PenLine } from 'lucide-react'
import { getArtistAlbums, getLyricistsForLanguage } from '../api/saavn'
import type { Album } from '../types'
import AlbumCard from './AlbumCard'
import { readOfflineCache, writeOfflineCache } from '../utils/offlineCache'

interface LyricistAlbumsProps {
  language: string
}

export default function LyricistAlbums({ language }: LyricistAlbumsProps) {
  const lyricists = useMemo(() => getLyricistsForLanguage(language), [language])
  const [selectedId, setSelectedId] = useState<string>(lyricists[0]?.id ?? '')
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [offlineOnly, setOfflineOnly] = useState(false)
  const selected = lyricists.find((lyricist) => lyricist.id === selectedId) ?? lyricists[0]

  useEffect(() => {
    if (!selected) return

    async function load() {
      setLoading(true)
      try {
        const data = await getArtistAlbums(selected.id, 1, 8)
        const nextAlbums = data.albums || []
        setAlbums(nextAlbums)
        writeOfflineCache(`hearttune-lyricist-albums:${selected.id}`, nextAlbums)
        setOfflineOnly(false)
      } catch {
        const cached = readOfflineCache<Album[]>(`hearttune-lyricist-albums:${selected.id}`, [])
        setAlbums(cached)
        setOfflineOnly(cached.length === 0)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selected])

  return (
    <section className="section">
      <div className="section-header">
        <h2>
          <PenLine size={22} /> Lyricist Albums
        </h2>
      </div>

      <div className="lyricist-chips">
        {lyricists.map((lyricist) => (
          <button
            key={lyricist.id}
            type="button"
            className={`lyricist-chip ${selected.id === lyricist.id ? 'active' : ''}`}
            onClick={() => setSelectedId(lyricist.id)}
          >
            {lyricist.name}
          </button>
        ))}
      </div>

      <p className="lyricist-subtitle">Albums featuring {selected.name}</p>

      {loading ? (
        <div className="album-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      ) : albums.length ? (
        <div className="album-grid">
          {albums.map((album, i) => (
            <AlbumCard key={album.id} album={album} index={i} />
          ))}
        </div>
      ) : offlineOnly ? (
        <p className="no-results">Connect online to load albums for {selected.name}.</p>
      ) : (
        <p className="no-results">No albums found for {selected.name}</p>
      )}
    </section>
  )
}
