const STATIC_CACHE = 'hearttune-static-v4'
const PAGE_CACHE = 'hearttune-pages-v1'
const IMAGE_CACHE = 'hearttune-images-v3'
const OFFLINE_URL = '/offline.html'
const PRECACHE_URLS = [
  '/',
  OFFLINE_URL,
  '/manifest.json',
  '/favicon.png',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== PAGE_CACHE)
          .filter((key) => key !== IMAGE_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

function isCacheableStaticAsset(requestUrl) {
  return (
    requestUrl.origin === self.location.origin &&
    (requestUrl.pathname.startsWith('/_next/static/') ||
      /\.(?:css|js|mjs|png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/i.test(requestUrl.pathname))
  )
}

function isFontRequest(requestUrl) {
  return (
    requestUrl.hostname === 'fonts.gstatic.com' ||
    requestUrl.hostname === 'fonts.googleapis.com' ||
    /\.(?:woff2?|eot|ttf|otf)$/i.test(requestUrl.pathname)
  )
}

async function networkFirst(request) {
  const cache = await caches.open(PAGE_CACHE)

  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    // Fall back to root App Shell first when offline
    const shellResponse = await caches.match('/')
    if (shellResponse) {
      return shellResponse
    }
    return caches.match(OFFLINE_URL)
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)
  if (cachedResponse) return cachedResponse

  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return Response.error()
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cachedResponse = await cache.match(request)

  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => cachedResponse)

  return cachedResponse || networkPromise
}

async function cacheFirstImage(request) {
  const cache = await caches.open(IMAGE_CACHE)
  const cachedResponse = await cache.match(request)

  if (cachedResponse) return cachedResponse

  try {
    const response = await fetch(request)
    const isArtworkFallback = response.headers.get('X-HeartTune-Artwork-Fallback') === '1'
    if (!isArtworkFallback && (response.ok || response.type === 'opaque')) {
      await cache.put(request, response.clone())
    }
    return response
  } catch {
    return Response.error()
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const requestUrl = new URL(request.url)

  if (request.method !== 'GET') return

  if (request.destination === 'image') {
    event.respondWith(cacheFirstImage(request))
    return
  }

  // Handle fonts via Cache First strategy
  if (isFontRequest(requestUrl)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  if (requestUrl.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  if (isCacheableStaticAsset(requestUrl)) {
    // Cache First for compiled Next.js chunks, Stale While Revalidate for other local assets
    if (requestUrl.pathname.startsWith('/_next/static/')) {
      event.respondWith(cacheFirst(request, STATIC_CACHE))
    } else {
      event.respondWith(staleWhileRevalidate(request))
    }
  }
})
