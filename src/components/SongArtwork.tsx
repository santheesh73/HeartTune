import { useMemo } from 'react'
import type { ImageQuality } from '../types'
import { getArtworkCandidates } from '../lib/utils/artwork'
import ArtworkImage from './ArtworkImage'

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
  return (
    <ArtworkImage
      src={candidates[0]}
      fallbackSrcs={candidates.slice(1)}
      alt={alt}
      className={className}
      priority={loading === 'eager'}
      sizes={size === '150x150' ? '(max-width: 640px) 56px, 150px' : '(max-width: 640px) 50vw, 240px'}
    />
  )
}
