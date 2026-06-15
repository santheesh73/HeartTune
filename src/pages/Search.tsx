import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search as SearchIcon, Music, Disc, ListMusic, Globe2 } from 'lucide-react'
import {
  searchSongs,
  searchAlbums,
  searchPlaylists,
  getSongSuggestions,
  getBestImage,
  getArtistNames,
  filterFullSongs,
  preferLanguageSongs,
} from '../api/saavn'
import type { Song, Album, Playlist } from '../types'
import SongRow from '../components/SongRow'
import AlbumCard from '../components/AlbumCard'
import { useLanguage, type AppLanguage } from '../context/LanguageContext'
import { usePlayer } from '../context/PlayerContext'

type Tab = 'songs' | 'albums' | 'playlists'

export default function Search() {
  const [params, setParams] = useSearchParams()
  const initialQ = params.get('q') || ''
  const [query, setQuery] = useState(initialQ)
  const [activeTab, setActiveTab] = useState<Tab>('songs')
  const [songs, setSongs] = useState<Song[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [suggestions, setSuggestions] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const { language, setLanguage, languages } = useLanguage()
  const { playSong } = usePlayer()
  const searchWrapRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (initialQ) doSearch(initialQ)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = query.trim()
    if (!trimmed) {
      setSuggestions([])
      setSuggestLoading(false)
      return
    }

    setSuggestLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await getSongSuggestions(trimmed, 8)
        setSuggestions(preferLanguageSongs(results, language))
        setActiveSuggestion(-1)
      } catch {
        setSuggestions([])
      } finally {
        setSuggestLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, language])

  const doSearch = async (q: string) => {
    if (!q.trim()) return
    setLoading(true)
    setSearched(true)
    setShowSuggestions(false)
    setParams({ q })
    try {
      const [s, a, p] = await Promise.all([
        searchSongs(q, 1, 30),
        searchAlbums(q, 1, 12),
        searchPlaylists(q, 1, 12),
      ])
      const filteredSongs = preferLanguageSongs(filterFullSongs(s.results), language)
      setSongs(filteredSongs)
      setAlbums(a.results)
      setPlaylists(p.results)
    } catch {
      setSongs([])
      setAlbums([])
      setPlaylists([])
    } finally {
      setLoading(false)
    }
  }

  const selectSuggestion = (song: Song) => {
    setQuery(song.name)
    setShowSuggestions(false)
    doSearch(song.name)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (activeSuggestion >= 0 && suggestions[activeSuggestion]) {
      selectSuggestion(suggestions[activeSuggestion])
      return
    }
    doSearch(query)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || !suggestions.length) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveSuggestion((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveSuggestion((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setActiveSuggestion(-1)
    }
  }

  useEffect(() => {
    if (searched) doSearch(query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  const tabs: { id: Tab; label: string; icon: typeof Music; count: number }[] = [
    { id: 'songs', label: 'Songs', icon: Music, count: songs.length },
    { id: 'albums', label: 'Albums', icon: Disc, count: albums.length },
    { id: 'playlists', label: 'Playlists', icon: ListMusic, count: playlists.length },
  ]

  const showDropdown = showSuggestions && query.trim().length > 0

  return (
    <div className="page search-page">
      <div className="search-bar-wrap" ref={searchWrapRef}>
        <motion.form
          className="search-bar"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <SearchIcon size={22} />
          <input
            type="text"
            placeholder="Search songs, albums, artists..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => query.trim() && setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            autoFocus
            autoComplete="off"
            role="combobox"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
          />
          <div className="lang-select">
            <Globe2 size={18} />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as AppLanguage)}
              aria-label="Select language"
            >
              {languages.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit">Search</button>
        </motion.form>

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              className="search-suggestions"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {suggestLoading ? (
                <div className="suggestion-status">Searching...</div>
              ) : suggestions.length === 0 ? (
                <div className="suggestion-status">No suggestions found</div>
              ) : (
                suggestions.map((song, i) => (
                  <button
                    key={song.id}
                    type="button"
                    className={`suggestion-item ${activeSuggestion === i ? 'active' : ''}`}
                    onMouseEnter={() => setActiveSuggestion(i)}
                    onClick={() => selectSuggestion(song)}
                  >
                    <img
                      src={getBestImage(song.image, '150x150')}
                      alt=""
                      className="suggestion-thumb"
                    />
                    <div className="suggestion-info">
                      <span className="suggestion-title">{song.name}</span>
                      <span className="suggestion-artist">{getArtistNames(song)}</span>
                    </div>
                    <button
                      type="button"
                      className="suggestion-play"
                      title="Play now"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowSuggestions(false)
                        playSong(song, suggestions)
                      }}
                    >
                      <Music size={16} />
                    </button>
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {searched && (
        <div className="search-tabs">
          {tabs.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              className={`search-tab ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={18} />
              {label}
              <span className="tab-count">{count}</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="loading-list">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton-row" />
          ))}
        </div>
      ) : !searched ? (
        <div className="search-empty">
          <SearchIcon size={64} />
          <h2>Search for your favorite music</h2>
          <p>Start typing to see song suggestions</p>
        </div>
      ) : activeTab === 'songs' ? (
        songs.length ? (
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
        ) : (
          <p className="no-results">No songs found for "{query}"</p>
        )
      ) : activeTab === 'albums' ? (
        albums.length ? (
          <div className="album-grid">
            {albums.map((album, i) => (
              <AlbumCard key={album.id} album={album} index={i} />
            ))}
          </div>
        ) : (
          <p className="no-results">No albums found</p>
        )
      ) : playlists.length ? (
        <div className="album-grid">
          {playlists.map((pl) => (
            <a key={pl.id} href={`/playlist/${pl.id}`} className="album-card">
              <div className="album-card-image-wrap">
                <img
                  src={pl.image?.[pl.image.length - 1]?.url}
                  alt={pl.name}
                  className="album-card-image"
                />
              </div>
              <h3 className="album-card-title">{pl.name}</h3>
            </a>
          ))}
        </div>
      ) : (
        <p className="no-results">No playlists found</p>
      )}
    </div>
  )
}
