import type { ImageQuality } from '../../types'

export const FALLBACK_ARTWORK_URL = '/images/default-album.svg'
export const JIOSAAVN_ARTWORK_HOST = 'c.saavncdn.com'
// Bump when proxy behavior changes so Next/Image and service-worker caches do
// not keep an old 200 response containing the branded fallback image.
const ARTWORK_PROXY_VERSION = '5'

const SUPPORTED_SIZES = new Set(['50x50', '150x150', '500x500'])

export function normalizeArtworkSize(size?: string) {
  return size && SUPPORTED_SIZES.has(size) ? size : '500x500'
}

/** Returns a safe HTTPS or local artwork URL, or an empty string for invalid input. */
export function normalizeArtworkUrl(value?: string | null) {
  if (!value) return ''

  const normalized = value.trim().replace(/&amp;/gi, '&')
  if (!normalized) return ''
  if (normalized.startsWith('/')) return normalized.startsWith('//') ? `https:${normalized}` : normalized

  try {
    const parsed = new URL(normalized.startsWith('http://')
      ? `https://${normalized.slice('http://'.length)}`
      : normalized)
    return parsed.protocol === 'https:' ? parsed.toString() : ''
  } catch {
    return ''
  }
}

export function resizeArtworkUrl(value: string, requestedSize = '500x500') {
  const url = normalizeArtworkUrl(value)
  if (!url) return ''

  const size = normalizeArtworkSize(requestedSize)
  return url
    .replace(/(?:50|150|250|300|500)x(?:50|150|250|300|500)/gi, size)
    .replace(/_(?:50|150|250|300|500)\.(?=[a-z]+(?:\?|$))/gi, `_${size.split('x')[0]}.`)
}

export function isJioSaavnArtworkUrl(value?: string | null) {
  const normalized = normalizeArtworkUrl(value)
  if (!normalized) return false

  try {
    const parsed = new URL(normalized)
    return parsed.protocol === 'https:' && parsed.hostname === JIOSAAVN_ARTWORK_HOST
  } catch {
    return false
  }
}

export function proxyArtworkUrl(value?: string | null) {
  const normalized = normalizeArtworkUrl(value)
  return isJioSaavnArtworkUrl(normalized)
    ? `/api/artwork?v=${ARTWORK_PROXY_VERSION}&url=${encodeURIComponent(normalized)}`
    : normalized
}

/** Independent HTTPS fallback for JioSaavn CDN outages and TLS failures. */
export function mirrorArtworkUrl(value?: string | null, requestedSize = '500x500') {
  const normalized = normalizeArtworkUrl(value)
  if (!isJioSaavnArtworkUrl(normalized)) return ''

  const pixels = normalizeArtworkSize(requestedSize).split('x')[0]
  const mirror = new URL('https://wsrv.nl/')
  const source = new URL(normalized)
  mirror.searchParams.set('url', `${source.host}${source.pathname}${source.search}`)
  mirror.searchParams.set('w', pixels)
  mirror.searchParams.set('h', pixels)
  mirror.searchParams.set('fit', 'cover')
  mirror.searchParams.set('output', 'webp')
  return mirror.toString()
}

function addOriginalCandidate(urls: Set<string>, value: string) {
  const original = normalizeArtworkUrl(value)
  if (original) urls.add(original)
}

function addRecoveryCandidates(urls: Set<string>, value: string, size: string) {
  const original = normalizeArtworkUrl(value)
  if (!isJioSaavnArtworkUrl(original)) return

  urls.add(proxyArtworkUrl(original))
  urls.add(mirrorArtworkUrl(original, size))
}

export function getArtworkCandidates(images: ImageQuality[] = [], preferredSize = '500x500') {
  const size = normalizeArtworkSize(preferredSize)
  const urls = new Set<string>()
  const safeImages = Array.isArray(images)
    ? images.filter((image) => image && typeof image.url === 'string')
    : []

  const preferred = safeImages.find((image) => image.quality === size)
  const orderedImages = preferred
    ? [preferred, ...safeImages.filter((image) => image !== preferred)]
    : safeImages

  // Attempt the exact catalog URLs before any proxy, mirror, or fallback.
  for (const image of orderedImages) addOriginalCandidate(urls, image.url)
  for (const image of orderedImages) addRecoveryCandidates(urls, image.url, size)

  urls.delete('')
  urls.add(FALLBACK_ARTWORK_URL)
  return Array.from(urls)
}

export function getArtworkUrl(images: ImageQuality[] = [], preferredSize = '500x500') {
  return getArtworkCandidates(images, preferredSize)[0] || FALLBACK_ARTWORK_URL
}

/** Use this when artwork must be persisted; proxy URLs are intentionally excluded. */
export function getSourceArtworkUrl(images: ImageQuality[] = [], preferredSize = '500x500') {
  const size = normalizeArtworkSize(preferredSize)
  const preferred = images.find((image) => image?.quality === size)
  const orderedImages = preferred ? [preferred, ...images.filter((image) => image !== preferred)] : images
  for (const image of orderedImages || []) {
    const url = resizeArtworkUrl(image?.url || '', size)
    if (url && url !== FALLBACK_ARTWORK_URL) return url
  }
  return ''
}
