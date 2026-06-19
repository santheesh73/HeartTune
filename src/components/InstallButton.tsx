'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface InstallButtonProps {
  className?: string
  compact?: boolean
}

interface UserAgentDataWithBrands {
  brands?: Array<{ brand: string; version: string }>
  mobile?: boolean
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  )
}

function isDesktopChrome() {
  if (typeof window === 'undefined') return false

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  const desktopWidth = window.matchMedia('(min-width: 901px)').matches
  const userAgent = window.navigator.userAgent
  const userAgentData = (window.navigator as Navigator & {
    userAgentData?: UserAgentDataWithBrands
  }).userAgentData

  if (!finePointer || !desktopWidth || userAgentData?.mobile) return false

  const brandNames = userAgentData?.brands?.map((brand) => brand.brand) || []
  if (brandNames.length) {
    return brandNames.some((brand) => brand === 'Google Chrome')
  }

  return /Chrome\//.test(userAgent) && !/Edg\/|OPR\/|Opera|Brave|CriOS|Android|Mobile/i.test(userAgent)
}

export default function InstallButton({
  className = '',
  compact = false,
}: InstallButtonProps) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [canShowInstallButton, setCanShowInstallButton] = useState(false)

  useEffect(() => {
    const supported = isDesktopChrome()
    setCanShowInstallButton(supported)
    setInstalled(isStandaloneMode())
    if (!supported) return

    // Store the install prompt event so we can trigger it from a custom button.
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    // Hide the button after a successful installation.
    const handleInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return

    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setInstalled(true)
    }
    setInstallPrompt(null)
  }

  if (!canShowInstallButton || installed || !installPrompt) return null

  return (
    <button
      type="button"
      className={`install-app-btn ${compact ? 'compact' : ''} ${className}`.trim()}
      onClick={() => void handleInstall()}
      aria-label="Install HeartTune as a desktop app"
      title="Install HeartTune"
    >
      <Download size={18} />
      <span>Install HeartTune</span>
    </button>
  )
}
