import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import type { HomeSection, HomeFeedThunk } from '../services/recommendationService'
import SectionSlider from './SectionSlider'

interface LazySectionProps {
  thunk: HomeFeedThunk
}

export default function LazySection({ thunk }: LazySectionProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px 0px', // Load before it comes into view
  })

  const [section, setSection] = useState<HomeSection | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (inView && loading) {
      let isMounted = true
      thunk()
        .then((data) => {
          if (isMounted) {
            setSection(data)
            setLoading(false)
          }
        })
        .catch(() => {
          if (isMounted) {
            setSection(null)
            setLoading(false)
          }
        })
      return () => {
        isMounted = false
      }
    }
  }, [inView, loading, thunk])

  if (loading) {
    return (
      <div ref={ref} className="space-y-4 px-4 sm:px-6 mt-8 mb-4">
        <div className="h-8 w-48 bg-white/10 rounded animate-pulse mb-2"></div>
        <div className="flex gap-5 sm:gap-6 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-48 w-[150px] sm:w-[190px] md:w-[220px] shrink-0 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!section) return null

  return (
    <div ref={ref}>
      <SectionSlider section={section} />
    </div>
  )
}
