import type {
  PlaylistRow,
  ProfileRow,
  RecentlyPlayedRow,
} from './database'

export interface ImageQuality {
  quality: string
  url: string
}

export interface Artist {
  id: string
  name: string
  role?: string
  image?: ImageQuality[]
}

export interface AlbumRef {
  id: string
  name: string
  url?: string
}

export interface DownloadUrl {
  quality: string
  url: string
}

export interface Song {
  id: string
  name: string
  type: string
  year?: string
  duration: number
  language?: string
  album: AlbumRef
  artists: {
    primary: Artist[]
    all?: Artist[]
  }
  image: ImageQuality[]
  downloadUrl: DownloadUrl[]
  url?: string
  playCount?: number
}

export interface Album {
  id: string
  name: string
  description?: string
  year?: number | string
  language?: string
  songCount?: number
  songs?: Song[]
  artists: {
    primary: Artist[]
  }
  image: ImageQuality[]
  url?: string
}

export interface Playlist {
  id: string
  name: string
  description?: string
  songCount?: number
  songs?: Song[]
  image: ImageQuality[]
  url?: string
}

export type Profile = ProfileRow

export interface UserPlaylist extends PlaylistRow {
  songCount?: number
  songs?: Song[]
}

export interface RecentlyPlayedEntry extends RecentlyPlayedRow {
  played_at: string
}

export interface DownloadMetadata {
  id: string
  user_id: string
  song_id: string
  song_title: string
  artist_name: string
  album_name: string | null
  image_url: string | null
  audio_url: string | null
  duration?: string | null
  downloaded_at: string
}

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
}

export interface StoredSong extends Song {
  likedAt?: number
  downloadedAt?: number
  localBlobUrl?: string
}
