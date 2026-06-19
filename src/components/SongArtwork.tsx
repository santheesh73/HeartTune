import { useEffect, useMemo, useState } from 'react'
import type { ImageQuality } from '../types'
import { FALLBACK_ARTWORK_URL, getArtworkCandidates } from '../utils/artwork'

interface SongArtworkProps {
  images: ImageQuality[]
  alt?: string
  className: string
  size?: string
  loading?: 'eager' | 'lazy'
}

export default function SongArtwork({
  images,
  alt = '',
  className,
  size = '500x500',
  loading = 'lazy',
}: SongArtworkProps) {
  const candidates = useMemo(() => getArtworkCandidates(images, size), [images, size])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [candidates])

  const src = candidates[index] || FALLBACK_ARTWORK_URL

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      onError={() => {
        setIndex((current) =>
          current + 1 < candidates.length ? current + 1 : current
        )
      }}
    />
  )
}
