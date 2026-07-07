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
import { getDownload } from '../utils/downloads'

const QUEUE_STORAGE_KEY = 'hearttune_queue_state'

function loadQueueState() {
  if (typeof window === 'undefined') return null
  try {
    const saved = localStorage.getItem(QUEUE_STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch (e) {
    console.error('Failed to load queue state', e)
  }
  return null
}

interface PlayerContextType {
  currentSong: Song | null
  queue: Song[]
  queueIndex: number
  isPlaying: boolean
  progress: number
  duration: number
  volume: number
  shuffle: boolean
  repeat: 'off' | 'all'
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

const PlayerContext = createContext<PlayerContextType | null>(null)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { language } = useLanguage()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  const initialState = loadQueueState()
  const [currentSong, setCurrentSong] = useState<Song | null>(initialState?.currentSong || null)
  const [queue, setQueue] = useState<Song[]>(initialState?.queue || [])
  const [queueIndex, setQueueIndex] = useState(initialState?.queueIndex || 0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(initialState?.progress || 0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.8)
  const [shuffle, setShuffle] = useState(initialState?.shuffle || false)
  const [repeat, setRepeat] = useState<'off' | 'all'>(initialState?.repeat || 'off')
  
  const blobUrlRef = useRef<string | null>(null)

  const queueRef = useRef(queue)
  const queueIndexRef = useRef(queueIndex)
  const shuffleRef = useRef(shuffle)
  const repeatRef = useRef(repeat)
  const languageRef = useRef(language)
  const currentSongRef = useRef<Song | null>(currentSong)
  const progressRef = useRef(progress)
  
  // Refs for media session callbacks
  const togglePlayRef = useRef<() => void>(() => {})
  const playNextRef = useRef<() => void | Promise<void>>(() => {})
  const playPrevRef = useRef<() => void>(() => {})
  const seekRef = useRef<(t: number) => void>(() => {})
  
  const autoRecommendationLoadingRef = useRef(false)
  const isAdvancingRef = useRef(false)
  const retryCountRef = useRef(0)
  const restoreProgressRef = useRef(initialState?.progress || 0)

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

  const loadAndPlay = useCallback(async (song: Song, forceResumeProgress = false) => {
    const audio = audioRef.current
    if (!audio) return false

    try {
      audio.pause()
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }

      if (!forceResumeProgress) {
        setProgress(0)
        progressRef.current = 0
      }

      const download = await getDownload(song.id)
      let src: string
      let resolvedSong: Song

      if (download) {
        blobUrlRef.current = URL.createObjectURL(download.blob)
        src = blobUrlRef.current
        resolvedSong = download.song
      } else {
        const playable = await getPlayableAudioUrl(song)
        resolvedSong = playable.song
        src = playable.url
      }

      setCurrentSong(resolvedSong)
      currentSongRef.current = resolvedSong
      setDuration(resolvedSong.duration || 0)
      updateMediaSession(resolvedSong)

      audio.src = src
      audio.load()

      // Restore position if we loaded from cache
      if (forceResumeProgress && restoreProgressRef.current > 0) {
        audio.currentTime = restoreProgressRef.current
        restoreProgressRef.current = 0
      }

      await audio.play()
      setIsPlaying(true)
      updateDuration(audio, resolvedSong)
      retryCountRef.current = 0 // Reset retry on success

      // Background Preload Next Song Metadata
      setTimeout(async () => {
        try {
          const nextIdx = queueIndexRef.current + 1
          const q = queueRef.current
          if (nextIdx < q.length) {
             // Fetch URL early so it's in the browser network cache
             await getPlayableAudioUrl(q[nextIdx])
          }
        } catch { } // Silent fail for prefetch
      }, 5000)

      if (user) {
        void addRecentlyPlayed(user.id, resolvedSong).catch((error) => {
          if (!isOfflineError(error)) {
            console.error('Unable to store recently played song:', error)
          }
        })
      }
      return true
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Unable to play song:', error)
        
        // Error Recovery: Retry once before skipping
        if (retryCountRef.current < 1) {
          retryCountRef.current += 1
          console.log('Retrying stream...')
          return loadAndPlay(song, forceResumeProgress)
        }
      }
      setIsPlaying(false)
      retryCountRef.current = 0
      return false
    }
  }, [updateDuration, updateMediaSession, user])

  const playSmartAutoplay = useCallback(async () => {
    if (autoRecommendationLoadingRef.current) return false
    autoRecommendationLoadingRef.current = true

    try {
      const activeSong = currentSongRef.current
      const activeLanguage = languageRef.current
      const excludedIds = new Set(queueRef.current.map(s => s.id))
      if (activeSong) excludedIds.add(activeSong.id)

      let recommendations: Song[] = []

      // 1. Try related songs to the current artist
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
      console.error('Unable to autoplay smart recommendation:', error)
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

        const played = await loadAndPlay(q[nextIdx])
        if (played) return
      }

      // Queue exhausted
      await playSmartAutoplay()
    } finally {
      isAdvancingRef.current = false
    }
  }, [loadAndPlay, playSmartAutoplay])

  // Setup callbacks
  useEffect(() => {
    queueRef.current = queue
    queueIndexRef.current = queueIndex
    shuffleRef.current = shuffle
    repeatRef.current = repeat
    languageRef.current = language
    currentSongRef.current = currentSong
    playNextRef.current = playNextInternal

    try {
      if (queue.length > 0 || currentSong) {
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify({ 
          currentSong, queue, queueIndex, progress: progressRef.current, shuffle, repeat
        }))
      } else {
        localStorage.removeItem(QUEUE_STORAGE_KEY)
      }
    } catch (e) {
      console.error('Failed to save queue state', e)
    }
  }, [currentSong, language, playNextInternal, queue, queueIndex, repeat, shuffle])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!currentSong) return
    
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      if (!audio.src || audio.src === window.location.href) {
        void loadAndPlay(currentSong, true)
      } else {
        void audio.play().then(() => {
          setIsPlaying(true)
        }).catch(() => {
          setIsPlaying(false)
        })
      }
    }
  }, [currentSong, isPlaying, loadAndPlay])

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
    }
  }, [])

  useEffect(() => {
    togglePlayRef.current = togglePlay
    playPrevRef.current = playPrev
    seekRef.current = seek
  }, [togglePlay, playPrev, seek])

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => togglePlayRef.current())
      navigator.mediaSession.setActionHandler('pause', () => togglePlayRef.current())
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrevRef.current())
      navigator.mediaSession.setActionHandler('nexttrack', () => { playNextRef.current?.() })
      navigator.mediaSession.setActionHandler('seekto', (details) => { if (details.seekTime !== undefined) seekRef.current(details.seekTime) })
    }
    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null)
        navigator.mediaSession.setActionHandler('pause', null)
        navigator.mediaSession.setActionHandler('previoustrack', null)
        navigator.mediaSession.setActionHandler('nexttrack', null)
        navigator.mediaSession.setActionHandler('seekto', null)
      }
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTime = () => {
      setProgress(audio.currentTime)
      progressRef.current = audio.currentTime
      if (
        currentSongRef.current &&
        Number.isFinite(audio.duration) &&
        audio.duration > 0 &&
        audio.currentTime > 0 &&
        audio.duration - audio.currentTime <= 0.2
      ) {
        void playNextRef.current()
      }
    }
    
    const onDuration = () => {
       updateDuration(audio, currentSongRef.current)
       // Update media session position state
       if ('mediaSession' in navigator && navigator.mediaSession.setPositionState && Number.isFinite(audio.duration)) {
         try {
           navigator.mediaSession.setPositionState({
             duration: audio.duration,
             playbackRate: audio.playbackRate,
             position: audio.currentTime
           })
         } catch {}
       }
    }
    
    const onEnd = () => {
      void playNextRef.current()
    }
    
    const onError = () => {
      if (currentSongRef.current) void playNextRef.current()
    }

    // Attempt to restore progress if initialized with saved state but paused
    if (restoreProgressRef.current > 0 && audio.currentTime === 0 && !audio.src) {
      setProgress(restoreProgressRef.current)
    }

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onDuration)
    audio.addEventListener('durationchange', onDuration)
    audio.addEventListener('ended', onEnd)
    audio.addEventListener('error', onError)

    // Interruption Handling
    const onOffline = () => {
      if (isPlaying) {
        audio.pause()
        setIsPlaying(false)
      }
    }
    const onOnline = () => {
      // Could auto-resume, but user gesture might be required on some devices
    }
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)

    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onDuration)
      audio.removeEventListener('durationchange', onDuration)
      audio.removeEventListener('ended', onEnd)
      audio.removeEventListener('error', onError)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
      audio.pause()
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [updateDuration, isPlaying])

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

    setQueue([...baseQueue, song])
    return true
  }, [loadAndPlay])

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
  const toggleRepeat = useCallback(() => setRepeat((r: 'off' | 'all') => (r === 'off' ? 'all' : 'off')), [])

  const moveInQueue = useCallback((fromIndex: number, toIndex: number) => {
    setQueue((prevQueue) => {
      const nextQueue = [...prevQueue]
      const [movedItem] = nextQueue.splice(fromIndex, 1)
      nextQueue.splice(toIndex, 0, movedItem)
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
      return nextQueue
    })
  }, [queueIndex])

  const playSongLater = useCallback((song: Song) => {
    setQueue((prevQueue) => {
      if (prevQueue.length === 0) return [song]
      return [...prevQueue, song]
    })
  }, [])

  const clearQueue = useCallback(() => {
    setQueue((prevQueue) => {
      if (prevQueue.length === 0) return []
      return [prevQueue[queueIndex]]
    })
    setQueueIndex(0)
  }, [queueIndex])

  const reorderQueue = useCallback((newQueue: Song[]) => {
    setQueue(newQueue)
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
    progress,
    duration,
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
    currentSong, queue, queueIndex, isPlaying, progress, duration, volume, shuffle, repeat,
    playSong, addToQueue, playQueueAt, removeFromQueue, togglePlay, playPrev, seek, setVolume,
    toggleShuffle, toggleRepeat, moveInQueue, playSongNext, playSongLater, clearQueue, reorderQueue
  ])

  return (
    <PlayerContext.Provider value={memoizedValue}>
      {children}
      {/* 
        Mount the audio element permanently in the DOM. 
        This is absolutely critical for iOS Safari background playback and Media Session API.
      */}
      <audio ref={audioRef} preload="auto" />
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider')
  return ctx
}
