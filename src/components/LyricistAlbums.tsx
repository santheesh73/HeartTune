import { useEffect, useState } from 'react'
import { PenLine } from 'lucide-react'
import { getArtistAlbums, getLyricistsForLanguage, type LyricistRef } from '../api/saavn'
import type { Album } from '../types'
import AlbumCard from './AlbumCard'

interface LyricistAlbumsProps {
  language: string
}

export default function LyricistAlbums({ language }: LyricistAlbumsProps) {
  const lyricists = getLyricistsForLanguage(language)
  const [selected, setSelected] = useState<LyricistRef>(lyricists[0])
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const list = getLyricistsForLanguage(language)
    setSelected(list[0])
  }, [language])

  useEffect(() => {
    if (!selected) return

    async function load() {
      setLoading(true)
      try {
        const data = await getArtistAlbums(selected.id, 1, 8)
        setAlbums(data.albums || [])
      } catch {
        setAlbums([])
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
            onClick={() => setSelected(lyricist)}
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
      ) : (
        <p className="no-results">No albums found for {selected.name}</p>
      )}
    </section>
  )
}
