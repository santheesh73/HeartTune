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
        <div className="flex overflow-x-auto gap-4 sm:gap-6 px-4 sm:px-6 pb-6 pt-2 hide-scrollbar">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="shrink-0 w-[150px] sm:w-[190px] md:w-[220px]">
              <div className="skeleton-card w-full aspect-square rounded-xl" />
            </div>
          ))}
        </div>
      ) : albums.length ? (
        <div 
          className="flex overflow-x-auto gap-4 sm:gap-6 px-4 sm:px-6 pb-6 pt-2 snap-x snap-mandatory hide-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {albums.map((album, index) => (
            <div key={album.id} className="snap-start shrink-0 w-[150px] sm:w-[190px] md:w-[220px]">
              <AlbumCard album={album} index={index} />
            </div>
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
