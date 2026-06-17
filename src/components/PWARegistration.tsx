'use client'

import { useEffect } from 'react'

export default function PWARegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return
    }

    let cancelled = false
    let visibilityHandler: (() => void) | null = null
    let onlineHandler: (() => void) | null = null

    // Register the service worker in production so browsers can cache assets and pages.
    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/',
          updateViaCache: 'none',
        })

        const triggerUpdate = () => {
          if (!cancelled) {
            void registration.update()
          }
        }

        visibilityHandler = () => {
          if (document.visibilityState === 'visible') {
            triggerUpdate()
          }
        }
        onlineHandler = () => triggerUpdate()

        document.addEventListener('visibilitychange', visibilityHandler)
        window.addEventListener('online', onlineHandler)
        triggerUpdate()
      } catch (error) {
        console.error('Service worker registration failed:', error)
      }
    }

    void registerServiceWorker()

    return () => {
      cancelled = true
      if (visibilityHandler) {
        document.removeEventListener('visibilitychange', visibilityHandler)
      }
      if (onlineHandler) {
        window.removeEventListener('online', onlineHandler)
      }
    }
  }, [])

  return null
}
