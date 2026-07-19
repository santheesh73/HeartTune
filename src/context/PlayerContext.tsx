import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from 'react'
import type { Song } from '../types'
import {
  filterFullSongs,
  getHomeQuery,
  getPlayableAudioUrl,
  getSongDuration,
  preferLanguageSongs,
  searchSongs,
  searchRelatedSongs,
} from '../api/saavn'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from './LanguageContext'
import { addRecentlyPlayed } from '../services/recentlyPlayedService'
import { isOfflineError } from '../services/serviceUtils'
import { getDownload, updatePlaybackPosition } from '../utils/downloads'

const QUEUE_STORAGE_KEY = 'hearttune_queue_state'

function loadQueueState() {
  if (typeof window === 'undefined') return null
  try {
    const saved = localStorage.getItem(QUEUE_STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch (e) {
    console.warn('Failed to load queue state', e)
  }
  return null
}

interface PlayerContextType {
  currentSong: Song | null
  queue: Song[]
  queueIndex: number
  isPlaying: boolean
  volume: number
  shuffle: boolean
  repeat: 'off' | 'all' | 'one'
  playSong: (song: Song, queue?: Song[]) => void
  addToQueue: (song: Song) => boolean
  playQueueAt: (index: number) => void
  removeFromQueue: (index: number) => void
  togglePlay: () => void
  playNext: () => void
  playPrev: () => void
  seek: (time: number) => void
  setVolume: (v: number) => void
  toggleShuffle: () => void
  toggleRepeat: () => void
  moveInQueue: (fromIndex: number, toIndex: number) => void
  playSongNext: (song: Song) => void
  playSongLater: (song: Song) => void
  clearQueue: () => void
  reorderQueue: (newQueue: Song[]) => void
}

interface PlayerProgressContextType {
  progress: number
  duration: number
}

const PlayerContext = createContext<PlayerContextType | null>(null)
const PlayerProgressContext = createContext<PlayerProgressContextType | null>(null)


export function PlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { language } = useLanguage()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const preloadAudioRef = useRef<HTMLAudioElement | null>(null)
  
  const initialState = loadQueueState()
  const [currentSong, setCurrentSong] = useState<Song | null>(initialState?.currentSong || null)
  const [queue, setQueue] = useState<Song[]>(initialState?.queue || [])
  const [queueIndex, setQueueIndex] = useState(initialState?.queueIndex || 0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(initialState?.progress || 0)
  const [duration, setDuration] = useState(initialState?.currentSong?.duration || 0)
  const [volume, setVolumeState] = useState(0.8)
  const [shuffle, setShuffle] = useState(initialState?.shuffle || false)
  const [repeat, setRepeat] = useState<'off' | 'all' | 'one'>(initialState?.repeat || 'off')
  
  const blobUrlRef = useRef<string | null>(null)

  const queueRef = useRef(queue)
  const queueIndexRef = useRef(queueIndex)
  const shuffleRef = useRef(shuffle)
  const repeatRef = useRef(repeat)
  const languageRef = useRef(language)
  const currentSongRef = useRef<Song | null>(currentSong)
  const progressRef = useRef(progress)
  const isPlayingRef = useRef(isPlaying)
  
  // Refs for media session callbacks
  const togglePlayRef = useRef<() => void>(() => {})
  const playNextRef = useRef<() => void | Promise<void>>(() => {})
  const playPrevRef = useRef<() => void>(() => {})
  const seekRef = useRef<(t: number) => void>(() => {})
  
  const autoRecommendationLoadingRef = useRef(false)
  const isAdvancingRef = useRef(false)
  const retryCountRef = useRef(0)
  const restoreProgressRef = useRef(initialState?.progress || 0)

  // In-memory cache for resolved stream URLs
  // Map of songId -> { url: string, song: Song, expiresAt: number }
  const streamCacheRef = useRef<Map<string, { url: string; song: Song; expiresAt: number }>>(new Map())
  const CACHE_EXPIRY = 60 * 60 * 1000 // 1 hour

  // Sync state changes with refs
  useEffect(() => {
    queueRef.current = queue
    queueIndexRef.current = queueIndex
    shuffleRef.current = shuffle
    repeatRef.current = repeat
    languageRef.current = language
    currentSongRef.current = currentSong
    isPlayingRef.current = isPlaying

    try {
      if (queue.length > 0 || currentSong) {
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify({ 
          currentSong, queue, queueIndex, progress: progressRef.current, shuffle, repeat
        }))
      } else {
        localStorage.removeItem(QUEUE_STORAGE_KEY)
      }
    } catch (e) {
      console.warn('Failed to save queue state', e)
    }
  }, [currentSong, language, queue, queueIndex, repeat, shuffle, isPlaying])

  const updateDuration = useCallback((audio: HTMLAudioElement, song: Song | null) => {
    setDuration(getSongDuration(song, audio.duration))
  }, [])

  const updateMediaSession = useCallback((song: Song | null) => {
    if ('mediaSession' in navigator && song) {
      const artistName = song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist'
      const imageUrl = song.image?.find(i => i.quality === '500x500')?.url || song.image?.[0]?.url || ''
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.name,
        artist: artistName,
        album: song.album?.name || '',
        artwork: imageUrl ? [{ src: imageUrl, sizes: '500x500', type: 'image/jpeg' }] : []
      })
    }
  }, [])

  const getNextSongIndex = useCallback(() => {
    const q = queueRef.current
    const idx = queueIndexRef.current
    const sh = shuffleRef.current
    const rep = repeatRef.current

    if (!q.length) return -1

    if (sh && q.length > 1) {
      // Pick a random index that isn't the current one
      const candidates = q
        .map((_, index) => index)
        .filter((index) => index !== idx)
      return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : -1
    }

    let nextIdx = idx + 1
    if (nextIdx >= q.length) {
      if (rep === 'all') nextIdx = 0
      else return -1
    }
    return nextIdx
  }, [])

  // Proactively prefetch autoplay tracks before queue runs out
  const prefetchAutoplaySongs = useCallback(async () => {
    if (autoRecommendationLoadingRef.current) return
    
    // Only prefetch if we are at the end of the queue
    const q = queueRef.current
    const idx = queueIndexRef.current
    if (q.length > 0 && idx < q.length - 1) return

    autoRecommendationLoadingRef.current = true
    try {
      const activeSong = currentSongRef.current
      const activeLanguage = languageRef.current
      const excludedIds = new Set(q.map(s => s.id))
      if (activeSong) excludedIds.add(activeSong.id)

      let recommendations: Song[] = []

      // 1. Try related songs
      if (activeSong && activeSong.artists?.primary?.[0]?.name) {
        const artist = activeSong.artists.primary[0].name
        try {
          const related = await searchRelatedSongs(artist, 20)
          recommendations = filterFullSongs(related.results).filter(s => !excludedIds.has(s.id))
        } catch {}
      }

      // 2. Try trending in the same language as fallback
      if (!recommendations.length) {
        try {
          const { results } = await searchSongs(getHomeQuery(activeLanguage), 1, 30)
          recommendations = preferLanguageSongs(filterFullSongs(results), activeLanguage).filter(s => !excludedIds.has(s.id))
        } catch {}
      }

      if (recommendations.length > 0) {
        setQueue(prev => {
          const merged = [...prev]
          const existingIds = new Set(merged.map(s => s.id))
          const filteredRecs = recommendations.filter(s => !existingIds.has(s.id))
          const nextQueue = [...merged, ...filteredRecs]
          queueRef.current = nextQueue
          
          // Trigger preload of the first newly added song
          setTimeout(() => {
            void preloadNextTrack()
          }, 500)

          return nextQueue
        })
      }
    } catch (error) {
      console.warn('Unable to prefetch smart recommendations:', error)
    } finally {
      autoRecommendationLoadingRef.current = false
    }
  }, [])

  // Preloads the next track's URL and buffers it in the background
  const preloadNextTrack = useCallback(async () => {
    try {
      const nextIdx = getNextSongIndex()
      const q = queueRef.current
      
      if (nextIdx === -1 || nextIdx >= q.length) {
        // Near queue end, prefetch autoplay recommendations
        void prefetchAutoplaySongs()
        return
      }

      const nextSong = q[nextIdx]
      let src = ''

      // Check if already in cache
      const cached = streamCacheRef.current.get(nextSong.id)
      if (cached && cached.expiresAt > Date.now()) {
        src = cached.url
      } else {
        // Check if downloaded
        const download = await getDownload(nextSong.id)
        if (download) return // Loaded locally instantly, no network preloading needed
        
        const playable = await getPlayableAudioUrl(nextSong)
        src = playable.url
        streamCacheRef.current.set(nextSong.id, {
          url: playable.url,
          song: playable.song,
          expiresAt: Date.now() + CACHE_EXPIRY
        })
      }

      if (preloadAudioRef.current && src) {
        if (preloadAudioRef.current.src !== src) {
          preloadAudioRef.current.src = src
          preloadAudioRef.current.load()
        }
      }
    } catch {
      // Silent catch for background prefetch failure
    }
  }, [getNextSongIndex, prefetchAutoplaySongs])

  const loadAndPlay = useCallback(async (song: Song, forceResumeProgress = false) => {
    const audio = audioRef.current
    if (!audio) return false

    try {
      // Pause current playback instantly
      audio.pause()
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }

      if (!forceResumeProgress) {
        setProgress(0)
        progressRef.current = 0
      }

      // Optimistic state updates for instant UI response
      setCurrentSong(song)
      currentSongRef.current = song
      setDuration(song.duration || 0)
      updateMediaSession(song)
      setIsPlaying(true)

      let src = ''
      let resolvedSong = song

      // 1. Resolve local downloads first (instant, works offline)
      const download = await getDownload(song.id)
      if (download) {
        blobUrlRef.current = URL.createObjectURL(download.blob)
        src = blobUrlRef.current
        resolvedSong = download.song
      } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('Song not downloaded and device is offline')
      } else {
        // 2. Resolve from memory cache
        const cached = streamCacheRef.current.get(song.id)
        if (cached && cached.expiresAt > Date.now()) {
          src = cached.url
          resolvedSong = cached.song
        } else {
          // 3. Fallback to JioSaavn API network lookup
          const playable = await getPlayableAudioUrl(song)
          resolvedSong = playable.song
          src = playable.url
          streamCacheRef.current.set(song.id, {
            url: playable.url,
            song: playable.song,
            expiresAt: Date.now() + CACHE_EXPIRY
          })
        }
      }

      // Safety check: ensure track hasn't been skipped while resolving
      if (currentSongRef.current?.id !== song.id) {
        return false
      }

      setCurrentSong(resolvedSong)
      currentSongRef.current = resolvedSong
      setDuration(resolvedSong.duration || 0)
      updateMediaSession(resolvedSong)

      if (audio.src !== src) {
        audio.src = src
      }

      // Restore position if we loaded from cache
      if (forceResumeProgress && restoreProgressRef.current > 0) {
        audio.currentTime = restoreProgressRef.current
        restoreProgressRef.current = 0
      }

      await audio.play()
      setIsPlaying(true)
      updateDuration(audio, resolvedSong)
      retryCountRef.current = 0 // Reset retries

      // Trigger background preloading for the next track after playback begins
      setTimeout(() => {
        void preloadNextTrack()
      }, 1500)

      if (user) {
        void addRecentlyPlayed(user.id, resolvedSong).catch((error) => {
          if (!isOfflineError(error)) {
            console.warn('Unable to store recently played song:', error)
          }
        })
      }
      return true
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.warn('Unable to play song:', error)
        
        // Retry logic: up to 2 attempts for transient stream load failures
        if (retryCountRef.current < 2) {
          retryCountRef.current += 1
          console.log(`Retrying stream load (attempt ${retryCountRef.current})...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
          return loadAndPlay(song, forceResumeProgress)
        }
      }

      setIsPlaying(false)
      retryCountRef.current = 0

      // Skip broken tracks automatically
      if (error.name !== 'AbortError') {
        console.log('Skipping broken/unavailable track...')
        setTimeout(() => {
          void playNextRef.current?.()
        }, 500)
      }
      return false
    }
  }, [updateDuration, updateMediaSession, user, preloadNextTrack])

  const playSmartAutoplay = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsPlaying(false)
      return false
    }
    if (autoRecommendationLoadingRef.current) return false
    autoRecommendationLoadingRef.current = true

    try {
      const activeSong = currentSongRef.current
      const activeLanguage = languageRef.current
      const excludedIds = new Set(queueRef.current.map(s => s.id))
      if (activeSong) excludedIds.add(activeSong.id)

      let recommendations: Song[] = []

      // 1. Try related songs
      if (activeSong && activeSong.artists?.primary?.[0]?.name) {
        const artist = activeSong.artists.primary[0].name
        try {
          const related = await searchRelatedSongs(artist, 20)
          recommendations = filterFullSongs(related.results).filter(s => !excludedIds.has(s.id))
        } catch {}
      }

      // 2. Try trending in current language
      if (!recommendations.length) {
        try {
          const { results } = await searchSongs(getHomeQuery(activeLanguage), 1, 30)
          recommendations = preferLanguageSongs(filterFullSongs(results), activeLanguage).filter(s => !excludedIds.has(s.id))
        } catch {}
      }

      if (!recommendations.length) {
        setIsPlaying(false)
        return false
      }

      setQueue(recommendations)
      queueRef.current = recommendations

      for (let index = 0; index < recommendations.length; index += 1) {
        setQueueIndex(index)
        queueIndexRef.current = index
        const played = await loadAndPlay(recommendations[index])
        if (played) return true
      }

      setIsPlaying(false)
      return false
    } catch (error) {
      console.warn('Unable to autoplay smart recommendation:', error)
      setIsPlaying(false)
      return false
    } finally {
      autoRecommendationLoadingRef.current = false
    }
  }, [loadAndPlay])

  const playNextInternal = useCallback(async () => {
    if (isAdvancingRef.current) return
    isAdvancingRef.current = true
    
    const q = queueRef.current
    const idx = queueIndexRef.current
    const sh = shuffleRef.current
    const rep = repeatRef.current

    try {
      if (!q.length) {
        await playSmartAutoplay()
        return
      }

      const attemptedIndexes = new Set<number>()
      let nextIdx = idx

      while (attemptedIndexes.size < q.length) {
        if (sh && q.length > 1) {
          const candidates = q
            .map((_, index) => index)
            .filter((index) => index !== idx && !attemptedIndexes.has(index))

          if (!candidates.length) break
          nextIdx = candidates[Math.floor(Math.random() * candidates.length)]
        } else {
          nextIdx += 1

          if (nextIdx >= q.length) {
            if (rep === 'all') nextIdx = 0
            else break
          }

          if (attemptedIndexes.has(nextIdx)) break
        }

        attemptedIndexes.add(nextIdx)
        setQueueIndex(nextIdx)
        queueIndexRef.current = nextIdx

        // Check if offline, skip undownloaded songs
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const downloaded = await getDownload(q[nextIdx].id)
          if (!downloaded) {
            continue
          }
        }

        const played = await loadAndPlay(q[nextIdx])
        if (played) return
      }

      // Queue exhausted (and autoplay recommendations not pre-fetched or failed)
      await playSmartAutoplay()
    } finally {
      isAdvancingRef.current = false
    }
  }, [loadAndPlay, playSmartAutoplay])

  // Callbacks
  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!currentSong) return
    
    if (!audio.paused) {
      audio.pause()
    } else {
      if (!audio.src || audio.src === window.location.href) {
        void loadAndPlay(currentSong, true)
      } else {
        void audio.play().catch(() => {})
      }
    }
  }, [currentSong, loadAndPlay])

  const playPrev = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    const q = queueRef.current
    const idx = queueIndexRef.current
    if (!q.length) return
    let prevIdx = idx - 1
    if (prevIdx < 0) prevIdx = repeatRef.current === 'all' ? q.length - 1 : 0
    setQueueIndex(prevIdx)
    void loadAndPlay(q[prevIdx])
  }, [loadAndPlay])

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setProgress(time)
      progressRef.current = time
      
      // Update media session position
      if ('mediaSession' in navigator && navigator.mediaSession.setPositionState && Number.isFinite(audioRef.current.duration)) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audioRef.current.duration,
            playbackRate: audioRef.current.playbackRate,
            position: time
          })
        } catch {}
      }
    }
  }, [])

  // Assign functions to stable refs for Media Session handlers
  useEffect(() => {
    togglePlayRef.current = togglePlay
    playPrevRef.current = playPrev
    seekRef.current = seek
    playNextRef.current = playNextInternal
  }, [togglePlay, playPrev, seek, playNextInternal])

  // Media Session Setup (mounted once)
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => togglePlayRef.current())
      navigator.mediaSession.setActionHandler('pause', () => togglePlayRef.current())
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrevRef.current())
      navigator.mediaSession.setActionHandler('nexttrack', () => { playNextRef.current?.() })
      navigator.mediaSession.setActionHandler('seekto', (details) => { if (details.seekTime !== undefined) seekRef.current(details.seekTime) })
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10
        const audio = audioRef.current
        if (audio) seekRef.current(Math.max(0, audio.currentTime - offset))
      })
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10
        const audio = audioRef.current
        if (audio) seekRef.current(Math.min(audio.duration || Infinity, audio.currentTime + offset))
      })
    }
    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null)
        navigator.mediaSession.setActionHandler('pause', null)
        navigator.mediaSession.setActionHandler('previoustrack', null)
        navigator.mediaSession.setActionHandler('nexttrack', null)
        navigator.mediaSession.setActionHandler('seekto', null)
        navigator.mediaSession.setActionHandler('seekbackward', null)
        navigator.mediaSession.setActionHandler('seekforward', null)
      }
    }
  }, [])

  // Persistent reference-stable event listeners on audio element
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onPlayEvent = () => {
      setIsPlaying(true)
      isPlayingRef.current = true
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing'
      }
    }

    const onPauseEvent = () => {
      setIsPlaying(false)
      isPlayingRef.current = false
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused'
      }
    }

    let lastSavedTime = 0
    const onTime = () => {
      setProgress(audio.currentTime)
      progressRef.current = audio.currentTime

      const now = audio.currentTime
      if (Math.abs(now - lastSavedTime) > 3) {
        lastSavedTime = now
        try {
          if (queueRef.current.length > 0 || currentSongRef.current) {
            localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify({ 
              currentSong: currentSongRef.current, 
              queue: queueRef.current, 
              queueIndex: queueIndexRef.current, 
              progress: now, 
              shuffle: shuffleRef.current, 
              repeat: repeatRef.current
            }))
          }
        } catch {}

        if (currentSongRef.current) {
          void updatePlaybackPosition(currentSongRef.current.id, now)
        }
      }
    }
    
    const onDuration = () => {
       if (audio && currentSongRef.current) {
         setDuration(getSongDuration(currentSongRef.current, audio.duration))
         if ('mediaSession' in navigator && navigator.mediaSession.setPositionState && Number.isFinite(audio.duration) && audio.duration > 0) {
           try {
             navigator.mediaSession.setPositionState({
               duration: audio.duration,
               playbackRate: audio.playbackRate,
               position: audio.currentTime
             })
           } catch {}
         }
       }
    }
    
    const onEnd = () => {
      console.log('Audio finished, moving to next track.')
      const rep = repeatRef.current
      if (rep === 'one' && currentSongRef.current) {
        if (audio) {
          audio.currentTime = 0
          void audio.play().catch(() => {})
        }
      } else {
        void playNextRef.current()
      }
    }
    
    const onError = () => {
      console.error('Audio element error encountered.')
      void playNextRef.current()
    }

    const onOffline = () => {
      if (isPlayingRef.current) {
        audio.pause()
        setIsPlaying(false)
        isPlayingRef.current = false
      }
    }

    // Restore progress on first boot if present
    if (restoreProgressRef.current > 0 && audio.currentTime === 0 && !audio.src) {
      setProgress(restoreProgressRef.current)
    }

    audio.addEventListener('play', onPlayEvent)
    audio.addEventListener('pause', onPauseEvent)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onDuration)
    audio.addEventListener('durationchange', onDuration)
    audio.addEventListener('ended', onEnd)
    audio.addEventListener('error', onError)
    window.addEventListener('offline', onOffline)

    return () => {
      audio.removeEventListener('play', onPlayEvent)
      audio.removeEventListener('pause', onPauseEvent)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onDuration)
      audio.removeEventListener('durationchange', onDuration)
      audio.removeEventListener('ended', onEnd)
      audio.removeEventListener('error', onError)
      window.removeEventListener('offline', onOffline)
      audio.pause()
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [])

  // Volume synchronization
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const playSong = useCallback((song: Song, newQueue?: Song[]) => {
    const q = newQueue || [song]
    const idx = q.findIndex((s) => s.id === song.id)
    setQueue(q)
    setQueueIndex(idx >= 0 ? idx : 0)
    void loadAndPlay(song)
  }, [loadAndPlay])

  const addToQueue = useCallback((song: Song) => {
    const activeSong = currentSongRef.current
    const activeQueue = queueRef.current

    if (!activeSong) {
      setQueue([song])
      setQueueIndex(0)
      void loadAndPlay(song)
      return true
    }

    const baseQueue = activeQueue.length ? activeQueue : [activeSong]
    const alreadyQueued = baseQueue.some((queuedSong) => queuedSong.id === song.id)

    if (alreadyQueued) {
      return false
    }

    const nextQueue = [...baseQueue, song]
    setQueue(nextQueue)
    queueRef.current = nextQueue
    
    // Proactively preload the added song if it is next
    setTimeout(() => {
      void preloadNextTrack()
    }, 500)

    return true
  }, [loadAndPlay, preloadNextTrack])

  const playQueueAt = useCallback((index: number) => {
    const activeQueue = queueRef.current
    if (index < 0 || index >= activeQueue.length) return

    setQueueIndex(index)
    void loadAndPlay(activeQueue[index])
  }, [loadAndPlay])

  const removeFromQueue = useCallback((index: number) => {
    const activeQueue = queueRef.current
    const activeIndex = queueIndexRef.current

    if (index < 0 || index >= activeQueue.length || activeQueue.length <= 1) return

    const nextQueue = activeQueue.filter((_, songIndex) => songIndex !== index)
    setQueue(nextQueue)
    queueRef.current = nextQueue

    if (index < activeIndex) {
      setQueueIndex(activeIndex - 1)
      return
    }

    if (index === activeIndex) {
      const replacementIndex = Math.min(activeIndex, nextQueue.length - 1)
      setQueueIndex(replacementIndex)
      void loadAndPlay(nextQueue[replacementIndex])
    }
  }, [loadAndPlay])

  const setVolume = useCallback((v: number) => {
    setVolumeState(v)
    if (audioRef.current) audioRef.current.volume = v
  }, [])

  const toggleShuffle = useCallback(() => setShuffle((s: boolean) => !s), [])
  const toggleRepeat = useCallback(() => setRepeat((r: 'off' | 'all' | 'one') => {
    if (r === 'off') return 'all'
    if (r === 'all') return 'one'
    return 'off'
  }), [])

  const moveInQueue = useCallback((fromIndex: number, toIndex: number) => {
    setQueue((prevQueue) => {
      const nextQueue = [...prevQueue]
      const [movedItem] = nextQueue.splice(fromIndex, 1)
      nextQueue.splice(toIndex, 0, movedItem)
      queueRef.current = nextQueue
      return nextQueue
    })
    setQueueIndex((prevIndex: number) => {
      if (fromIndex === prevIndex) return toIndex
      if (fromIndex < prevIndex && toIndex >= prevIndex) return prevIndex - 1
      if (fromIndex > prevIndex && toIndex <= prevIndex) return prevIndex + 1
      return prevIndex
    })
  }, [])

  const playSongNext = useCallback((song: Song) => {
    setQueue((prevQueue) => {
      if (prevQueue.length === 0) return [song]
      const nextQueue = [...prevQueue]
      nextQueue.splice(queueIndex + 1, 0, song)
      queueRef.current = nextQueue
      
      // Proactively preload this newly scheduled track
      setTimeout(() => {
        void preloadNextTrack()
      }, 500)

      return nextQueue
    })
  }, [queueIndex, preloadNextTrack])

  const playSongLater = useCallback((song: Song) => {
    setQueue((prevQueue) => {
      if (prevQueue.length === 0) return [song]
      const nextQueue = [...prevQueue, song]
      queueRef.current = nextQueue
      return nextQueue
    })
  }, [])

  const clearQueue = useCallback(() => {
    setQueue((prevQueue) => {
      if (prevQueue.length === 0) return []
      const nextQueue = [prevQueue[queueIndex]]
      queueRef.current = nextQueue
      return nextQueue
    })
    setQueueIndex(0)
  }, [queueIndex])

  const reorderQueue = useCallback((newQueue: Song[]) => {
    setQueue(newQueue)
    queueRef.current = newQueue
    const currentId = currentSongRef.current?.id
    if (currentId) {
      const newIndex = newQueue.findIndex((s) => s.id === currentId)
      if (newIndex !== -1 && newIndex !== queueIndexRef.current) {
        setQueueIndex(newIndex)
      }
    }
  }, [])

  const memoizedValue = useMemo(() => ({
    currentSong,
    queue,
    queueIndex,
    isPlaying,
    volume,
    shuffle,
    repeat,
    playSong,
    addToQueue,
    playQueueAt,
    removeFromQueue,
    togglePlay,
    playNext: () => playNextRef.current?.(),
    playPrev,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    moveInQueue,
    playSongNext,
    playSongLater,
    clearQueue,
    reorderQueue,
  }), [
    currentSong, queue, queueIndex, isPlaying, volume, shuffle, repeat,
    playSong, addToQueue, playQueueAt, removeFromQueue, togglePlay, playPrev, seek, setVolume,
    toggleShuffle, toggleRepeat, moveInQueue, playSongNext, playSongLater, clearQueue, reorderQueue
  ])

  const progressValue = useMemo(() => ({
    progress,
    duration,
  }), [progress, duration])

  return (
    <PlayerContext.Provider value={memoizedValue}>
      <PlayerProgressContext.Provider value={progressValue}>
        {children}
        {/* 
          Mount the audio element permanently in the DOM. 
          This is absolutely critical for iOS Safari background playback and Media Session API.
        */}
        <audio ref={audioRef} preload="auto" />
        {/* Permanent DOM-mounted secondary preloader helper */}
        <audio ref={preloadAudioRef} preload="auto" muted style={{ display: 'none' }} />
      </PlayerProgressContext.Provider>
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider')
  return ctx
}

export function usePlayerProgress() {
  const ctx = useContext(PlayerProgressContext)
  if (!ctx) throw new Error('usePlayerProgress must be used within PlayerProvider')
  return ctx
}
