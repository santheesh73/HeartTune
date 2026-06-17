import { getBestAudioUrl, getBestImage, getArtistNames } from '../api/saavn'
import type { Song } from '../types'

interface SongRecordShape {
  song_id: string
  song_title: string
  artist_name: string
  album_name: string | null
  image_url: string | null
  audio_url: string | null
  duration: string | null
}

function parseArtists(artistName: string) {
  return artistName
    .split(',')
    .map((name, index) => ({
      id: `${index}`,
      name: name.trim(),
    }))
    .filter((artist) => artist.name.length > 0)
}

export function buildSongRecord(song: Song): SongRecordShape {
  return {
    song_id: song.id,
    song_title: song.name,
    artist_name: getArtistNames(song),
    album_name: song.album?.name || '',
    image_url: getBestImage(song.image, '500x500') || getBestImage(song.image, '150x150'),
    audio_url: getBestAudioUrl(song),
    duration: String(song.duration || 0),
  }
}

export function mapRecordToSong(record: SongRecordShape): Song {
  return {
    id: record.song_id,
    name: record.song_title,
    type: 'song',
    duration: Number(record.duration) || 0,
    album: {
      id: record.album_name || record.song_id,
      name: record.album_name || 'Unknown Album',
    },
    artists: {
      primary: parseArtists(record.artist_name),
    },
    image: record.image_url
      ? [{ quality: '500x500', url: record.image_url }]
      : [],
    downloadUrl: record.audio_url
      ? [{ quality: '320kbps', url: record.audio_url }]
      : [],
  }
}
