import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type AppLanguage =
  | 'all'
  | 'hindi'
  | 'tamil'
  | 'telugu'
  | 'malayalam'
  | 'kannada'
  | 'punjabi'
  | 'english'

const STORAGE_KEY = 'hearttune-language'

const LanguageContext = createContext<{
  language: AppLanguage
  setLanguage: (lang: AppLanguage) => void
  languages: { id: AppLanguage; label: string }[]
} | null>(null)

const LANGUAGES: { id: AppLanguage; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'hindi', label: 'Hindi' },
  { id: 'tamil', label: 'Tamil' },
  { id: 'telugu', label: 'Telugu' },
  { id: 'malayalam', label: 'Malayalam' },
  { id: 'kannada', label: 'Kannada' },
  { id: 'punjabi', label: 'Punjabi' },
  { id: 'english', label: 'English' },
]

function isAppLanguage(v: unknown): v is AppLanguage {
  return typeof v === 'string' && LANGUAGES.some((l) => l.id === v)
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    if (typeof window === 'undefined') return 'all'
    const saved = localStorage.getItem(STORAGE_KEY)
    return isAppLanguage(saved) ? saved : 'all'
  })

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang)
    localStorage.setItem(STORAGE_KEY, lang)
  }

  const value = useMemo(
    () => ({ language, setLanguage, languages: LANGUAGES }),
    [language]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
