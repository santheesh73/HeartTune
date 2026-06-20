import * as Sentry from '@sentry/nextjs'

const WARNING_THROTTLE_MS = 60 * 60 * 1000
const lastWarningAt = new Map<string, number>()

export function captureArtworkWarning(reason: string, artworkUrl?: URL | null, status?: number) {
  const host = artworkUrl?.hostname || 'invalid'
  const warningKey = `${reason}:${host}:${status || 0}`
  const now = Date.now()
  if (now - (lastWarningAt.get(warningKey) || 0) < WARNING_THROTTLE_MS) return
  lastWarningAt.set(warningKey, now)

  Sentry.withScope((scope) => {
    scope.setLevel('warning')
    scope.setTag('feature', 'artwork')
    scope.setTag('artwork.reason', reason)
    if (status) scope.setTag('artwork.cdn_status', String(status))
    scope.setContext('artwork', {
      host,
      pathname: artworkUrl?.pathname,
      status,
    })
    Sentry.captureMessage(`Artwork fallback used: ${reason}`)
  })
}
