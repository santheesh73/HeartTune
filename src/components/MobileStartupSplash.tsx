import { useEffect, useState, type ReactNode } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'

const SPLASH_DURATION_MS = 1400

export default function MobileStartupSplash({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile()
  const [showSplash, setShowSplash] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth <= 900
  )

  useEffect(() => {
    if (!isMobile || !showSplash) return

    const timeout = window.setTimeout(() => setShowSplash(false), SPLASH_DURATION_MS)
    return () => window.clearTimeout(timeout)
  }, [isMobile, showSplash])

  if (isMobile && showSplash) {
    return (
      <div className="mobile-startup-splash" role="status" aria-label="Opening HeartTune">
        <img src="/favicon.png" alt="" className="mobile-startup-logo" />
      </div>
    )
  }

  return children
}
