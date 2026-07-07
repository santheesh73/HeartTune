import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Globe2, Sparkles, TrendingUp } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../context/LanguageContext'

import { generateHomeFeedThunks, clearRecommendationsCache, type HomeFeedThunk } from '../services/recommendationService'
import LyricistAlbums from '../components/LyricistAlbums'
import TamilArtistAlbums from '../components/TamilArtistAlbums'
import LazySection from '../components/LazySection'

export default function Home() {

  const navigate = useNavigate()
  const { user } = useAuth()
  const { language, setLanguage, languages } = useLanguage()
  
  const [thunks, setThunks] = useState<HomeFeedThunk[]>([])

  useEffect(() => {
    const fetchFeeds = () => {
      const feedThunks = generateHomeFeedThunks(user?.id || null, language)
      setThunks(feedThunks)
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

      <section className="quick-picks mb-8">
        {languages.map((l, i) => (
          <motion.div
            key={l.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.03 }}
          >
            <button
              type="button"
              className={`quick-pick lang-pick ${language === l.id ? 'active' : ''}`}
              onClick={() => setLanguage(l.id)}
              title={`Show ${l.label} songs`}
            >
              <span className="quick-pick-icon">
                {i === 0 ? (
                  <Globe2 size={20} />
                ) : i % 2 === 0 ? (
                  <Sparkles size={20} />
                ) : (
                  <TrendingUp size={20} />
                )}
              </span>
              {l.label}
            </button>
          </motion.div>
        ))}
      </section>

      <div className="flex flex-col gap-2">
        {thunks.map((thunk, i) => (
          <motion.div 
            key={`section-${i}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <LazySection thunk={thunk} />
          </motion.div>
        ))}

        {/* Preserve original language-specific album blocks */}
        {language === 'tamil' ? <TamilArtistAlbums /> : null}
        <LyricistAlbums language={language} />
      </div>
    </div>
  )
}
