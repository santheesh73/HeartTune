import type { Album } from '../types'
import { supabase } from '../lib/supabase'
import { assertNoSupabaseError, requireSupabase } from './serviceUtils'
import type { LikedAlbumRow } from '../types/database'

export async function getLikedAlbums(userId: string): Promise<Album[]> {
  const client = requireSupabase(supabase)
  const { data, error } = await client
    .from('liked_albums')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  assertNoSupabaseError(error, 'Unable to load liked albums')

  return (data || []).map((row: LikedAlbumRow) => ({
    id: row.album_id,
    name: row.album_name,
    year: row.year || '',
    type: 'album',
    playCount: 0,
    language: 'all',
    explicitContent: false,
    songCount: 0,
    artists: {
      primary: [{ id: row.artist_name, name: row.artist_name, role: 'primary', type: 'artist', image: [] }],
      featured: [],
      all: [],
    },
    image: row.image_url ? [{ quality: '500x500', url: row.image_url }] : [],
    songs: [],
  }))
}

export async function addLikedAlbum(userId: string, album: Album): Promise<boolean> {
  const client = requireSupabase(supabase)
  
  const artists = album.artists?.primary?.map(a => a.name).join(', ') || 'Unknown'
  const imageUrl = album.image && album.image.length > 0 ? album.image[album.image.length - 1].url : null

  const { error } = await client.from('liked_albums').upsert(
    {
      user_id: userId,
      album_id: album.id,
      album_name: album.name,
      artist_name: artists,
      image_url: imageUrl,
      year: album.year?.toString() || null,
    },
    { onConflict: 'user_id, album_id' }
  )

  assertNoSupabaseError(error, 'Unable to like album')
  // await auditLog('album_like', { action: 'add', albumId: album.id })
  return true
}

export async function removeLikedAlbum(userId: string, albumId: string): Promise<boolean> {
  const client = requireSupabase(supabase)
  const { error } = await client
    .from('liked_albums')
    .delete()
    .eq('user_id', userId)
    .eq('album_id', albumId)

  assertNoSupabaseError(error, 'Unable to unlike album')
  // await auditLog('album_like', { action: 'remove', albumId })
  return true
}
