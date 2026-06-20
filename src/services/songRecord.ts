import { getBestAudioUrl, getArtistNames } from '../api/saavn'
import type { Song } from '../types'
import { getSourceArtworkUrl } from '../utils/artwork'

interface SongRecordShape {
  song_id: string
  song_title: string
  artist_name: string
  album_name: string | null
  image_url: string | null
  audio_url: string | null
  duration?: string | null
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
  const artworkUrl = getSourceArtworkUrl(song.image, '500x500')

  return {
    song_id: song.id,
    song_title: song.name,
    artist_name: getArtistNames(song),
    album_name: song.album?.name || '',
    // The app icon is a rendering fallback, not song metadata. Saving it here
    // makes a temporary missing image permanent across every future session.
    image_url: artworkUrl || null,
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
