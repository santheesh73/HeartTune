import { withSentryConfig } from '@sentry/nextjs';
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const saavnApiOrigin = (process.env.NEXT_PUBLIC_SAAVN_API_URL || 'https://saavn.sumit.co').replace(/\/+$/, '')
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : 'https://*.supabase.co'

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      process.env.NODE_ENV === 'production' ? "script-src 'self'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      process.env.NODE_ENV === 'production' ? "script-src-elem 'self'" : "script-src-elem 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.scdn.co https://*.jiosaavn.com https://c.saavncdn.com https://api.dicebear.com",
      "font-src 'self' data:",
      `connect-src 'self' ${process.env.NODE_ENV === 'production' ? '' : 'ws: wss:'} ${supabaseOrigin} https://*.supabase.co wss://*.supabase.co ${saavnApiOrigin} https://saavn.sumit.co https://api.dicebear.com https://*.ingest.sentry.io https://*.sentry.io`,
      "media-src 'self' blob: https://*.jiosaavn.com https://c.saavncdn.com",
      "worker-src 'self'",
      "manifest-src 'self'",
      'upgrade-insecure-requests',
    ].join('; '),
  },
  {
    key: 'Strict-Transport-Security',
    value: process.env.NODE_ENV === 'production' ? 'max-age=63072000; includeSubDomains; preload' : 'max-age=0',
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

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  typedRoutes: false,
  turbopack: {
    root: projectRoot,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${saavnApiOrigin}/api/:path*`,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/service-worker.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "santheesh",

  project: "hearttune",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
