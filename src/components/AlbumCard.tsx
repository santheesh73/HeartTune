import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getBestImage } from '../api/saavn'
import type { Album } from '../types'

interface AlbumCardProps {
  album: Album
  index?: number
}

export default function AlbumCard({ album, index = 0 }: AlbumCardProps) {
  const image = getBestImage(album.image, '500x500')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -6 }}
    >
      <Link to={`/album/${album.id}`} className="album-card">
        <div className="album-card-image-wrap">
          <img src={image} alt={album.name} className="album-card-image" loading="lazy" />
        </div>
        <h3 className="album-card-title">{album.name}</h3>
        <p className="album-card-artist">
          {album.artists?.primary?.map((a) => a.name).join(', ')}
        </p>
      </Link>
    </motion.div>
  )
}
