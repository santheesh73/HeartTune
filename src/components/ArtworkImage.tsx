'use client'

import Image from 'next/image'
import { memo, useEffect, useMemo, useState } from 'react'
import { FALLBACK_ARTWORK_URL, normalizeArtworkUrl } from '../lib/utils/artwork'
import { getArtworkBlob } from '../utils/downloads'

export interface ArtworkImageProps {
  src?: string | null
  alt: string
  className?: string
  priority?: boolean
  sizes?: string
  fallbackSrcs?: string[]
}

function ArtworkImageComponent({
  src,
  alt,
  className = '',
  priority = false,
  sizes = '(max-width: 640px) 96px, 200px',
  fallbackSrcs = [],
}: ArtworkImageProps) {
  const candidateKey = `${src || ''}|${fallbackSrcs.join('|')}`
  const candidates = useMemo(() => {
    const urls = new Set<string>()
    for (const value of [src, ...fallbackSrcs]) {
      const safeUrl = normalizeArtworkUrl(value)
      if (safeUrl) urls.add(safeUrl)
    }
    urls.add(FALLBACK_ARTWORK_URL)
    return Array.from(urls)
  // candidateKey captures the string values without depending on an unstable array prop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateKey])
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [localBlobUrl, setLocalBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    setCandidateIndex(0)
    setLoaded(false)
  }, [candidateKey])

  const activeSrc = candidates[candidateIndex] || FALLBACK_ARTWORK_URL

  useEffect(() => {
    let active = true
    if (!activeSrc || activeSrc === FALLBACK_ARTWORK_URL) {
      setLocalBlobUrl(null)
      return
    }

    async function loadLocalArtwork() {
      try {
        const blob = await getArtworkBlob(activeSrc)
        if (blob && active) {
          const url = URL.createObjectURL(blob)
          setLocalBlobUrl(url)
        } else if (active) {
          setLocalBlobUrl(null)
        }
      } catch {
        if (active) setLocalBlobUrl(null)
      }
    }

    void loadLocalArtwork()
    return () => {
      active = false
      if (localBlobUrl) {
        URL.revokeObjectURL(localBlobUrl)
      }
    }
  }, [activeSrc])

  return (
    <Image
      src={localBlobUrl || activeSrc}
      alt={alt}
      width={500}
      height={500}
      sizes={sizes}
      priority={priority}
      loading={priority ? 'eager' : 'lazy'}
      unoptimized={true}
      placeholder="empty"
      referrerPolicy="no-referrer"
      className={`${className} artwork-image ${loaded ? 'artwork-image-loaded' : 'artwork-image-loading'}`.trim()}
      onLoad={() => setLoaded(true)}
      onError={() => {
        setLoaded(false)
        setCandidateIndex((current) => Math.min(current + 1, candidates.length - 1))
      }}
    />
  )
}

const ArtworkImage = memo(ArtworkImageComponent)
export default ArtworkImage
