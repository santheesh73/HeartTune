'use client'

import { useEffect } from 'react'

export default function PWARegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }

    if (process.env.NODE_ENV !== 'production') {
      // Production service workers can keep controlling localhost after a PWA
      // test. Remove them and their old image fallbacks during development.
      void (async () => {
        const registrations = await navigator.serviceWorker.getRegistrations()
        const removedWorkers = registrations.length > 0
        await Promise.all(registrations.map((registration) => registration.unregister()))

        let removedImageCache = false
        if ('caches' in window) {
          const cacheKeys = await caches.keys()
          const imageCacheKeys = cacheKeys.filter((key) => key.startsWith('hearttune-images-'))
          removedImageCache = imageCacheKeys.length > 0
          await Promise.all(imageCacheKeys.map((key) => caches.delete(key)))
        }

        const reloadKey = 'hearttune-dev-service-worker-cleanup'
        if ((removedWorkers || removedImageCache) && !sessionStorage.getItem(reloadKey)) {
          sessionStorage.setItem(reloadKey, 'done')
          window.location.reload()
        }
      })()
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
