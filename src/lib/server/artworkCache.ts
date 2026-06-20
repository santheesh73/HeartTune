import { Redis } from '@upstash/redis'

export const ARTWORK_CACHE_TTL_SECONDS = 60 * 60 * 24

export type CachedArtwork =
  { kind: 'image'; contentType: string; body: string }

let redis: Redis | null | undefined

function getRedis() {
  if (redis !== undefined) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  redis = url && token ? new Redis({ url, token }) : null
  return redis
}

export async function hashArtworkUrl(url: string) {
  const bytes = new TextEncoder().encode(url)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function getCachedArtwork(key: string) {
  const client = getRedis()
  if (!client) return null

  try {
    return await client.get<CachedArtwork>(key)
  } catch {
    // Artwork must remain available even when the optional cache is unavailable.
    return null
  }
}

export async function setCachedArtwork(key: string, value: CachedArtwork) {
  const client = getRedis()
  if (!client) return

  try {
    await client.set(key, value, { ex: ARTWORK_CACHE_TTL_SECONDS })
  } catch {
    // Cache writes are best-effort and must never break image rendering.
  }
}
