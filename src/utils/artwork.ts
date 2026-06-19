import type { ImageQuality } from '../types'

export const FALLBACK_ARTWORK_URL = '/icons/icon-192.png'

function normalizeArtworkUrl(url: string) {
  const trimmed = url.trim().replace(/&amp;/gi, '&')
  if (!trimmed) return ''
  if (trimmed.startsWith('//')) return `https:${trimmed}`
  if (trimmed.startsWith('http://')) return `https://${trimmed.slice('http://'.length)}`
  return trimmed
}

function resizeArtworkUrl(url: string, size: string) {
  return url.replace(/(?:50|150|500)x(?:50|150|500)/g, size)
}

export function getArtworkCandidates(images: ImageQuality[] = [], preferredSize = '500x500') {
  const urls = new Set<string>()
  const normalizedImages = images
    .map((image) => ({
      ...image,
      url: normalizeArtworkUrl(image.url),
    }))
    .filter((image) => image.url)

  const preferred = normalizedImages.find((image) => image.quality === preferredSize)
  if (preferred) urls.add(resizeArtworkUrl(preferred.url, preferredSize))

  for (const image of normalizedImages) {
    urls.add(resizeArtworkUrl(image.url, preferredSize))
    urls.add(image.url)
  }

  urls.add(FALLBACK_ARTWORK_URL)
  return Array.from(urls)
}

export function getArtworkUrl(images: ImageQuality[] = [], preferredSize = '500x500') {
  return getArtworkCandidates(images, preferredSize)[0] || FALLBACK_ARTWORK_URL
}
