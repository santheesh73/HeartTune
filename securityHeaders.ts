import type { NextResponse } from 'next/server'

const isProduction = process.env.NODE_ENV === 'production'

const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : 'https://*.supabase.co'
const saavnOrigin = (process.env.NEXT_PUBLIC_SAAVN_API_URL || 'https://saavn.sumit.co').replace(/\/+$/, '')

export const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      isProduction ? "script-src 'self'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      isProduction ? "script-src-elem 'self'" : "script-src-elem 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.scdn.co https://*.jiosaavn.com https://c.saavncdn.com https://api.dicebear.com",
      "font-src 'self' data:",
      `connect-src 'self' ${isProduction ? '' : 'ws: wss:'} ${supabaseOrigin} https://*.supabase.co wss://*.supabase.co ${saavnOrigin} https://saavn.sumit.co https://api.dicebear.com https://*.ingest.sentry.io https://*.sentry.io`,
      "media-src 'self' blob: https://*.jiosaavn.com https://c.saavncdn.com",
      "worker-src 'self'",
      "manifest-src 'self'",
      'upgrade-insecure-requests',
    ].join('; '),
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
