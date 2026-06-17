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
import { getPlayableAudioUrl, getSongDuration } from '../api/saavn'
import { useAuth } from '../hooks/useAuth'
import { addRecentlyPlayed } from '../services/recentlyPlayedService'
import { getDownload } from '../utils/downloads'

interface PlayerContextType {
  currentSong: Song | null
  queue: Song[]
  isPlaying: boolean
  progress: number
  duration: number
  volume: number
  shuffle: boolean
  repeat: 'off' | 'all'
  playSong: (song: Song, queue?: Song[]) => void
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
  const currentSongRef = useRef<Song | null>(null)
  const playNextRef = useRef<() => void>(() => {})

  const updateDuration = useCallback((audio: HTMLAudioElement, song: Song | null) => {
    setDuration(getSongDuration(song, audio.duration))
  }, [])

  const loadAndPlay = useCallback(async (song: Song) => {
    const audio = audioRef.current
    if (!audio) return

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
    setDuration(resolvedSong.duration || 0)

    audio.src = src
    audio.load()

    try {
      await audio.play()
      setIsPlaying(true)
      updateDuration(audio, resolvedSong)

      if (user) {
        void addRecentlyPlayed(user.id, resolvedSong)
      }
    } catch {
      setIsPlaying(false)
    }
  }, [updateDuration, user])

  const playNextInternal = useCallback(() => {
    const q = queueRef.current
    const idx = queueIndexRef.current
    const sh = shuffleRef.current
    const rep = repeatRef.current

    if (!q.length) {
      setIsPlaying(false)
      return
    }
    let nextIdx = idx + 1
    if (sh) {
      if (q.length === 1) {
        setIsPlaying(false)
        return
      }

      do {
        nextIdx = Math.floor(Math.random() * q.length)
      } while (nextIdx === idx)
    } else if (nextIdx >= q.length) {
      if (rep === 'all') nextIdx = 0
      else {
        setIsPlaying(false)
        return
      }
    }
    setQueueIndex(nextIdx)
    void loadAndPlay(q[nextIdx])
  }, [loadAndPlay])

  useEffect(() => {
    queueRef.current = queue
    queueIndexRef.current = queueIndex
    shuffleRef.current = shuffle
    repeatRef.current = repeat
    currentSongRef.current = currentSong
    playNextRef.current = playNextInternal
  }, [currentSong, playNextInternal, queue, queueIndex, repeat, shuffle])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'auto'
    audioRef.current = audio
    audio.volume = 0.8

    const onTime = () => setProgress(audio.currentTime)
    const onDuration = () => updateDuration(audio, currentSongRef.current)
    const onEnd = () => {
      playNextRef.current()
    }

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onDuration)
    audio.addEventListener('durationchange', onDuration)
    audio.addEventListener('ended', onEnd)

    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onDuration)
      audio.removeEventListener('durationchange', onDuration)
      audio.removeEventListener('ended', onEnd)
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
        isPlaying,
        progress,
        duration,
        volume,
        shuffle,
        repeat,
        playSong,
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
