import type { Album, Playlist, Song } from '../types'

const BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? '/api'
    : import.meta.env.VITE_SAAVN_API_URL || 'https://saavn.sumit.co')

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const json = await res.json()
  if (!json.success) throw new Error('API request failed')
  return json.data as T
}

function normalizeSearchQuery(query: string) {
  return query.replace(/\s+/g, ' ').trim()
}

function buildSongSearchQueries(query: string) {
  const normalized = normalizeSearchQuery(query)
  const withoutParentheses = normalizeSearchQuery(query.replace(/\([^)]*\)/g, ' '))
  const beforeParentheses = normalizeSearchQuery(query.split('(')[0] || '')

  return Array.from(
    new Set([normalized, withoutParentheses, beforeParentheses].filter(Boolean))
  )
}

function mergeUniqueSongs(songs: Song[]) {
  const seen = new Set<string>()
  return songs.filter((song) => {
    if (seen.has(song.id)) return false
    seen.add(song.id)
    return true
  })
}

export async function searchSongs(query: string, page = 1, limit = 20) {
  const queries = buildSongSearchQueries(query)
  const results: Song[] = []
  let total = 0

  for (const term of queries) {
    const data = await fetchApi<{ results: Song[]; total: number }>(
      `/search/songs?query=${encodeURIComponent(term)}&page=${page}&limit=${limit}`
    )
    total = Math.max(total, data.total)
    results.push(...data.results)

    if (data.results.length >= limit) break
  }

  const merged = mergeUniqueSongs(results)
  return { results: merged.slice(0, limit), total: Math.max(total, merged.length) }
}

export async function getSongSuggestions(query: string, limit = 8) {
  if (!query.trim()) return []
  const data = await searchSongs(query.trim(), 1, limit)
  return filterFullSongs(data.results)
}

export function isPreviewClip(song: Song) {
  const name = song.name.toLowerCase()
  return name.includes('trending version') || name.includes('(trending')
}

export function filterFullSongs(songs: Song[]) {
  return songs.filter((song) => !isPreviewClip(song))
}

export function preferLanguageSongs(songs: Song[], language: string) {
  if (language === 'all') return songs

  const matches = songs.filter((song) => normalizeSongLanguage(song.language) === language)
  return matches.length ? matches : songs
}

function normalizeSongLanguage(lang?: string) {
  return (lang || '').trim().toLowerCase()
}

export function getHomeQuery(language: string) {
  if (language === 'all') return 'top songs'
  return `top ${language} songs`
}

export interface LyricistRef {
  id: string
  name: string
}

export const LYRICISTS_BY_LANGUAGE: Record<string, LyricistRef[]> = {
  all: [
    { id: '456259', name: 'Irshad Kamil' },
    { id: '458681', name: 'Amitabh Bhattacharya' },
    { id: '455704', name: 'Gulzar' },
  ],
  hindi: [
    { id: '456259', name: 'Irshad Kamil' },
    { id: '458681', name: 'Amitabh Bhattacharya' },
    { id: '455704', name: 'Gulzar' },
  ],
  tamil: [
    { id: '457542', name: 'Vairamuthu' },
    { id: '456470', name: 'Thamarai' },
    { id: '455663', name: 'Anirudh Ravichander' },
    { id: '455454', name: 'G.V. Prakash Kumar' },
    { id: '773021', name: 'Hiphop Tamizha' },
  ],
  telugu: [{ id: '455178', name: 'Ramajogayya Sastry' }],
  malayalam: [{ id: '758680', name: 'Vinayak Sasikumar' }],
  kannada: [{ id: '485040', name: 'Kaviraj' }],
  punjabi: [
    { id: '680475', name: 'Jaani' },
    { id: '455665', name: 'Kumaar' },
  ],
  english: [{ id: '464645', name: 'Jaideep Sahni' }],
}

export function getLyricistsForLanguage(language: string) {
  return LYRICISTS_BY_LANGUAGE[language] || LYRICISTS_BY_LANGUAGE.all
}

export async function getArtistAlbums(artistId: string, page = 1, limit = 12) {
  const data = await fetchApi<{ total: number; albums: Album[] }>(
    `/artists/${artistId}/albums?page=${page}&limit=${limit}`
  )
  return data
}

export async function searchAlbums(query: string, page = 1, limit = 12) {
  const data = await fetchApi<{ results: Album[]; total: number }>(
    `/search/albums?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
  )
  return data
}

export async function searchPlaylists(query: string, page = 1, limit = 12) {
  const data = await fetchApi<{ results: Playlist[]; total: number }>(
    `/search/playlists?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
  )
  return data
}

export async function getAlbum(id: string) {
  const data = await fetchApi<Album | Album[]>(`/albums?id=${id}`)
  return Array.isArray(data) ? data[0] : data
}

export async function getPlaylist(id: string) {
  const data = await fetchApi<Playlist | Playlist[]>(`/playlists?id=${id}`)
  return Array.isArray(data) ? data[0] : data
}

export async function getSong(id: string) {
  const data = await fetchApi<Song[]>(`/songs?ids=${id}`)
  return data[0] || null
}

/** Fetch full song metadata + stream URLs before playback. */
export async function resolvePlayableSong(song: Song): Promise<Song> {
  try {
    const full = await getSong(song.id)
    if (!full) return song
    return {
      ...song,
      ...full,
      downloadUrl: full.downloadUrl?.length ? full.downloadUrl : song.downloadUrl,
      duration: full.duration || song.duration,
    }
  } catch {
    return song
  }
}

/** Replace short trending/preview clips with the full song when possible. */
export async function resolveFullSong(song: Song): Promise<Song> {
  if (!isPreviewClip(song)) return resolvePlayableSong(song)

  const cleanName = song.name
    .replace(/\(trending version\)/gi, '')
    .replace(/\(.*?trending.*?\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  try {
    const results = await searchSongs(cleanName, 1, 8)
    const candidates = filterFullSongs(results.results)
    const full =
      candidates.find(
        (s) =>
          s.id !== song.id &&
          (s.duration || 0) > (song.duration || 0) + 30
      ) || candidates.find((s) => s.id !== song.id)

    if (full) return resolvePlayableSong(full)
  } catch {
    /* fall through */
  }

  return resolvePlayableSong(song)
}

export function getBestImage(images: { quality: string; url: string }[], size = '500x500') {
  if (!images?.length) return ''
  const match = images.find((i) => i.quality === size)
  return match?.url || images[images.length - 1]?.url || ''
}

export function getBestAudioUrl(song: Song) {
  const urls = (song.downloadUrl || []).filter((u) => u.url && u.quality !== '12kbps')
  const preferred = ['320kbps', '160kbps', '96kbps', '48kbps']
  for (const q of preferred) {
    const found = urls.find((u) => u.quality === q)
    if (found) return found.url
  }
  return urls[urls.length - 1]?.url || ''
}

export async function getPlayableAudioUrl(song: Song) {
  const resolved = await resolveFullSong(song)
  const url = getBestAudioUrl(resolved)
  if (!url) throw new Error('No playable audio URL found')
  return { url, song: resolved }
}

export function getArtistNames(song: Song) {
  return song.artists?.primary?.map((a) => a.name).join(', ') || 'Unknown Artist'
}

export function getSongDuration(song: Song | null, audioDuration = 0) {
  const apiDuration = song?.duration || 0
  if (!apiDuration) return audioDuration
  if (!audioDuration || !Number.isFinite(audioDuration)) return apiDuration
  return Math.max(apiDuration, audioDuration)
}
