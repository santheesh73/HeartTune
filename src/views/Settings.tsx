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
    <div className="page settings-page pb-24 px-6 md:px-12 pt-8 max-w-5xl mx-auto">
      <Link to="/profile" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors">
        <ArrowLeft size={18} />
        <span className="font-medium text-sm">Back to Profile</span>
      </Link>

      <motion.header
        className="mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">Settings</h1>
        <p className="text-white/60 text-lg">Customize your HeartTune experience and manage storage.</p>
      </motion.header>

      <div className="space-y-12">
        {/* Theme Customization */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden"
        >
          {/* Decorative gradient blur */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[var(--color-primary)] opacity-10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center border border-white/[0.1]">
              <Palette size={20} className="text-[var(--color-primary)]" />
            </div>
            <h2 className="text-2xl font-bold text-white/90">Theme Customization</h2>
          </div>
          <p className="text-white/50 text-sm mb-8 ml-13">Choose your preferred accent color for the app interface.</p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {(Object.keys(THEMES) as ThemeColor[]).map((t) => {
              const config = THEMES[t]
              const isActive = theme === t
              return (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`group relative flex flex-col items-center gap-4 p-6 rounded-2xl border transition-all duration-300 ${
                    isActive 
                      ? 'bg-white/10 border-white/20 shadow-lg' 
                      : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.08] hover:border-white/10'
                  }`}
                  style={{
                    boxShadow: isActive ? \`0 8px 30px \${config.glow}\` : 'none'
                  }}
                >
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center shadow-inner transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundColor: config.primary }}
                  >
                    {isActive && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <Check size={26} className="text-white" strokeWidth={3} />
                      </motion.div>
                    )}
                  </div>
                  <span className={\`text-sm font-semibold tracking-wide \${isActive ? 'text-white' : 'text-white/70'}\`}>
                    {config.label}
                  </span>
                </button>
              )
            })}
          </div>
        </motion.section>

        {/* Storage Management */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center border border-white/[0.1]">
              <HardDrive size={20} className="text-[var(--color-primary)]" />
            </div>
            <h2 className="text-2xl font-bold text-white/90">Storage Management</h2>
          </div>
          <p className="text-white/50 text-sm mb-8 ml-13">Manage your device's storage and offline capabilities.</p>
          
          <div className="space-y-4">
            {/* Clear Cache */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/[0.03] rounded-2xl border border-white/5 transition-colors hover:bg-white/[0.05] gap-4">
              <div>
                <h3 className="font-bold text-white/90 text-lg">Clear Offline Cache</h3>
                <p className="text-white/50 text-sm mt-1">Removes saved page layouts, images, and API responses.</p>
              </div>
              <button 
                onClick={handleClearCache}
                disabled={clearingCache}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full font-medium transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
              >
                <RefreshCw size={18} className={clearingCache ? "animate-spin" : ""} />
                {clearingCache ? 'Clearing...' : 'Clear Cache'}
              </button>
            </div>

            {/* Clear Downloads */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-red-500/[0.05] rounded-2xl border border-red-500/10 transition-colors hover:bg-red-500/10 gap-4">
              <div>
                <h3 className="font-bold text-red-400 text-lg">Remove All Downloads</h3>
                <p className="text-red-400/60 text-sm mt-1">Deletes all offline music from your device storage to free up space.</p>
              </div>
              <button 
                onClick={handleClearDownloads}
                disabled={clearingDownloads}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400 rounded-full font-medium transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
              >
                {clearingDownloads ? <RefreshCw size={18} className="animate-spin" /> : <Trash2 size={18} />}
                {clearingDownloads ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
