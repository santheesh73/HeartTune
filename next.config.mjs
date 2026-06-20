import { withSentryConfig } from '@sentry/nextjs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const saavnApiOrigin = (process.env.NEXT_PUBLIC_SAAVN_API_URL || 'https://saavn.sumit.co').replace(/\/+$/, '')
const hasSentryAuth = Boolean(process.env.SENTRY_AUTH_TOKEN)
const sentryTunnelRoute = process.env.SENTRY_TUNNEL_ROUTE?.trim() || undefined

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  typedRoutes: false,
  allowedDevOrigins: ['127.0.0.1'],
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
  org: process.env.SENTRY_ORG || 'santheesh',
  project: process.env.SENTRY_PROJECT || 'hearttune',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Keep local/self-hosted servers from becoming an outbound Sentry proxy.
  // Deployments that need an ad-blocker-resistant tunnel can opt in explicitly.
  tunnelRoute: sentryTunnelRoute,
  sourcemaps: {
    disable: !hasSentryAuth,
    deleteSourcemapsAfterUpload: true,
  },
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
})
