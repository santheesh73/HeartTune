import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
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
} from '../api/saavn'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from './LanguageContext'
import { addRecentlyPlayed } from '../services/recentlyPlayedService'
import { isOfflineError } from '../services/serviceUtils'
import { getDownload } from '../utils/downloads'

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
}

const PlayerContext = createContext<PlayerContextType | null>(null)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { language } = useLanguage()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [queue, setQueue] = useState<Song[]>([])
  const [queueIndex, setQueueIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.8)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState<'off' | 'all'>('off')
  const blobUrlRef = useRef<string | null>(null)

  const queueRef = useRef(queue)
  const queueIndexRef = useRef(queueIndex)
  const shuffleRef = useRef(shuffle)
  const repeatRef = useRef(repeat)
  const languageRef = useRef(language)
  const currentSongRef = useRef<Song | null>(null)
  const playNextRef = useRef<() => void | Promise<void>>(() => {})
  const autoRecommendationLoadingRef = useRef(false)
  const isAdvancingRef = useRef(false)

  const updateDuration = useCallback((audio: HTMLAudioElement, song: Song | null) => {
    setDuration(getSongDuration(song, audio.duration))
  }, [])

  const loadAndPlay = useCallback(async (song: Song) => {
    const audio = audioRef.current
    if (!audio) return false

    try {
      audio.pause()
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }

      setProgress(0)

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

      audio.src = src
      audio.load()

      await audio.play()
      setIsPlaying(true)
      updateDuration(audio, resolvedSong)

      if (user) {
        void addRecentlyPlayed(user.id, resolvedSong).catch((error) => {
          if (!isOfflineError(error)) {
            console.error('Unable to store recently played song:', error)
          }
        })
      }
      return true
    } catch (error) {
      console.error('Unable to play song:', error)
      setIsPlaying(false)
      return false
    }
  }, [updateDuration, user])

  const playLanguageRecommendation = useCallback(async () => {
    if (autoRecommendationLoadingRef.current) return false

    autoRecommendationLoadingRef.current = true

    try {
      const activeSong = currentSongRef.current
      const activeQueue = queueRef.current
      const activeLanguage = languageRef.current
      const excludedIds = new Set(activeQueue.map((song) => song.id))
      if (activeSong) excludedIds.add(activeSong.id)

      const { results } = await searchSongs(getHomeQuery(activeLanguage), 1, 30)
      const recommendations = preferLanguageSongs(filterFullSongs(results), activeLanguage).filter(
        (song) => !excludedIds.has(song.id)
      )

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
      console.error('Unable to autoplay a language recommendation:', error)
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
        await playLanguageRecommendation()
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

      await playLanguageRecommendation()
    } finally {
      isAdvancingRef.current = false
    }
  }, [loadAndPlay, playLanguageRecommendation])

  useEffect(() => {
    queueRef.current = queue
    queueIndexRef.current = queueIndex
    shuffleRef.current = shuffle
    repeatRef.current = repeat
    languageRef.current = language
    currentSongRef.current = currentSong
    playNextRef.current = playNextInternal
  }, [currentSong, language, playNextInternal, queue, queueIndex, repeat, shuffle])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'auto'
    audioRef.current = audio
    audio.volume = 0.8

    const onTime = () => {
      setProgress(audio.currentTime)
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
    const onDuration = () => updateDuration(audio, currentSongRef.current)
    const onEnd = () => {
      void playNextRef.current()
    }
    const onError = () => {
      if (currentSongRef.current) void playNextRef.current()
    }

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onDuration)
    audio.addEventListener('durationchange', onDuration)
    audio.addEventListener('ended', onEnd)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onDuration)
      audio.removeEventListener('durationchange', onDuration)
      audio.removeEventListener('ended', onEnd)
      audio.removeEventListener('error', onError)
      audio.pause()
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [updateDuration])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const playSong = (song: Song, newQueue?: Song[]) => {
    const q = newQueue || [song]
    const idx = q.findIndex((s) => s.id === song.id)
    setQueue(q)
    setQueueIndex(idx >= 0 ? idx : 0)
    void loadAndPlay(song)
  }

  const addToQueue = (song: Song) => {
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
  }

  const playQueueAt = (index: number) => {
    const activeQueue = queueRef.current
    if (index < 0 || index >= activeQueue.length) return

    setQueueIndex(index)
    void loadAndPlay(activeQueue[index])
  }

  const removeFromQueue = (index: number) => {
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
  }

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (!currentSong) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      void audio.play().then(() => {
        setIsPlaying(true)
      }).catch(() => {
        setIsPlaying(false)
      })
    }
  }

  const playNext = () => playNextInternal()

  const playPrev = () => {
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
  }

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setProgress(time)
    }
  }

  const setVolume = (v: number) => {
    setVolumeState(v)
    if (audioRef.current) audioRef.current.volume = v
  }

  const toggleShuffle = () => setShuffle((s) => !s)
  const toggleRepeat = () => setRepeat((r) => (r === 'off' ? 'all' : 'off'))

  return (
    <PlayerContext.Provider
      value={{
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
        playNext,
        playPrev,
        seek,
        setVolume,
        toggleShuffle,
        toggleRepeat,
      }}
    >
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider')
  return ctx
}
