'use client'

import dynamic from 'next/dynamic'
import PWARegistration from './PWARegistration'
import AppLogoLoader from './AppLogoLoader'

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
