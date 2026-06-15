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
import { getDownload } from '../utils/downloads'

interface PlayerContextType {
  currentSong: Song | null
  queue: Song[]
  isPlaying: boolean
  progress: number
  duration: number
  volume: number
  shuffle: boolean
  repeat: 'off' | 'all' | 'one'
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
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [queue, setQueue] = useState<Song[]>([])
  const [queueIndex, setQueueIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.8)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState<'off' | 'all' | 'one'>('off')
  const blobUrlRef = useRef<string | null>(null)

  const queueRef = useRef(queue)
  const queueIndexRef = useRef(queueIndex)
  const shuffleRef = useRef(shuffle)
  const repeatRef = useRef(repeat)
  const currentSongRef = useRef<Song | null>(null)
  const playNextRef = useRef<() => void>(() => {})

  queueRef.current = queue
  queueIndexRef.current = queueIndex
  shuffleRef.current = shuffle
  repeatRef.current = repeat
  currentSongRef.current = currentSong

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
    let playableSong = song

    if (download) {
      blobUrlRef.current = URL.createObjectURL(download.blob)
      src = blobUrlRef.current
      playableSong = download.song
    } else {
      const playable = await getPlayableAudioUrl(song)
      playableSong = playable.song
      src = playable.url
    }

    setCurrentSong(playableSong)
    setDuration(playableSong.duration || 0)

    audio.src = src
    audio.load()

    try {
      await audio.play()
      setIsPlaying(true)
      updateDuration(audio, playableSong)
    } catch {
      setIsPlaying(false)
    }
  }, [updateDuration])

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
      nextIdx = Math.floor(Math.random() * q.length)
    } else if (nextIdx >= q.length) {
      if (rep === 'all') nextIdx = 0
      else {
        setIsPlaying(false)
        return
      }
    }
    setQueueIndex(nextIdx)
    loadAndPlay(q[nextIdx])
  }, [loadAndPlay])

  playNextRef.current = playNextInternal

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'auto'
    audioRef.current = audio
    audio.volume = volume

    const onTime = () => setProgress(audio.currentTime)
    const onDuration = () => updateDuration(audio, currentSongRef.current)
    const onEnd = () => {
      if (repeatRef.current === 'one') {
        audio.currentTime = 0
        audio.play()
        return
      }
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
    loadAndPlay(song)
  }

  const togglePlay = () => {
    const audio = audioRef.current!
    if (!currentSong) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
    }
  }

  const playNext = () => playNextInternal()

  const playPrev = () => {
    const audio = audioRef.current!
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
    loadAndPlay(q[prevIdx])
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
  const toggleRepeat = () =>
    setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'))

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
