'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { useIsMobile } from '../hooks/useIsMobile'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  )
}

export default function MobileInstallPrompt() {
  const isMobile = useIsMobile()
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)

      if (window.innerWidth <= 900 && !isStandaloneMode()) {
        setVisible(true)
      }
    }

    const handleInstalled = () => {
      setVisible(false)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  useEffect(() => {
    if (!isMobile || !installPrompt || isStandaloneMode()) {
      setVisible(false)
    }
  }, [installPrompt, isMobile])

  const handleInstall = async () => {
    if (!installPrompt) return

    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setVisible(false)
    }
    setInstallPrompt(null)
  }

  if (!isMobile || !installPrompt || !visible) return null

  return (
    <div className="mobile-install-prompt" role="dialog" aria-label="Install HeartTune app">
      <button
        type="button"
        className="mobile-install-close"
        onClick={() => setVisible(false)}
        aria-label="Close install prompt"
      >
        <X size={18} />
      </button>
      <img src="/favicon.png" alt="" className="mobile-install-logo" />
      <div className="mobile-install-copy">
        <strong>Install HeartTune</strong>
        <span>Add it to your phone for a full-screen app experience.</span>
      </div>
      <button type="button" className="mobile-install-action" onClick={() => void handleInstall()}>
        <Download size={18} />
        <span>Install</span>
      </button>
    </div>
  )
}
