import type { Song } from '../types'
import { searchSongs, searchRelatedSongs, filterFullSongs, getSongs } from '../api/saavn'
import { getRecentlyPlayed } from './recentlyPlayedService'
import { getLikedSongs } from './likedSongsService'
import { getRecentSearchHistory } from './searchHistoryService'
import { getDownloads } from './downloadService'

export interface HomeSection {
  id: string
  title: string
  subtitle?: string
  items: Song[]
  type: 'song'
}

export type HomeFeedThunk = () => Promise<HomeSection | null>

export interface UserProfile {
  topArtists: string[]
  topLanguages: string[]
  topGenres: string[]
  recentSeedSongs: string[]
}

async function getRedisCache<T>(key: string): Promise<T | null> {
  try {
    const res = await fetch(`/api/redis?key=${encodeURIComponent(key)}`)
    if (!res.ok) return null
    const json = await res.json()
    return json.data as T
  } catch {
    return null
  }
}

async function setRedisCache(key: string, value: unknown, ttlSeconds = 3600) {
  try {
    await fetch('/api/redis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value, ttlSeconds }),
    })
  } catch {
    // best effort
  }
}

export async function clearRecommendationsCache(userId: string) {
  try {
    const keys = [
      `user_profile:${userId}`,
      `discover_weekly:${userId}`,
      `because_you_liked:${userId}`
    ]
    // In a real app we might use a bulk delete, but here we can just set TTL to 0
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

// 1. User Preference Model
export async function generateUserPreferenceModel(userId: string): Promise<UserProfile> {
  const cacheKey = `user_profile:${userId}`
  const cached = await getRedisCache<UserProfile>(cacheKey)
  if (cached) return cached

  // Aggregate data in parallel
  const [recentSongs, likedSongs, searches, downloads] = await Promise.all([
    getRecentlyPlayed(userId, 50).catch(() => []),
    getLikedSongs(userId).catch(() => []),
    getRecentSearchHistory(userId, 20).catch(() => []),
    getDownloads(userId).catch(() => [])
  ])

  const artistWeights = new Map<string, number>()
  const languageWeights = new Map<string, number>() // Usually derived from metadata, but fallback to general languages
  
  // Weights
  const LIKED_WEIGHT = 5
  const DOWNLOAD_WEIGHT = 5
  const RECENT_WEIGHT = 3

  const addWeight = (songs: any[], weight: number) => {
    songs.forEach(item => {
      const song = item.song || item // handle direct song or nested record
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

  // Track recent searches for context weight
  searches.forEach(search => {
    if (search.query) {
      // Very basic heuristic: if query matches artist name in saavn, boost it.
      // We just boost exact matches for now.
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

  // Top genres can be mapped from artists typically, but we'll infer general mixes
  const profile: UserProfile = {
    topArtists,
    topLanguages: topLanguages.length > 0 ? topLanguages : ['hindi', 'english', 'tamil'],
    topGenres: ['pop', 'romantic', 'dance'], // Defaulting for mixes if metadata lacks it
    recentSeedSongs: recentSongs.slice(0, 5).map(r => r.song.id)
  }

  await setRedisCache(cacheKey, profile, 43200) // Cache for 12 hours
  return profile
}

export async function getTrendingSongs(language: string): Promise<HomeSection | null> {
  const cacheKey = `home:trending:${language}`
  const cached = await getRedisCache<HomeSection>(cacheKey)
  if (cached) return cached

  try {
    const trending = await searchSongs(`top ${language === 'all' ? 'hits' : language + ' hits'}`, 1, 30)
    const valid = filterFullSongs(trending.results).slice(0, 24)
    if (valid.length === 0) return null

    const section: HomeSection = { id: 'trending_songs', title: '🔥 Trending Songs', items: valid, type: 'song' }
    await setRedisCache(cacheKey, section, 3600)
    return section
  } catch {
    return null
  }
}

export function generateHomeFeedThunks(userId: string | null, language: string): HomeFeedThunk[] {
  const thunks: HomeFeedThunk[] = []

  const addRequestedSections = () => {
    thunks.push(async () => {
      const cacheKey = `custom:based_on_likes_v2:${userId || 'guest'}`
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
        const res = await searchSongs(userId ? query : 'top songs', 1, 30)
        const valid = filterFullSongs(res.results).slice(0, 24)
        if (valid.length > 0) {
          const section: HomeSection = { 
            id: 'based_on_likes_custom', 
            title: '❤️ Based on Your Likes', 
            subtitle: "Shows top hits matching your preferences (or general top hits if you haven't liked any songs yet).",
            items: valid, 
            type: 'song' 
          }
          await setRedisCache(cacheKey, section, 43200)
          return section
        }
      } catch { }
      return null
    })

    const specificArtists = [
      { id: 'more_anirudh', artist: 'Anirudh Ravichander', title: 'More like Anirudh', subtitle: 'Shows top songs by Anirudh Ravichander.' },
      { id: 'more_vivek', artist: 'Vivek', title: 'More like Vivek', subtitle: 'Shows top songs by Vivek.' },
      { id: 'more_sai', artist: 'Sai Abhyankkar', title: 'More like Sai Abhyankkar', subtitle: 'Shows top songs by Sai Abhyankkar.' },
    ]
    specificArtists.forEach(sa => {
      thunks.push(async () => {
        const cacheKey = `custom:specific_v2:${sa.id}`
        const cached = await getRedisCache<HomeSection>(cacheKey)
        if (cached) return cached
        try {
          const res = await searchSongs(sa.artist, 1, 30)
          const valid = filterFullSongs(res.results).slice(0, 24)
          if (valid.length > 0) {
            const section: HomeSection = { 
              id: sa.id, 
              title: sa.title, 
              subtitle: sa.subtitle,
              items: valid, 
              type: 'song' 
            }
            await setRedisCache(cacheKey, section, 86400)
            return section
          }
        } catch { }
        return null
      })
    })
  }

  if (!userId) {
    // 1. Trending Songs (Always first)
    thunks.push(() => getTrendingSongs(language))
    const genres = [
      { id: 'chill', q: `chill vibes ${language === 'all' ? '' : language}`, title: '🌙 Chill Vibes' },
      { id: 'workout', q: `workout mix ${language === 'all' ? '' : language}`, title: '💪 Workout Mix' },
      { id: 'romantic', q: `romantic hits ${language === 'all' ? '' : language}`, title: '❤️ Romantic Hits' },
      { id: 'party', q: `party mix ${language === 'all' ? '' : language}`, title: '🎉 Party Mix' },
    ]
    for (const g of genres) {
      thunks.push(async () => {
        const cacheKey = `home:generic:${g.id}:${language}`
        const cached = await getRedisCache<HomeSection>(cacheKey)
        if (cached) return cached
        try {
          const res = await searchSongs(g.q, 1, 30)
          const valid = filterFullSongs(res.results).slice(0, 24)
          if (valid.length === 0) return null
          const section: HomeSection = { id: g.id, title: g.title, items: valid, type: 'song' }
          await setRedisCache(cacheKey, section, 3600 * 2)
          return section
        } catch {
          return null
        }
      })
    }
    addRequestedSections()
    return thunks
  }

  // --- SMART RECOMMENDATION SYSTEM FOR AUTHENTICATED USERS --- //

  // Get user profile once for all thunks
  const profilePromise = generateUserPreferenceModel(userId)

  // 1. Continue Listening
  thunks.push(async () => {
    const recentSongs = await getRecentlyPlayed(userId, 20).catch(() => [])
    const recent = Array.from(new Map(recentSongs.map(e => e.song).filter(Boolean).map(s => [s.id, s])).values()) as Song[]
    if (recent.length > 0) {
      return { id: 'continue_listening', title: '🎧 Continue Listening', items: recent.slice(0, 24), type: 'song' }
    }
    return null
  })

  // 2. Discover Weekly
  thunks.push(async () => {
    const profile = await profilePromise
    if (!profile.topArtists.length) return null
    const cacheKey = `discover_weekly:${userId}`
    const cached = await getRedisCache<HomeSection>(cacheKey)
    if (cached) return cached

    try {
      // Fetch related songs for top 2 artists
      const relatedPromises = profile.topArtists.slice(0, 2).map(artist => searchRelatedSongs(artist, 20))
      const results = await Promise.all(relatedPromises)
      
      const mixed = shuffle(results.flatMap(r => filterFullSongs(r.results))).slice(0, 24)
      if (mixed.length > 0) {
        const section: HomeSection = { id: 'discover_weekly', title: '🎶 Discover Weekly', items: mixed, type: 'song' }
        await setRedisCache(cacheKey, section, 43200) // 12 hours
        return section
      }
    } catch { }
    return null
  })

  // 3. Trending For You
  thunks.push(async () => {
    const profile = await profilePromise
    const prefLang = profile.topLanguages[0] || language
    const cacheKey = `trending_for_you:${userId}:${prefLang}`
    const cached = await getRedisCache<HomeSection>(cacheKey)
    if (cached) return cached

    try {
      const trending = await searchSongs(`top ${prefLang === 'all' ? 'hits' : prefLang + ' hits'}`, 1, 30)
      const valid = filterFullSongs(trending.results).slice(0, 24)
      if (valid.length > 0) {
        const section: HomeSection = { id: 'trending_for_you', title: '🔥 Trending For You', items: valid, type: 'song' }
        await setRedisCache(cacheKey, section, 14400) // 4 hours
        return section
      }
    } catch { }
    return getTrendingSongs(language) // fallback
  })

  // 4. Because You Liked
  thunks.push(async () => {
    const profile = await profilePromise
    if (!profile.topArtists.length) return null
    
    const topArtist = profile.topArtists[0]
    const cacheKey = `because_you_liked:${userId}:${topArtist}`
    const cached = await getRedisCache<HomeSection>(cacheKey)
    if (cached) return cached

    try {
      const related = await searchRelatedSongs(topArtist, 24)
      const valid = filterFullSongs(related.results)
      if (valid.length > 0) {
        const section: HomeSection = { id: 'because_you_liked', title: `❤️ Because You Liked ${topArtist}`, items: valid, type: 'song' }
        await setRedisCache(cacheKey, section, 43200)
        return section
      }
    } catch { }
    return null
  })

  // 5. Daily Mixes
  const mixTypes = [
    { id: 'daily_mix_1', prefix: 'Daily Mix 1', suffix: 'Mix', icon: '🎵' },
    { id: 'daily_mix_2', prefix: 'Daily Mix 2', suffix: 'Hits', icon: '🎵' },
    { id: 'chill_mix', prefix: 'Chill Mix', suffix: 'Chill', icon: '🌙' },
    { id: 'workout_mix', prefix: 'Workout Mix', suffix: 'Workout', icon: '💪' },
  ]

  mixTypes.forEach((mix, i) => {
    thunks.push(async () => {
      const profile = await profilePromise
      const artist = profile.topArtists[i % profile.topArtists.length]
      if (!artist) return null

      const cacheKey = `mix:${userId}:${mix.id}:${artist}`
      const cached = await getRedisCache<HomeSection>(cacheKey)
      if (cached) return cached

      try {
        const res = await searchSongs(`${artist} ${mix.suffix}`, 1, 30)
        const valid = filterFullSongs(res.results).slice(0, 24)
        if (valid.length > 0) {
          const section: HomeSection = { id: mix.id, title: `${mix.icon} ${mix.prefix}`, items: valid, type: 'song' }
          await setRedisCache(cacheKey, section, 43200)
          return section
        }
      } catch { }
      return null
    })
  })

  // 6. Search Based (If recent searches exist)
  thunks.push(async () => {
    const searches = await getRecentSearchHistory(userId, 5).catch(() => [])
    if (searches.length > 0) {
      const topSearch = searches[0].query
      const searchMix = await searchSongs(`${topSearch} hits`, 1, 24)
      const validSearch = filterFullSongs(searchMix.results)
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
  })

  addRequestedSections()
  return thunks
}

// Keep generateHomeFeed for backwards compatibility if needed elsewhere
export async function generateHomeFeed(userId: string | null, language: string): Promise<HomeSection[]> {
  const thunks = generateHomeFeedThunks(userId, language)
  const results = await Promise.all(thunks.map(t => t()))
  return results.filter(Boolean) as HomeSection[]
}

export async function getGenericSections(language: string): Promise<HomeSection[]> {
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
}
