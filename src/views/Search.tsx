import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search as SearchIcon, Music, Disc, Globe2, X } from 'lucide-react'
import {
  ensureMinimumSongs,
  searchSongs,
  searchRelatedSongs,
  searchAlbums,
  getSongSuggestions,
  getBestImage,
  getArtistNames,
  filterFullSongs,
  preferLanguageSongs,
} from '../api/saavn'
import type { Song, Album } from '../types'
import SongRow from '../components/SongRow'
import AlbumCard from '../components/AlbumCard'
import { useLanguage, type AppLanguage } from '../context/LanguageContext'
import { usePlayer } from '../context/PlayerContext'

type Tab = 'songs' | 'albums'
const RECENT_SEARCHES_KEY = 'hearttune_recent_searches'

interface RecentSearchItem {
  id: string
  kind: 'song' | 'album' | 'query'
  title: string
  subtitle: string
  imageUrl: string
  query: string
  song?: Song
}

function decodeHtmlEntities(value: string) {
  if (typeof window === 'undefined') return value

  const textarea = document.createElement('textarea')
  textarea.innerHTML = value
  return textarea.value.replace(/•|·|â€¢|Â·/g, '\u2022')
}

function buildSongRecentItem(song: Song, query?: string): RecentSearchItem {
  return {
    id: `song-${song.id}`,
    kind: 'song',
    title: decodeHtmlEntities(song.name),
    subtitle: `Song • ${getArtistNames(song)}`,
    imageUrl: getBestImage(song.image, '150x150'),
    query: decodeHtmlEntities(query || song.name),
    song,
  }
}

function buildAlbumRecentItem(album: Album, query?: string): RecentSearchItem {
  const artists = album.artists?.primary?.map((artist) => artist.name).join(', ')
  return {
    id: `album-${album.id}`,
    kind: 'album',
    title: decodeHtmlEntities(album.name),
    subtitle: artists ? `Album • ${artists}` : 'Album',
    imageUrl: getBestImage(album.image, '150x150'),
    query: decodeHtmlEntities(query || album.name),
  }
}

function normalizeRecentSearches(value: unknown): RecentSearchItem[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item, index) => {
      if (typeof item === 'string') {
        const title = decodeHtmlEntities(item)
        return {
          id: `query-${title}-${index}`,
          kind: 'query' as const,
          title,
          subtitle: 'Search',
          imageUrl: '',
          query: title,
        }
      }

      if (!item || typeof item !== 'object') return null

      const candidate = item as Partial<RecentSearchItem>
      if (!candidate.title || !candidate.query) return null

      return {
        id: candidate.id || `query-${candidate.query}-${index}`,
        kind: candidate.kind === 'song' || candidate.kind === 'album' ? candidate.kind : 'query',
        title: decodeHtmlEntities(candidate.title),
        subtitle: candidate.subtitle || 'Search',
        imageUrl: candidate.imageUrl || '',
        query: decodeHtmlEntities(candidate.query),
        song: candidate.song,
      }
    })
    .filter((item): item is RecentSearchItem => Boolean(item))
}

export default function Search() {
  const [params, setParams] = useSearchParams()
  const initialQ = params.get('q') || ''
  const [query, setQuery] = useState(initialQ)
  const [activeTab, setActiveTab] = useState<Tab>('songs')
  const [songs, setSongs] = useState<Song[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [suggestions, setSuggestions] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>(() => {
    if (typeof window === 'undefined') return []

    try {
      return normalizeRecentSearches(JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]'))
    } catch {
      return []
    }
  })
  const { language, setLanguage, languages } = useLanguage()
  const { playSong } = usePlayer()
  const searchWrapRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveRecentSearchItem = useCallback((item: RecentSearchItem) => {
    setRecentSearches((prev) => {
      const next = [
        item,
        ...prev.filter(
          (entry) =>
            entry.id !== item.id &&
            entry.query.toLowerCase() !== item.query.toLowerCase() &&
            entry.title.toLowerCase() !== item.title.toLowerCase()
        ),
      ].slice(0, 8)

      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const removeRecentSearchItem = useCallback((id: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((item) => item.id !== id)
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const doSearch = useCallback(async (q: string) => {
    const trimmed = decodeHtmlEntities(q).trim()
    if (!trimmed) return

    setLoading(true)
    setSearched(true)
    setShowSuggestions(false)
    setParams({ q: trimmed })
    try {
      const [s, related, a] = await Promise.all([
        searchSongs(trimmed, 1, 40),
        searchRelatedSongs(trimmed, 20),
        searchAlbums(trimmed, 1, 12),
      ])
      const primarySongs = filterFullSongs(s.results)
      const relatedSongs = filterFullSongs(related.results)
      const languagePreferred = preferLanguageSongs(primarySongs, language)
      const relatedPreferred = preferLanguageSongs(relatedSongs, language)
      const finalSongs = ensureMinimumSongs(languagePreferred, relatedPreferred, 20)

      setSongs(finalSongs)
      setAlbums(a.results)
      setQuery(trimmed)
      if (finalSongs[0]) {
        saveRecentSearchItem(buildSongRecentItem(finalSongs[0], trimmed))
      } else if (a.results[0]) {
        saveRecentSearchItem(buildAlbumRecentItem(a.results[0], trimmed))
      }
    } catch {
      setSongs([])
      setAlbums([])
    } finally {
      setLoading(false)
    }
  }, [language, saveRecentSearchItem, setParams])

  useEffect(() => {
    if (initialQ) void doSearch(initialQ)
  }, [doSearch, initialQ])

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

  const selectSuggestion = (song: Song) => {
    const decodedName = decodeHtmlEntities(song.name)
    saveRecentSearchItem(buildSongRecentItem(song, decodedName))
    setQuery(decodedName)
    setShowSuggestions(false)
    void doSearch(decodedName)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (activeSuggestion >= 0 && suggestions[activeSuggestion]) {
      selectSuggestion(suggestions[activeSuggestion])
      return
    }
    void doSearch(query)
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
    if (searched && query.trim()) void doSearch(query)
  }, [doSearch, query, searched])

  const handleRecentSearchClick = (item: RecentSearchItem) => {
    saveRecentSearchItem(item)

    if (item.kind === 'song' && item.song) {
      setQuery(item.query)
      playSong(item.song, [item.song])
      return
    }

    void doSearch(item.query)
  }

  const tabs: { id: Tab; label: string; icon: typeof Music; count: number }[] = [
    { id: 'songs', label: 'Songs', icon: Music, count: songs.length },
    { id: 'albums', label: 'Albums', icon: Disc, count: albums.length },
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
          <button type="submit" className="search-submit-btn" aria-label="Search">
            <SearchIcon size={18} />
          </button>
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
                  <div
                    key={song.id}
                    role="button"
                    tabIndex={0}
                    className={`suggestion-item ${activeSuggestion === i ? 'active' : ''}`}
                    onMouseEnter={() => setActiveSuggestion(i)}
                    onClick={() => selectSuggestion(song)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        void selectSuggestion(song)
                      }
                    }}
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
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {recentSearches.length > 0 && (
        <section className="recent-searches">
          <div className="section-header">
            <h2>Recent Searches</h2>
          </div>
          <div className="recent-search-list">
            {recentSearches.map((item) => (
              <div
                key={item.id}
                className={`recent-search-item ${
                  item.query.toLowerCase() === query.trim().toLowerCase() ? 'active' : ''
                }`}
                role="button"
                tabIndex={0}
                onClick={() => handleRecentSearchClick(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    handleRecentSearchClick(item)
                  }
                }}
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="recent-search-thumb" loading="lazy" />
                ) : (
                  <span className="recent-search-thumb fallback">
                    <SearchIcon size={18} />
                  </span>
                )}
                <span className="recent-search-copy">
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                </span>
                <button
                  type="button"
                  className="recent-search-remove"
                  title="Remove from recent searches"
                  aria-label={`Remove ${item.title} from recent searches`}
                  onClick={(event) => {
                    event.stopPropagation()
                    removeRecentSearchItem(item.id)
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

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
      ) : (
        <p className="no-results">No albums found</p>
      )}
    </div>
  )
}

