import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

const route = await read('src/app/api/artwork/route.ts')
const utility = await read('src/lib/utils/artwork.ts')
const component = await read('src/components/ArtworkImage.tsx')
const cache = await read('src/lib/server/artworkCache.ts')
const monitoring = await read('src/lib/server/artworkMonitoring.ts')
const serviceWorker = await read('public/service-worker.js')
const pwaRegistration = await read('src/components/PWARegistration.tsx')

test('artwork route signals a retryable image fallback instead of a 502', () => {
  assert.match(route, /fallbackResponse/)
  assert.match(route, /status = 200/)
  assert.match(route, /404/)
  assert.match(route, /no-store, max-age=0/)
  assert.doesNotMatch(route, /status:\s*502/)
  assert.match(route, /!upstream\.ok/)
  assert.match(route, /AbortSignal\.timeout/)
})

test('artwork URLs try untouched catalog sources before recovery sources', () => {
  assert.match(utility, /normalizeArtworkUrl/)
  assert.match(utility, /resizeArtworkUrl/)
  assert.match(utility, /mirrorArtworkUrl/)
  assert.match(utility, /https:\/\/wsrv\.nl\//)
  assert.match(utility, /JIOSAAVN_ARTWORK_HOST/)
  assert.match(utility, /FALLBACK_ARTWORK_URL/)
  assert.ok(
    utility.indexOf('for (const image of orderedImages) addOriginalCandidate') <
      utility.indexOf('for (const image of orderedImages) addRecoveryCandidates')
  )
})

test('reusable artwork component uses next image and an error fallback', () => {
  assert.match(component, /from 'next\/image'/)
  assert.match(component, /onError/)
  assert.match(component, /artwork-image-loading/)
  assert.match(component, /sizes=/)
  assert.match(component, /referrerPolicy="no-referrer"/)
})

test('artwork cache uses hashed Upstash keys with a 24 hour TTL', () => {
  assert.match(route, /`artwork:v3:\$\{await hashArtworkUrl/)
  assert.doesNotMatch(route, /setCachedArtwork\(cacheKey, \{ kind: 'fallback' \}\)/)
  assert.match(cache, /60 \* 60 \* 24/)
  assert.match(cache, /UPSTASH_REDIS_REST_URL/)
  assert.match(cache, /UPSTASH_REDIS_REST_TOKEN/)
})

test('artwork warnings are warning-level and throttled', () => {
  assert.match(monitoring, /setLevel\('warning'\)/)
  assert.match(monitoring, /WARNING_THROTTLE_MS/)
  assert.match(monitoring, /captureMessage/)
})

test('service worker lets failed artwork advance to the next candidate', () => {
  assert.match(serviceWorker, /hearttune-images-v3/)
  assert.match(serviceWorker, /X-HeartTune-Artwork-Fallback/)
  assert.match(serviceWorker, /return Response\.error\(\)/)
  assert.doesNotMatch(serviceWorker, /return fallback \|\| Response\.error/)
  assert.match(pwaRegistration, /registration\.unregister\(\)/)
  assert.match(pwaRegistration, /startsWith\('hearttune-images-'\)/)
})
