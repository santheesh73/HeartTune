import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type ThemeColor = 'rose' | 'spotify' | 'apple' | 'tidal' | 'gold' | 'violet'

interface ThemeContextType {
  theme: ThemeColor
  setTheme: (theme: ThemeColor) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const THEMES = {
  rose: {
    label: 'HeartTune Rose',
    primary: '#e11d48',
    dark: '#9f1239',
    glow: 'rgba(225, 29, 72, 0.35)',
    soft: 'rgba(225, 29, 72, 0.12)'
  },
  spotify: {
    label: 'Mint Green',
    primary: '#1db954',
    dark: '#14833b',
    glow: 'rgba(29, 185, 84, 0.35)',
    soft: 'rgba(29, 185, 84, 0.12)'
  },
  apple: {
    label: 'Classic Pink',
    primary: '#fa243c',
    dark: '#b31527',
    glow: 'rgba(250, 36, 60, 0.35)',
    soft: 'rgba(250, 36, 60, 0.12)'
  },
  tidal: {
    label: 'Neon Cyan',
    primary: '#00ffff',
    dark: '#00b3b3',
    glow: 'rgba(0, 255, 255, 0.35)',
    soft: 'rgba(0, 255, 255, 0.12)'
  },
  gold: {
    label: 'Premium Gold',
    primary: '#fbbf24',
    dark: '#b45309',
    glow: 'rgba(251, 191, 36, 0.35)',
    soft: 'rgba(251, 191, 36, 0.12)'
  },
  violet: {
    label: 'Deep Violet',
    primary: '#8b5cf6',
    dark: '#5b21b6',
    glow: 'rgba(139, 92, 246, 0.35)',
    soft: 'rgba(139, 92, 246, 0.12)'
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeColor>('rose')

  useEffect(() => {
    const saved = localStorage.getItem('hearttune_theme') as ThemeColor
    if (saved && THEMES[saved]) {
      setThemeState(saved)
    }
  }, [])

  const setTheme = (newTheme: ThemeColor) => {
    setThemeState(newTheme)
    localStorage.setItem('hearttune_theme', newTheme)
  }

  useEffect(() => {
    const root = document.documentElement
    const colors = THEMES[theme]
    
    // Override the globally defined variables in index.css
    root.style.setProperty('--red-primary', colors.primary)
    root.style.setProperty('--red-dark', colors.dark)
    root.style.setProperty('--red-glow', colors.glow)
    root.style.setProperty('--red-soft', colors.soft)
    
    // Some inline components might use --color-primary
    root.style.setProperty('--color-primary', colors.primary)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
