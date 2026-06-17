'use client'

import dynamic from 'next/dynamic'
import PWARegistration from './PWARegistration'

const App = dynamic(() => import('../App'), {
  ssr: false,
})

export default function ClientApp() {
  return (
    <>
      <PWARegistration />
      <App />
    </>
  )
}
