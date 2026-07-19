import type { Song } from '../types'
import { searchSongs, searchRelatedSongs, filterFullSongs, getSongs } from '../api/saavn'
import { getRecentlyPlayed } from './recentlyPlayedService'
import { getLikedSongs } from './likedSongsService'
import { getRecentSearchHistory } from './searchHistoryService'
import { getDownloads } from './downloadService'
import { readOfflineCache, writeOfflineCache } from '../utils/offlineCache'

export interface HomeSection {
  id: string
  title: string
  subtitle?: string
  items: Song[]
  type: 'song'
}

export interface HomeFeedConfig {
  id: string
  queryKey: string[]
  fetchFn: () => Promise<HomeSection | null>
}

export interface UserProfile {
  topArtists: string[]
  topLanguages: string[]
  topGenres: string[]
  recentSeedSongs: string[]
}

let getCacheQueue: { key: string; resolve: (val: any) => void }[] = []
let getCacheTimeout: any = null

async function flushGetCacheQueue() {
  if (getCacheQueue.length === 0) return
  const queue = [...getCacheQueue]
  getCacheQueue = []
  
  try {
    const keys = Array.from(new Set(queue.map(q => q.key)))
    const res = await fetch('/api/redis/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'GET', keys })
    })
    const json = await res.json()
    const data = json?.data || {}
    queue.forEach(q => q.resolve(data[q.key] ?? null))
  } catch {
    queue.forEach(q => q.resolve(null))
  }
}

async function getRedisCache<T>(key: string): Promise<T | null> {
  return new Promise((resolve) => {
    getCacheQueue.push({ key, resolve })
    if (!getCacheTimeout) {
      getCacheTimeout = setTimeout(() => {
        getCacheTimeout = null
        flushGetCacheQueue()
      }, 50)
    }
  })
}

let setCacheQueue: { key: string; value: any; ttlSeconds: number }[] = []
let setCacheTimeout: any = null

async function flushSetCacheQueue() {
  if (setCacheQueue.length === 0) return
  const items = [...setCacheQueue]
  setCacheQueue = []
  
  try {
    await fetch('/api/redis/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'SET', items })
    })
  } catch {
    // Best effort
  }
}

async function setRedisCache(key: string, value: unknown, ttlSeconds = 3600) {
  setCacheQueue.push({ key, value, ttlSeconds })
  if (!setCacheTimeout) {
    setCacheTimeout = setTimeout(() => {
      setCacheTimeout = null
      flushSetCacheQueue()
    }, 1000)
  }
}

export async function clearRecommendationsCache(userId: string) {
  try {
    const keys = [
      `user_profile:${userId}`,
      `discover_weekly:${userId}`,
      `because_you_liked:${userId}`
    ]
    await Promise.all(keys.map(key => setRedisCache(key, null, 0)))
  } catch { }
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function getArtistNames(song: Song) {
  return song?.artists?.primary?.map((a) => a.name) || []
}

function strictLanguageFilter(songs: Song[], language: string) {
  if (language === 'all') return songs
  return songs.filter(s => (s.language || '').toLowerCase() === language.toLowerCase())
}

export async function generateUserPreferenceModel(userId: string): Promise<UserProfile> {
  const cacheKey = `user_profile:${userId}`
  const cached = await getRedisCache<UserProfile>(cacheKey)
  if (cached) return cached

  const [recentSongs, likedSongs, searches, downloads] = await Promise.all([
    getRecentlyPlayed(userId, 50).catch(() => []),
    getLikedSongs(userId).catch(() => []),
    getRecentSearchHistory(userId, 20).catch(() => []),
    getDownloads(userId).catch(() => [])
  ])

  const artistWeights = new Map<string, number>()
  const languageWeights = new Map<string, number>()
  
  const LIKED_WEIGHT = 5
  const DOWNLOAD_WEIGHT = 5
  const RECENT_WEIGHT = 3

  const addWeight = (songs: any[], weight: number) => {
    songs.forEach(item => {
      const song = item.song || item
      if (!song) return
      getArtistNames(song).forEach(artist => {
        artistWeights.set(artist, (artistWeights.get(artist) || 0) + weight)
      })
      if (song.language) {
        languageWeights.set(song.language, (languageWeights.get(song.language) || 0) + weight)
      }
    })
  }

  addWeight(likedSongs, LIKED_WEIGHT)
  addWeight(downloads, DOWNLOAD_WEIGHT)
  addWeight(recentSongs, RECENT_WEIGHT)

  searches.forEach(search => {
    if (search.query) {
      const match = Array.from(artistWeights.keys()).find(a => a.toLowerCase() === search.query.toLowerCase())
      if (match) {
        artistWeights.set(match, (artistWeights.get(match) || 0) + 2)
      }
    }
  })

  const topArtists = Array.from(artistWeights.entries())
    .sort((a, b) => b[1] - a[1])
    .map(e => e[0])
    .slice(0, 10)

  const topLanguages = Array.from(languageWeights.entries())
    .sort((a, b) => b[1] - a[1])
    .map(e => e[0])
    .slice(0, 3)

  const profile: UserProfile = {
    topArtists,
    topLanguages: topLanguages.length > 0 ? topLanguages : ['hindi', 'english', 'tamil'],
    topGenres: ['pop', 'romantic', 'dance'],
    recentSeedSongs: recentSongs.slice(0, 5).map(r => r.song.id)
  }

  await setRedisCache(cacheKey, profile, 43200)
  return profile
}

export async function getTrendingSongs(language: string): Promise<HomeSection | null> {
  const cacheKey = `home:trending:${language}`
  const cached = await getRedisCache<HomeSection>(cacheKey)
  if (cached) return cached

  try {
    const trending = await searchSongs(`top ${language === 'all' ? 'hits' : language + ' hits'}`, 1, 50)
    const valid = strictLanguageFilter(filterFullSongs(trending.results), language).slice(0, 24)
    if (valid.length > 0) {
      const section: HomeSection = { id: 'trending_songs', title: '🔥 Trending Songs', items: valid, type: 'song' }
      await setRedisCache(cacheKey, section, 3600)
      writeOfflineCache(cacheKey, section)
      return section
    }
  } catch { }
  
  const offline = readOfflineCache<HomeSection | null>(cacheKey, null)
  if (offline) return offline
  return null
}

export function generateHomeFeedConfigs(userId: string | null, language: string): HomeFeedConfig[] {
  const configs: HomeFeedConfig[] = []

  const addRequestedSections = () => {
    configs.push({
      id: 'based_on_likes_custom',
      queryKey: ['home', 'based_on_likes', userId || 'guest', language],
      fetchFn: async () => {
        const cacheKey = `custom:based_on_likes_v2:${userId || 'guest'}:${language}`
        const cached = await getRedisCache<HomeSection>(cacheKey)
        if (cached) return cached
        try {
          let query = 'top hits'
          if (userId) {
            try {
              const profile = await generateUserPreferenceModel(userId)
              if (profile.topArtists.length > 0) query = profile.topArtists[0]
            } catch {}
          }
          const queryWithLang = userId 
            ? `${query} ${language === 'all' ? '' : language}` 
            : `hits ${language === 'all' ? '' : language}`;
          const res = await searchSongs(queryWithLang, 1, 50)
          const valid = strictLanguageFilter(filterFullSongs(res.results), language).slice(0, 24)
          if (valid.length > 0) {
            const section: HomeSection = { 
              id: 'based_on_likes_custom', 
              title: '❤️ Based on Your Likes', 
              subtitle: "Shows top hits matching your preferences (or general top hits if you haven't liked any songs yet).",
              items: valid, 
              type: 'song' 
            }
            await setRedisCache(cacheKey, section, 43200)
            writeOfflineCache(cacheKey, section)
            return section
          }
        } catch { }
        const offline = readOfflineCache<HomeSection | null>(cacheKey, null)
        if (offline) return offline
        return null
      }
    })

    const specificArtists = [
      { id: 'more_anirudh', artist: 'Anirudh Ravichander', title: 'More like Anirudh', subtitle: 'Shows top songs by Anirudh Ravichander.' },
      { id: 'more_vivek', artist: 'Vivek', title: 'More like Vivek', subtitle: 'Shows top songs by Vivek.' },
      { id: 'more_sai', artist: 'Sai Abhyankkar', title: 'More like Sai Abhyankkar', subtitle: 'Shows top songs by Sai Abhyankkar.' },
      { id: 'more_hiphop', artist: 'Hiphop Tamizha', title: 'More like Hiphop Tamizha', subtitle: 'Shows top songs by Hiphop Tamizha.' },
      { id: 'more_gv', artist: 'G.V. Prakash Kumar', title: 'More like G.V. Prakash', subtitle: 'Shows top songs by G.V. Prakash Kumar.' },
      { id: 'more_arr', artist: 'A.R. Rahman', title: 'More like A.R. Rahman', subtitle: 'Shows top songs by A.R. Rahman.' },
      { id: 'more_ilaiyaraaja', artist: 'Ilaiyaraaja', title: 'More like Ilaiyaraaja', subtitle: 'Shows top songs by Ilaiyaraaja.' },
    ]
    specificArtists.forEach(sa => {
      configs.push({
        id: sa.id,
        queryKey: ['home', 'specific', sa.id, language],
        fetchFn: async () => {
          const cacheKey = `custom:specific_v2:${sa.id}:${language}`
          const cached = await getRedisCache<HomeSection>(cacheKey)
          if (cached) return cached
          try {
            const queryWithLang = `${sa.artist} ${language === 'all' ? '' : language}`.trim()
            const res = await searchSongs(queryWithLang, 1, 50)
            const valid = strictLanguageFilter(filterFullSongs(res.results), language).slice(0, 24)
            if (valid.length > 0) {
              const section: HomeSection = { 
                id: sa.id, 
                title: sa.title, 
                subtitle: sa.subtitle,
                items: valid, 
                type: 'song' 
              }
              await setRedisCache(cacheKey, section, 86400)
              writeOfflineCache(cacheKey, section)
              return section
            }
          } catch { }
          const offline = readOfflineCache<HomeSection | null>(cacheKey, null)
          if (offline) return offline
          return null
        }
      })
    })

    const playlists = [
      { id: 'playlist_hits', query: `super hit playlist ${language === 'all' ? '' : language}`, title: '🎵 Super Hit Playlist', subtitle: 'A collection of the biggest hits.' },
      { id: 'playlist_party', query: `dance party playlist ${language === 'all' ? '' : language}`, title: '🕺 Dance Party', subtitle: 'Get ready to hit the dance floor.' }
    ]
    playlists.forEach(pl => {
      configs.push({
        id: pl.id,
        queryKey: ['home', 'playlist', pl.id, language],
        fetchFn: async () => {
          const cacheKey = `custom:playlist_v2:${pl.id}:${language}`
          const cached = await getRedisCache<HomeSection>(cacheKey)
          if (cached) return cached
          try {
            const res = await searchSongs(pl.query, 1, 50)
            const valid = strictLanguageFilter(filterFullSongs(res.results), language).slice(0, 24)
            if (valid.length > 0) {
              const section: HomeSection = { 
                id: pl.id, 
                title: pl.title, 
                subtitle: pl.subtitle,
                items: valid, 
                type: 'song' 
              }
              await setRedisCache(cacheKey, section, 86400)
              writeOfflineCache(cacheKey, section)
              return section
            }
          } catch { }
          const offline = readOfflineCache<HomeSection | null>(cacheKey, null)
          if (offline) return offline
          return null
        }
      })
    })
  }

  if (!userId) {
    configs.push({
      id: 'trending',
      queryKey: ['home', 'trending', language],
      fetchFn: () => getTrendingSongs(language)
    })
    addRequestedSections()
    const genres = [
      { id: 'chill', q: `chill vibes ${language === 'all' ? '' : language}`, title: '🌙 Chill Vibes' },
      { id: 'workout', q: `workout mix ${language === 'all' ? '' : language}`, title: '💪 Workout Mix' },
      { id: 'romantic', q: `romantic hits ${language === 'all' ? '' : language}`, title: '❤️ Romantic Hits' },
      { id: 'party', q: `party mix ${language === 'all' ? '' : language}`, title: '🎉 Party Mix' },
    ]
    for (const g of genres) {
      configs.push({
        id: g.id,
        queryKey: ['home', 'generic', g.id, language],
        fetchFn: async () => {
          const cacheKey = `home:generic:${g.id}:${language}`
          const cached = await getRedisCache<HomeSection>(cacheKey)
          if (cached) return cached
          try {
            const res = await searchSongs(g.q, 1, 50)
            const valid = strictLanguageFilter(filterFullSongs(res.results), language).slice(0, 24)
            if (valid.length === 0) return null
            const section: HomeSection = { id: g.id, title: g.title, items: valid, type: 'song' }
            await setRedisCache(cacheKey, section, 3600 * 2)
            return section
          } catch {
            return null
          }
        }
      })
    }
    return configs
  }

  const profilePromise = generateUserPreferenceModel(userId)

  configs.push({
    id: 'continue_listening',
    queryKey: ['home', 'continue_listening', userId],
    fetchFn: async () => {
      const recentSongs = await getRecentlyPlayed(userId, 20).catch(() => [])
      const recent = Array.from(new Map(recentSongs.map(e => e.song).filter(Boolean).map(s => [s.id, s])).values()) as Song[]
      const valid = strictLanguageFilter(recent, language)
      if (valid.length > 0) {
        return { id: 'continue_listening', title: '🎧 Continue Listening', items: valid.slice(0, 24), type: 'song' }
      }
      return null
    }
  })

  configs.push({
    id: 'trending',
    queryKey: ['home', 'trending', language],
    fetchFn: () => getTrendingSongs(language)
  })

  addRequestedSections()

  configs.push({
    id: 'discover_weekly',
    queryKey: ['home', 'discover_weekly', userId],
    fetchFn: async () => {
      const profile = await profilePromise
      if (!profile.topArtists.length) return null
      const cacheKey = `discover_weekly:${userId}:${language}`
      const cached = await getRedisCache<HomeSection>(cacheKey)
      if (cached) return cached

      try {
        const relatedPromises = profile.topArtists.slice(0, 2).map(artist => {
          const query = `${artist} ${language === 'all' ? '' : language}`.trim()
          return searchRelatedSongs(query, 20)
        })
        const results = await Promise.all(relatedPromises)
        
        const mixed = shuffle(results.flatMap(r => strictLanguageFilter(filterFullSongs(r.results), language))).slice(0, 24)
        if (mixed.length > 0) {
          const section: HomeSection = { id: 'discover_weekly', title: '🎶 Discover Weekly', items: mixed, type: 'song' }
          await setRedisCache(cacheKey, section, 43200) // 12 hours
          return section
        }
      } catch { }
      return null
    }
  })

  configs.push({
    id: 'trending_for_you',
    queryKey: ['home', 'trending_for_you', userId, language],
    fetchFn: async () => {
      const profile = await profilePromise
      const prefLang = profile.topLanguages[0] || language
      const cacheKey = `trending_for_you:${userId}:${prefLang}`
      const cached = await getRedisCache<HomeSection>(cacheKey)
      if (cached) return cached

      try {
        const trending = await searchSongs(`top ${prefLang === 'all' ? 'hits' : prefLang + ' hits'}`, 1, 50)
        const valid = strictLanguageFilter(filterFullSongs(trending.results), prefLang).slice(0, 24)
        if (valid.length > 0) {
          const section: HomeSection = { id: 'trending_for_you', title: '🔥 Trending For You', items: valid, type: 'song' }
          await setRedisCache(cacheKey, section, 14400) // 4 hours
          return section
        }
      } catch { }
      return getTrendingSongs(language)
    }
  })

  configs.push({
    id: 'because_you_liked',
    queryKey: ['home', 'because_you_liked', userId],
    fetchFn: async () => {
      const profile = await profilePromise
      if (!profile.topArtists.length) return null
      
      const topArtist = profile.topArtists[0]
      const cacheKey = `because_you_liked:${userId}:${topArtist}:${language}`
      const cached = await getRedisCache<HomeSection>(cacheKey)
      if (cached) return cached

      try {
        const query = `${topArtist} ${language === 'all' ? '' : language}`.trim()
        const related = await searchRelatedSongs(query, 50)
        const valid = strictLanguageFilter(filterFullSongs(related.results), language)
        if (valid.length > 0) {
          const section: HomeSection = { id: 'because_you_liked', title: `❤️ Because You Liked ${topArtist}`, items: valid, type: 'song' }
          await setRedisCache(cacheKey, section, 43200)
          return section
        }
      } catch { }
      return null
    }
  })

  const mixTypes = [
    { id: 'daily_mix_1', prefix: 'Daily Mix 1', suffix: 'Mix', icon: '🎵' },
    { id: 'daily_mix_2', prefix: 'Daily Mix 2', suffix: 'Hits', icon: '🎵' },
    { id: 'chill_mix', prefix: 'Chill Mix', suffix: 'Chill', icon: '🌙' },
    { id: 'workout_mix', prefix: 'Workout Mix', suffix: 'Workout', icon: '💪' },
  ]

  mixTypes.forEach((mix, i) => {
    configs.push({
      id: mix.id,
      queryKey: ['home', 'mix', userId, mix.id],
      fetchFn: async () => {
        const profile = await profilePromise
        const artist = profile.topArtists[i % profile.topArtists.length]
        if (!artist) return null

        const cacheKey = `mix:${userId}:${mix.id}:${artist}:${language}`
        const cached = await getRedisCache<HomeSection>(cacheKey)
        if (cached) return cached

        try {
          const query = `${artist} ${mix.suffix} ${language === 'all' ? '' : language}`.trim()
          const res = await searchSongs(query, 1, 50)
          const valid = strictLanguageFilter(filterFullSongs(res.results), language).slice(0, 24)
          if (valid.length > 0) {
            const section: HomeSection = { id: mix.id, title: `${mix.icon} ${mix.prefix}`, items: valid, type: 'song' }
            await setRedisCache(cacheKey, section, 43200)
            return section
          }
        } catch { }
        return null
      }
    })
  })

  configs.push({
    id: 'search_based',
    queryKey: ['home', 'search_based', userId, language],
    fetchFn: async () => {
      const searches = await getRecentSearchHistory(userId, 5).catch(() => [])
      if (searches.length > 0) {
        const topSearch = searches[0].query
        const query = `${topSearch} hits ${language === 'all' ? '' : language}`.trim()
        const searchMix = await searchSongs(query, 1, 50)
        const validSearch = strictLanguageFilter(filterFullSongs(searchMix.results), language)
        if (validSearch.length > 0) {
          return {
            id: 'search_based',
            title: `Because you searched for "${topSearch}"`,
            items: validSearch.slice(0, 24),
            type: 'song'
          }
        }
      }
      return null
    }
  })

  return configs
}

export async function generateHomeFeed(userId: string | null, language: string): Promise<HomeSection[]> {
  const configs = generateHomeFeedConfigs(userId, language)
  const results = await Promise.all(configs.map(c => c.fetchFn()))
  return results.filter(Boolean) as HomeSection[]
}

export async function getGenericSections(language: string): Promise<HomeSection[]> {
  try {
    const [trending, chill, workout, romantic, party] = await Promise.all([
      searchSongs(`top ${language === 'all' ? 'hits' : language + ' hits'}`, 1, 30),
      searchSongs(`chill vibes ${language === 'all' ? '' : language}`, 1, 30),
      searchSongs(`workout mix ${language === 'all' ? '' : language}`, 1, 30),
      searchSongs(`romantic hits ${language === 'all' ? '' : language}`, 1, 30),
      searchSongs(`party mix ${language === 'all' ? '' : language}`, 1, 30)
    ])

    return [
      { id: 'trending', title: '🔥 Trending Now', items: filterFullSongs(trending.results).slice(0, 24), type: 'song' as const },
      { id: 'chill', title: '🌙 Chill Vibes', items: filterFullSongs(chill.results).slice(0, 24), type: 'song' as const },
      { id: 'workout', title: '💪 Workout Mix', items: filterFullSongs(workout.results).slice(0, 24), type: 'song' as const },
      { id: 'romantic', title: '❤️ Romantic Hits', items: filterFullSongs(romantic.results).slice(0, 24), type: 'song' as const },
      { id: 'party', title: '🎉 Party Mix', items: filterFullSongs(party.results).slice(0, 24), type: 'song' as const }
    ].filter(section => section.items.length > 0)
  } catch {
    return []
  }
}
