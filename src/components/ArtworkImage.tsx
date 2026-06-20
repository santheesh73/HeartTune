'use client'

import Image from 'next/image'
import { memo, useEffect, useMemo, useState } from 'react'
import { FALLBACK_ARTWORK_URL, normalizeArtworkUrl } from '../lib/utils/artwork'

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

  useEffect(() => {
    setCandidateIndex(0)
    setLoaded(false)
  }, [candidateKey])

  const activeSrc = candidates[candidateIndex] || FALLBACK_ARTWORK_URL

  return (
    <Image
      src={activeSrc}
      alt={alt}
      width={500}
      height={500}
      sizes={sizes}
      priority={priority}
      loading={priority ? 'eager' : 'lazy'}
      unoptimized={!activeSrc.startsWith('/')}
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
