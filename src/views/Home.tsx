import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Globe2, Sparkles, TrendingUp } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../context/LanguageContext'

import { generateHomeFeedConfigs, clearRecommendationsCache, type HomeFeedConfig } from '../services/recommendationService'
import LyricistAlbums from '../components/LyricistAlbums'
import TamilArtistAlbums from '../components/TamilArtistAlbums'
import LazySection from '../components/LazySection'

export default function Home() {

  const navigate = useNavigate()
  const { user } = useAuth()
  const { language, setLanguage, languages } = useLanguage()
  
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

      <section className="mb-8 hidden sm:flex items-center gap-3 bg-[#1a1a1a] border border-white/10 rounded-xl p-2 w-fit">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500">
          <Globe2 size={18} />
        </div>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as any)}
          className="bg-transparent border-none text-white/90 text-sm font-medium outline-none cursor-pointer appearance-none min-w-[120px] pr-8"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right center',
          }}
        >
          {languages.map((l) => (
            <option key={l.id} value={l.id} className="bg-[#1a1a1a] text-white">
              {l.label}
            </option>
          ))}
        </select>
      </section>

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
        <LyricistAlbums language={language} />
      </div>
    </div>
  )
}
