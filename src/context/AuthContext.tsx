import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => boolean
  register: (name: string, email: string, password: string) => boolean
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

const USERS_KEY = 'heartwave-users'
const SESSION_KEY = 'heartwave-session'

interface StoredUser extends User {
  password: string
}

function loadUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
  } catch {
    return []
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const session = localStorage.getItem(SESSION_KEY)
    if (session) {
      try {
        setUser(JSON.parse(session))
      } catch {
        localStorage.removeItem(SESSION_KEY)
      }
    }
  }, [])

  const login = (email: string, password: string) => {
    const users = loadUsers()
    const found = users.find((u) => u.email === email && u.password === password)
    if (!found) return false
    const { password: _, ...userData } = found
    setUser(userData)
    localStorage.setItem(SESSION_KEY, JSON.stringify(userData))
    return true
  }

  const register = (name: string, email: string, password: string) => {
    const users = loadUsers()
    if (users.some((u) => u.email === email)) return false
    const newUser: StoredUser = {
      id: crypto.randomUUID(),
      name,
      email,
      password,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    }
    users.push(newUser)
    saveUsers(users)
    const { password: _, ...userData } = newUser
    setUser(userData)
    localStorage.setItem(SESSION_KEY, JSON.stringify(userData))
    return true
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(SESSION_KEY)
  }

  return (
    <AuthContext.Provider
      value={{ user, login, register, logout, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
