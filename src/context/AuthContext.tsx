import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { getCurrentUser, loginUser, logoutUser, signUpUser } from '../services/authService'
import { createUserProfile, getProfile, updateProfile } from '../services/profileService'
import { getErrorMessage, requireSupabase } from '../services/serviceUtils'
import type { User } from '../types'

interface AuthResult {
  error: string | null
  needsEmailConfirmation?: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  authAvailable: boolean
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>
  login: (email: string, password: string) => Promise<AuthResult>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  updateAvatar: (avatarUrl: string) => Promise<AuthResult>
  updateProfileDetails: (updates: { name: string; avatarUrl?: string }) => Promise<AuthResult>
}

const AuthContext = createContext<AuthContextType | null>(null)
const SUPABASE_UNAVAILABLE_MESSAGE =
  'Unable to reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in `.env.local` or `.env`.'

function isSupabaseNetworkError(error: unknown) {
  return getErrorMessage(error).toLowerCase().includes('failed to fetch')
}

function buildAvatar(name: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
}

function mapUser(session: Session | null, fullName?: string | null, avatarUrl?: string | null): User | null {
  const authUser = session?.user
  if (!authUser || !authUser.email) return null

  const fallbackName =
    fullName ||
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name ||
    authUser.email.split('@')[0]

  return {
    id: authUser.id,
    email: authUser.email,
    name: fallbackName,
    avatar: avatarUrl || buildAvatar(fallbackName),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [authAvailable, setAuthAvailable] = useState(isSupabaseConfigured)
  const [error, setError] = useState<string | null>(null)

  const hydrateSessionUser = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession)

    if (!nextSession?.user) {
      setUser(null)
      return
    }

    setUser(mapUser(nextSession))

    try {
      let profile = await getProfile(nextSession.user.id)
      const fallbackName =
        nextSession.user.user_metadata?.full_name ||
        nextSession.user.user_metadata?.name ||
        nextSession.user.email?.split('@')[0] ||
        'HeartTune User'

      if (!profile) {
        profile = await createUserProfile(nextSession.user.id, {
          full_name: fallbackName,
          username: nextSession.user.email?.split('@')[0] || fallbackName,
          avatar_url: buildAvatar(fallbackName),
        })
      }

      setUser(mapUser(nextSession, profile.full_name, profile.avatar_url))
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Unable to load your profile'))
    }
  }, [])

  const refreshUser = useCallback(async () => {
    if (!authAvailable || !isSupabaseConfigured || !supabase) {
      setSession(null)
      setUser(null)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const client = requireSupabase(supabase)
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        setSession(null)
        setUser(null)
        return
      }

      const { data, error: sessionError } = await client.auth.getSession()
      if (sessionError) throw sessionError
      await hydrateSessionUser(data.session)
    } catch (nextError) {
      if (isSupabaseNetworkError(nextError)) {
        setAuthAvailable(false)
        setError(SUPABASE_UNAVAILABLE_MESSAGE)
        setUser(null)
        return
      }
      setError(getErrorMessage(nextError, 'Unable to restore session'))
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [authAvailable, hydrateSessionUser])

  useEffect(() => {
    if (!authAvailable || !isSupabaseConfigured || !supabase) return

    let mounted = true

    const init = async () => {
      try {
        const client = requireSupabase(supabase)
        const { data, error: sessionError } = await client.auth.getSession()
        if (sessionError) throw sessionError
        if (!mounted) return
        await hydrateSessionUser(data.session)
      } catch (nextError) {
        if (mounted) {
          if (isSupabaseNetworkError(nextError)) {
            setAuthAvailable(false)
            setError(SUPABASE_UNAVAILABLE_MESSAGE)
            setUser(null)
            return
          }
          setError(getErrorMessage(nextError, 'Unable to restore session'))
          setUser(null)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void init()

    const {
      data: { subscription },
    } = requireSupabase(supabase).auth.onAuthStateChange(
      (_event: AuthChangeEvent, nextSession: Session | null) => {
        void hydrateSessionUser(nextSession)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [authAvailable, hydrateSessionUser])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    setLoading(true)
    setError(null)

    if (!authAvailable) {
      setLoading(false)
      return { error: SUPABASE_UNAVAILABLE_MESSAGE }
    }

    try {
      const data = await signUpUser(email, password, name)

      if (data.user) {
        await createUserProfile(data.user.id, {
          username: email.split('@')[0],
          full_name: name,
          avatar_url: buildAvatar(name),
        })
      }

      await hydrateSessionUser(data.session)

      return {
        error: null,
        needsEmailConfirmation: !data.session,
      }
    } catch (nextError) {
      if (isSupabaseNetworkError(nextError)) {
        setAuthAvailable(false)
        setError(SUPABASE_UNAVAILABLE_MESSAGE)
        return { error: SUPABASE_UNAVAILABLE_MESSAGE }
      }
      const message = getErrorMessage(nextError, 'Unable to create account')
      setError(message)
      return { error: message }
    } finally {
      setLoading(false)
    }
  }, [authAvailable, hydrateSessionUser])

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)

    if (!authAvailable) {
      setLoading(false)
      return { error: SUPABASE_UNAVAILABLE_MESSAGE }
    }

    try {
      const data = await loginUser(email, password)
      await hydrateSessionUser(data.session)
      return { error: null }
    } catch (nextError) {
      if (isSupabaseNetworkError(nextError)) {
        setAuthAvailable(false)
        setError(SUPABASE_UNAVAILABLE_MESSAGE)
        return { error: SUPABASE_UNAVAILABLE_MESSAGE }
      }
      const message = getErrorMessage(nextError, 'Unable to sign in')
      setError(message)
      return { error: message }
    } finally {
      setLoading(false)
    }
  }, [authAvailable, hydrateSessionUser])

  const logout = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      await logoutUser()
      setSession(null)
      setUser(null)
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Unable to sign out'))
    } finally {
      setLoading(false)
    }
  }, [])

  const updateAvatar = useCallback(async (avatarUrl: string) => {
    if (!session?.user) {
      return { error: 'Please sign in to update your avatar.' }
    }

    if (!authAvailable) {
      return { error: SUPABASE_UNAVAILABLE_MESSAGE }
    }

    setError(null)

    try {
      const fallbackName =
        user?.name ||
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        session.user.email?.split('@')[0] ||
        'HeartTune User'

      const nextAvatar = avatarUrl.trim()
      const existingProfile = await getProfile(session.user.id)
      const profile = existingProfile
        ? await updateProfile(session.user.id, {
            avatar_url: nextAvatar || null,
          })
        : await createUserProfile(session.user.id, {
            full_name: fallbackName,
            username: session.user.email?.split('@')[0] || fallbackName,
            avatar_url: nextAvatar || buildAvatar(fallbackName),
          })

      setUser(mapUser(session, profile.full_name, profile.avatar_url))
      return { error: null }
    } catch (nextError) {
      if (isSupabaseNetworkError(nextError)) {
        setAuthAvailable(false)
        setError(SUPABASE_UNAVAILABLE_MESSAGE)
        return { error: SUPABASE_UNAVAILABLE_MESSAGE }
      }

      const message = getErrorMessage(nextError, 'Unable to update avatar')
      setError(message)
      return { error: message }
    }
  }, [authAvailable, session, user])

  const updateProfileDetails = useCallback(async ({ name, avatarUrl }: { name: string; avatarUrl?: string }) => {
    if (!session?.user) {
      return { error: 'Please sign in to update your profile.' }
    }

    if (!authAvailable) {
      return { error: SUPABASE_UNAVAILABLE_MESSAGE }
    }

    const trimmedName = name.trim()
    if (!trimmedName) {
      return { error: 'Please enter your name.' }
    }

    setError(null)

    try {
      const emailPrefix = session.user.email?.split('@')[0] || trimmedName
      const existingProfile = await getProfile(session.user.id)
      const shouldRefreshGeneratedAvatar =
        existingProfile?.avatar_url?.includes('api.dicebear.com') ||
        (!existingProfile?.avatar_url && !avatarUrl)
      const nextAvatar =
        avatarUrl?.trim() ||
        (shouldRefreshGeneratedAvatar ? buildAvatar(trimmedName) : existingProfile?.avatar_url || buildAvatar(trimmedName))

      const profile = existingProfile
        ? await updateProfile(session.user.id, {
            full_name: trimmedName,
            username: emailPrefix,
            avatar_url: nextAvatar,
          })
        : await createUserProfile(session.user.id, {
            full_name: trimmedName,
            username: emailPrefix,
            avatar_url: nextAvatar,
          })

      setUser(mapUser(session, profile.full_name, profile.avatar_url))
      return { error: null }
    } catch (nextError) {
      if (isSupabaseNetworkError(nextError)) {
        setAuthAvailable(false)
        setError(SUPABASE_UNAVAILABLE_MESSAGE)
        return { error: SUPABASE_UNAVAILABLE_MESSAGE }
      }

      const message = getErrorMessage(nextError, 'Unable to update profile')
      setError(message)
      return { error: message }
    }
  }, [authAvailable, session])

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      isAuthenticated: !!session?.user,
      authAvailable,
      signUp,
      login,
      logout,
      refreshUser,
      updateAvatar,
      updateProfileDetails,
    }),
    [authAvailable, error, loading, logout, refreshUser, session?.user, signUp, login, updateAvatar, updateProfileDetails, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
