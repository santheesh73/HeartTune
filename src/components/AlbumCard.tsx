import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getArtworkCandidates } from '../lib/utils/artwork'
import type { Album } from '../types'
import ArtworkImage from './ArtworkImage'

interface AlbumCardProps {
  album: Album
  index?: number
}

export default function AlbumCard({ album, index = 0 }: AlbumCardProps) {
  const images = getArtworkCandidates(album.image, '500x500')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -6 }}
    >
      <Link to={`/album/${album.id}`} className="album-card">
        <div className="album-card-image-wrap">
          <ArtworkImage
            src={images[0]}
            fallbackSrcs={images.slice(1)}
            alt={album.name}
            className="album-card-image"
            sizes="(max-width: 640px) 44vw, (max-width: 1100px) 25vw, 220px"
          />
        </div>
        <h3 className="album-card-title">{album.name}</h3>
        <p className="album-card-artist">
          {album.artists?.primary?.map((a) => a.name).join(', ')}
        </p>
      </Link>
    </motion.div>
  )
}
