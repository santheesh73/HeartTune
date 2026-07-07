import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowLeft, Palette, HardDrive, Trash2, Check, RefreshCw } from 'lucide-react'
import { useTheme, THEMES, ThemeColor } from '../context/ThemeContext'
import { clearAllDownloads } from '../utils/downloads'

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const [clearingCache, setClearingCache] = useState(false)
  const [clearingDownloads, setClearingDownloads] = useState(false)

  const handleClearCache = () => {
    if (window.confirm('Are you sure you want to clear the offline cache? This will reset the Home page state.')) {
      setClearingCache(true)
      // Keep theme and recently played intact if possible, but the requirement is to clear cache
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('hearttune-') && key !== 'hearttune_theme') {
          localStorage.removeItem(key)
        }
      })
      setTimeout(() => {
        setClearingCache(false)
        window.alert('Offline cache cleared.')
      }, 500)
    }
  }

  const handleClearDownloads = async () => {
    if (window.confirm('Are you sure you want to remove all downloaded songs? This will free up storage.')) {
      setClearingDownloads(true)
      try {
        await clearAllDownloads()
        window.alert('All downloads have been removed from your device.')
      } catch (err) {
        console.error(err)
        window.alert('Failed to remove downloads.')
      } finally {
        setClearingDownloads(false)
      }
    }
  }

  return (
    <div className="page settings-page pb-24">
      <Link to="/profile" className="back-link !mt-0 !mb-4">
        <ArrowLeft size={18} />
        <span>Back to Profile</span>
      </Link>

      <motion.header
        className="page-header"
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>Settings</h1>
        <p>Customize your HeartTune experience and manage storage.</p>
      </motion.header>

      <motion.div
        className="settings-section mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 mb-4 text-white/90 font-bold text-lg">
          <Palette size={20} className="text-[var(--color-primary)]" />
          <h2>Theme Customization</h2>
        </div>
        <p className="text-white/50 text-sm mb-6">Choose your preferred accent color for the app interface.</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {(Object.keys(THEMES) as ThemeColor[]).map((t) => {
            const config = THEMES[t]
            const isActive = theme === t
            return (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`relative flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${
                  isActive ? 'bg-white/10 border-white/30' : 'bg-white/5 border-white/5 hover:bg-white/10'
                }`}
              >
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: config.primary, boxShadow: `0 4px 20px ${config.glow}` }}
                >
                  {isActive && <Check size={24} className="text-white" />}
                </div>
                <span className="text-sm font-medium text-white/80">{config.label}</span>
              </button>
            )
          })}
        </div>
      </motion.div>

      <motion.div
        className="settings-section mt-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-4 text-white/90 font-bold text-lg">
          <HardDrive size={20} className="text-[var(--color-primary)]" />
          <h2>Storage Management</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 gap-4">
            <div>
              <h3 className="font-semibold text-white/90">Clear Offline Cache</h3>
              <p className="text-white/50 text-sm mt-1">Removes saved page layouts and API responses.</p>
            </div>
            <button 
              onClick={handleClearCache}
              disabled={clearingCache}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition disabled:opacity-50"
            >
              {clearingCache ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Clear Cache
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-red-500/10 rounded-xl border border-red-500/20 gap-4">
            <div>
              <h3 className="font-semibold text-red-200">Remove All Downloads</h3>
              <p className="text-red-300/60 text-sm mt-1">Deletes all offline music from your device storage.</p>
            </div>
            <button 
              onClick={handleClearDownloads}
              disabled={clearingDownloads}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-full transition disabled:opacity-50"
            >
              {clearingDownloads ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Delete
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
