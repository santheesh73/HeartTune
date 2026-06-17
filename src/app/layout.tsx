import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '../index.css'

export const metadata: Metadata = {
  applicationName: 'HeartTune',
  title: 'HeartTune',
  description: 'Feel the beat. Love the music.',
  // The static manifest lives in /public so browsers can discover install metadata.
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.png', sizes: '215x197', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.svg'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'HeartTune',
  },
}

export const viewport: Viewport = {
  themeColor: '#e11d48',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
