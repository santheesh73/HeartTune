import { useInView } from 'react-intersection-observer'
import type { HomeFeedConfig } from '../services/recommendationService'
import SectionSlider from './SectionSlider'
import { useHomeSection } from '../hooks/useHomeSection'

interface LazySectionProps {
  config: HomeFeedConfig
  eager?: boolean
}

export default function LazySection({ config, eager = false }: LazySectionProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px 0px', // Load before it comes into view
  })

  // We only enable the background query if the section is eager OR has come into view.
  // Note: if there is offline cache, initialData will synchronously populate `data`, 
  // ensuring the section renders instantly without a skeleton, while the network request
  // waits until `enabled` is true to revalidate.
  const { data: section, isLoading } = useHomeSection(config, eager || inView)

  // Only show skeleton if we have NO data AND it's still loading the initial fetch.
  // If we have stale data, it renders immediately (SWR).
  if (isLoading && !section) {
    return (
      <div ref={ref} className="space-y-4 px-4 sm:px-6 mt-8 mb-4">
        <div className="h-8 w-48 bg-white/10 rounded animate-pulse mb-2"></div>
        <div className="flex gap-5 sm:gap-6 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-48 w-[110px] sm:w-[140px] md:w-[160px] shrink-0 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!section) return <div ref={ref} /> // Empty div so intersection observer still has a target if data is null

  return (
    <div ref={ref}>
      <SectionSlider section={section} eager={eager} />
    </div>
  )
}

