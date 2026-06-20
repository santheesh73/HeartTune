import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getCachedArtwork, hashArtworkUrl, setCachedArtwork } from '../../../lib/server/artworkCache'
import { captureArtworkWarning } from '../../../lib/server/artworkMonitoring'
import { isJioSaavnArtworkUrl, mirrorArtworkUrl, normalizeArtworkUrl } from '../../../lib/utils/artwork'

const MAX_ARTWORK_BYTES = 8 * 1024 * 1024
const MAX_REDIS_ARTWORK_BYTES = 900 * 1024
const SUCCESS_CACHE_CONTROL = 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800'
const EMERGENCY_FALLBACK_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X1D0SAAAAABJRU5ErkJggg==', 'base64')
let fallbackImage: Promise<Buffer> | undefined

export const runtime = 'nodejs'

function imageResponse(
  body: BodyInit,
  contentType: string,
  cacheStatus: string,
  status = 200,
  cacheControl = SUCCESS_CACHE_CONTROL
) {
  return new NextResponse(body, {
    status,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff',
      'X-HeartTune-Artwork-Cache': cacheStatus,
    },
  })
}

async function fallbackResponse(cacheStatus = 'FALLBACK') {
  fallbackImage ||= readFile(path.join(process.cwd(), 'public', 'icons', 'icon-192.png'))
    .catch(() => EMERGENCY_FALLBACK_PNG)
  // A non-success status makes next/image call the component's onError handler,
  // allowing it to try the mirror/direct URL instead of caching this logo as
  // the song's cover.
  const response = imageResponse(
    Uint8Array.from(await fallbackImage).buffer,
    'image/png',
    cacheStatus,
    404,
    'no-store, max-age=0'
  )
  response.headers.set('X-HeartTune-Artwork-Fallback', '1')
  return response
}

function parseArtworkUrl(value: string | null) {
  const normalized = normalizeArtworkUrl(value)
  if (!normalized || !isJioSaavnArtworkUrl(normalized)) return null
  return new URL(normalized)
}

export async function GET(request: NextRequest) {
  const artworkUrl = parseArtworkUrl(request.nextUrl.searchParams.get('url'))
  if (!artworkUrl) {
    captureArtworkWarning('invalid_url')
    return fallbackResponse()
  }

  // Only successful artwork is cached. A temporary CDN outage must not replace
  // every song cover with the app logo for the full cache lifetime.
  const cacheKey = `artwork:v3:${await hashArtworkUrl(artworkUrl.toString())}`
  const cached = await getCachedArtwork(cacheKey)
  if (cached?.kind === 'image') {
    return imageResponse(Uint8Array.from(Buffer.from(cached.body, 'base64')).buffer, cached.contentType, 'HIT')
  }

  const mirrorUrl = mirrorArtworkUrl(artworkUrl.toString())
  const sources = [artworkUrl, ...(mirrorUrl ? [new URL(mirrorUrl)] : [])]

  for (const source of sources) {
    try {
      const upstream = await fetch(source, {
        signal: AbortSignal.timeout(8_000),
        cache: 'no-store',
        headers: {
          Accept: 'image/avif,image/webp,image/*',
          'User-Agent': 'Mozilla/5.0 (compatible; HeartTuneArtwork/1.0)',
          ...(source.hostname === artworkUrl.hostname ? { Referer: 'https://www.jiosaavn.com/' } : {}),
        },
      })
      const contentType = upstream.headers.get('content-type')?.split(';')[0].trim().toLowerCase() || ''
      const contentLength = Number(upstream.headers.get('content-length') || 0)

      if (!upstream.ok || !contentType.startsWith('image/') || contentLength > MAX_ARTWORK_BYTES) {
        const reason = !upstream.ok ? 'cdn_error' : contentLength > MAX_ARTWORK_BYTES ? 'too_large' : 'invalid_content_type'
        captureArtworkWarning(reason, source, upstream.status)
        continue
      }

      const body = await upstream.arrayBuffer()
      if (body.byteLength === 0 || body.byteLength > MAX_ARTWORK_BYTES) {
        captureArtworkWarning(body.byteLength ? 'too_large' : 'empty_response', source, upstream.status)
        continue
      }

      if (body.byteLength <= MAX_REDIS_ARTWORK_BYTES) {
        await setCachedArtwork(cacheKey, {
          kind: 'image',
          contentType,
          body: Buffer.from(body).toString('base64'),
        })
      }

      return imageResponse(body, contentType, source === artworkUrl ? 'MISS' : 'MIRROR')
    } catch (error) {
      captureArtworkWarning(error instanceof DOMException && error.name === 'TimeoutError' ? 'timeout' : 'fetch_failure', source)
    }
  }

  return fallbackResponse('MISS')
}
