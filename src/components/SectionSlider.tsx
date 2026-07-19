import React, { useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Play } from 'lucide-react'
import type { HomeSection } from '../services/recommendationService'
import SongCard from './SongCard'
import { usePlayer } from '../context/PlayerContext'

interface SectionSliderProps {
  section: HomeSection
  eager?: boolean
}

function SectionSlider({ section, eager = false }: SectionSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null)
  const { playSong } = usePlayer()

  const scroll = (dir: 'left' | 'right') => {
    if (sliderRef.current) {
      const { scrollLeft, clientWidth } = sliderRef.current
      const scrollAmount = clientWidth * 0.8
      sliderRef.current.scrollTo({
        left: dir === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  const playAll = () => {
    if (section.items.length > 0) {
      playSong(section.items[0], section.items)
    }
  }

  if (section.items.length === 0) return null

  return (
    <section className="mt-14 sm:mt-8 mb-8 sm:mb-4 relative group">
      <div className="flex items-start justify-between gap-4 mb-4 px-4 sm:px-6">
        <div className="flex-1 overflow-hidden">
          <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white/90 drop-shadow-sm truncate">{section.title}</h2>
          {section.subtitle && (
            <p className="text-xs sm:text-sm text-white/50 mt-1 max-w-2xl leading-snug line-clamp-1 sm:line-clamp-none">{section.subtitle}</p>
          )}
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="text-sm font-semibold px-4 py-1.5 rounded-full bg-rose-600/10 text-rose-500 hover:bg-rose-600/20 hover:text-rose-400 transition-colors flex items-center gap-2 shrink-0 mt-1"
          onClick={playAll}
        >
          <Play size={16} fill="currentColor" /> Play All
        </motion.button>
      </div>

      <div className="relative">
        {/* Navigation Buttons - visible on hover on larger screens */}
        <button 
          className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 shadow-lg"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          <ChevronLeft size={24} />
        </button>

        <div 
          ref={sliderRef}
          className="flex overflow-x-auto gap-4 sm:gap-6 px-4 sm:px-6 pb-6 pt-2 snap-x snap-mandatory hide-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {section.items.map((song, i) => (
            <div key={`${section.id}-${song.id}-${i}`} className="snap-start shrink-0 w-[110px] sm:w-[140px] md:w-[160px]">
              <SongCard song={song} queue={section.items} index={i} eager={eager && i < 4} />
            </div>
          ))}
        </div>

        <button 
          className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 shadow-lg"
          onClick={() => scroll('right')}
          aria-label="Scroll right"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  )
}

export default React.memo(SectionSlider)
