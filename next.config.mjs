import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const saavnApiOrigin = (process.env.NEXT_PUBLIC_SAAVN_API_URL || 'https://saavn.sumit.co').replace(/\/+$/, '')

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

export default nextConfig
