import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../context/LanguageContext'

import { generateHomeFeedConfigs, clearRecommendationsCache, type HomeFeedConfig } from '../services/recommendationService'
import TamilArtistAlbums from '../components/TamilArtistAlbums'
import LazySection from '../components/LazySection'

export default function Home() {

  const navigate = useNavigate()
  const { user } = useAuth()
  const { language } = useLanguage()
  
  const [configs, setConfigs] = useState<HomeFeedConfig[]>([])

  useEffect(() => {
    const fetchFeeds = () => {
      const feedConfigs = generateHomeFeedConfigs(user?.id || null, language)
      setConfigs(feedConfigs)
    }

    fetchFeeds()

    const handleUpdate = () => {
      // Clear Redis cache so new data is fetched
      if (user?.id) {
        clearRecommendationsCache(user.id)
      }
      // Small debounce to prevent multiple rapid refreshes
      setTimeout(fetchFeeds, 1000)
    }

    window.addEventListener('hearttune:recently-played-updated', handleUpdate)
    window.addEventListener('hearttune:recommendations-invalidate', handleUpdate)

    return () => {
      window.removeEventListener('hearttune:recently-played-updated', handleUpdate)
      window.removeEventListener('hearttune:recommendations-invalidate', handleUpdate)
    }
  }, [language, user?.id])

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.name?.split(' ')[0]
  const greetingLine = firstName ? `${greeting}, ${firstName}` : greeting


  return (
    <div className="page home-page pb-20">
      <motion.header
        className="page-header hero-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1>
            {greetingLine}{' '}
            <span role="img" aria-label="waving hand">
              {'\u{1F44B}'}
            </span>
          </h1>
          <p>Discover music that moves your heart</p>
        </div>
      </motion.header>





      <div className="flex flex-col gap-2">
        {configs.map((config, i) => (
          <motion.div 
            key={config.id || `section-${i}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <LazySection config={config} eager={i < 4} />
          </motion.div>
        ))}

        {/* Preserve original language-specific album blocks */}
        {language === 'tamil' ? <TamilArtistAlbums /> : null}
      </div>
    </div>
  )
}
