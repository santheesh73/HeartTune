import type { NextResponse } from 'next/server'

const isProduction = process.env.NODE_ENV === 'production'

function getOrigin(value: string | undefined) {
  if (!value) return ''

  try {
    return new URL(value).origin
  } catch {
    return value.replace(/\/+$/, '')
  }
}

const supabaseOrigin = getOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL)
const saavnOrigin = getOrigin(process.env.NEXT_PUBLIC_SAAVN_API_URL || 'https://saavn.sumit.co')

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "media-src 'self' blob: https:",
  [
    "connect-src 'self'",
    'https:',
    'wss:',
    supabaseOrigin,
    'https://*.supabase.co',
    'https://*.supabase.in',
    'wss://*.supabase.co',
    'wss://*.supabase.in',
    saavnOrigin,
    'https://*.ingest.sentry.io',
    'https://*.ingest.us.sentry.io',
    'https://*.ingest.de.sentry.io',
    'https://*.ingest.eu.sentry.io',
    'https://*.sentry.io',
  ].filter(Boolean).join(' '),
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  isProduction ? 'upgrade-insecure-requests' : '',
].filter(Boolean).join('; ')

export const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: csp,
  },
  {
    key: 'Strict-Transport-Security',
    value: isProduction ? 'max-age=63072000; includeSubDomains; preload' : 'max-age=0',
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
]

export function applySecurityHeaders(response: NextResponse) {
  for (const { key, value } of securityHeaders) {
    response.headers.set(key, value)
  }

  return response
}
