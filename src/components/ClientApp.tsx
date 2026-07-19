'use client'

import dynamic from 'next/dynamic'
import PWARegistration from './PWARegistration'
import AppLogoLoader from './AppLogoLoader'

if (typeof window !== 'undefined') {

  // Next.js dev overlay captures console.error. We want offline mode to be graceful,
  // so we hide the Supabase fetch errors that it automatically logs.
  const originalConsoleError = console.error
  console.error = function (...args) {
    const isNetworkError = args.some((arg) => 
      (typeof arg === 'string' && (arg.includes('Failed to fetch') || arg.includes('API request failed'))) ||
      (arg && typeof arg === 'object' && arg.message && (arg.message.includes('Failed to fetch') || arg.message.includes('API request failed'))) ||
      (arg && typeof arg === 'object' && arg.name === 'AuthRetryableFetchError')
    )
    if (isNetworkError) return

    originalConsoleError.apply(console, args)
  }
}

const App = dynamic(() => import('../App'), {
  ssr: false,
  loading: () => <AppLogoLoader />,
})

export default function ClientApp() {
  return (
    <>
      <PWARegistration />
      <App />
    </>
  )
}
