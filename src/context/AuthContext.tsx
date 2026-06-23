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
  'Offline mode is active. Your session and library changes are saved on this device.'
const LOCAL_AUTH_SESSION_KEY = 'hearttune-auth:session'
const LOCAL_AUTH_USERS_KEY = 'hearttune-auth:users'

interface LocalAuthRecord {
  id: string
  email: string
  name: string
  avatar?: string
}

function isSupabaseNetworkError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase()
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('supabase is not configured')
  )
}

function buildAvatar(name: string) {
  const seed = encodeURIComponent(name || 'HeartTune User')
  return `/avatars/avatar-${(seed.length % 4) + 1}.svg`
}

function readLocalAuthUsers(): LocalAuthRecord[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(LOCAL_AUTH_USERS_KEY)
    return raw ? (JSON.parse(raw) as LocalAuthRecord[]) : []
  } catch {
    return []
  }
}

function writeLocalAuthUsers(users: LocalAuthRecord[]) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(LOCAL_AUTH_USERS_KEY, JSON.stringify(users))
  } catch {
    // Ignore storage failures so offline auth never crashes the app.
  }
}

function readLocalSession(): User | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(LOCAL_AUTH_SESSION_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

function writeLocalSession(nextUser: User | null) {
  if (typeof window === 'undefined') return

  try {
    if (nextUser) {
      window.localStorage.setItem(LOCAL_AUTH_SESSION_KEY, JSON.stringify(nextUser))
    } else {
      window.localStorage.removeItem(LOCAL_AUTH_SESSION_KEY)
    }
  } catch {
    // Ignore storage failures so auth state updates stay non-fatal.
  }
}

function upsertLocalUser(email: string, name?: string, avatar?: string): User {
  const normalizedEmail = email.trim().toLowerCase()
  const users = readLocalAuthUsers()
  const existing = users.find((item) => item.email.toLowerCase() === normalizedEmail)
  const fallbackName = name?.trim() || existing?.name || normalizedEmail.split('@')[0] || 'HeartTune User'
  const nextUser: User = {
    id: existing?.id || `local-${normalizedEmail.replace(/[^a-z0-9]+/g, '-') || Date.now()}`,
    email: normalizedEmail,
    name: fallbackName,
    avatar: avatar || existing?.avatar || buildAvatar(fallbackName),
  }

  writeLocalAuthUsers([
    nextUser,
    ...users.filter((item) => item.id !== nextUser.id && item.email.toLowerCase() !== normalizedEmail),
  ])
  writeLocalSession(nextUser)
  return nextUser
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

    const fallbackUser = mapUser(nextSession)
    setUser(fallbackUser)
    if (fallbackUser) writeLocalSession(fallbackUser)

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

      const profiledUser = mapUser(nextSession, profile.full_name, profile.avatar_url)
      setUser(profiledUser)
      if (profiledUser) writeLocalSession(profiledUser)
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Unable to load your profile'))
    }
  }, [])

  const refreshUser = useCallback(async () => {
    if (!authAvailable || !isSupabaseConfigured || !supabase) {
      setSession(null)
      setUser(readLocalSession())
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
        setError(null)
        setUser(readLocalSession())
        return
      }
      setError(getErrorMessage(nextError, 'Unable to restore session'))
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [authAvailable, hydrateSessionUser])

  useEffect(() => {
    if (!authAvailable || !isSupabaseConfigured || !supabase) {
      setSession(null)
      setUser(readLocalSession())
      setError(null)
      setLoading(false)
      return
    }

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
            setError(null)
            setUser(readLocalSession())
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
      const localUser = upsertLocalUser(email, name)
      setSession(null)
      setUser(localUser)
      setLoading(false)
      return { error: null }
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
      const localUser = upsertLocalUser(email)
      setSession(null)
      setUser(localUser)
      setLoading(false)
      return { error: null }
    }

    try {
      const data = await loginUser(email, password)
      await hydrateSessionUser(data.session)
      return { error: null }
    } catch (nextError) {
      if (isSupabaseNetworkError(nextError)) {
        setAuthAvailable(false)
        const localUser = upsertLocalUser(email)
        setSession(null)
        setUser(localUser)
        setError(null)
        return { error: null }
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
      if (authAvailable && isSupabaseConfigured && supabase) {
        await logoutUser()
      }
      writeLocalSession(null)
      setSession(null)
      setUser(null)
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Unable to sign out'))
    } finally {
      setLoading(false)
    }
  }, [authAvailable])

  const updateAvatar = useCallback(async (avatarUrl: string) => {
    if (!session?.user) {
      if (user) {
        const nextUser = upsertLocalUser(user.email, user.name, avatarUrl.trim() || buildAvatar(user.name))
        setUser(nextUser)
        return { error: null }
      }
      return { error: 'Please sign in to update your avatar.' }
    }

    if (!authAvailable) {
      if (user) {
        const nextUser = upsertLocalUser(user.email, user.name, avatarUrl.trim() || buildAvatar(user.name))
        setUser(nextUser)
        return { error: null }
      }
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
      if (user) {
        const nextUser = upsertLocalUser(user.email, name, avatarUrl || user.avatar)
        setUser(nextUser)
        return { error: null }
      }
      return { error: 'Please sign in to update your profile.' }
    }

    if (!authAvailable) {
      if (user) {
        const nextUser = upsertLocalUser(user.email, name, avatarUrl || user.avatar)
        setUser(nextUser)
        return { error: null }
      }
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
        const localUser = upsertLocalUser(
          session.user.email || user?.email || 'local@hearttune.offline',
          trimmedName,
          avatarUrl || user?.avatar
        )
        setSession(null)
        setUser(localUser)
        setError(null)
        return { error: null }
      }

      const message = getErrorMessage(nextError, 'Unable to update profile')
      setError(message)
      return { error: message }
    }
  }, [authAvailable, session, user])

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      isAuthenticated: !!user,
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
