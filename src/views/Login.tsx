import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Music2, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

function getFriendlyAuthMessage(message: string, mode: 'signin' | 'signup') {
  const normalized = message.toLowerCase()

  if (normalized.includes('failed to fetch')) {
    return 'Unable to reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your environment, then try again.'
  }

  if (mode === 'signin' && normalized.includes('invalid login credentials')) {
    return 'Incorrect email or password. If you already created an account, try signing in again with the right password.'
  }

  if (mode === 'signup' && normalized.includes('user already registered')) {
    return 'This email is already registered. Switch to Sign In and use your existing password.'
  }

  if (mode === 'signup' && normalized.includes('email rate limit exceeded')) {
    return 'Too many signup attempts were made for this email. Wait a few minutes, then try again, or use Sign In if this account already exists.'
  }

  if (mode === 'signin' && normalized.includes('email rate limit exceeded')) {
    return 'Too many login attempts were made. Wait a few minutes before trying again.'
  }

  return message
}

export default function Login() {
  const { login, signUp, isAuthenticated, loading, authAvailable } = useAuth()
  const location = useLocation()
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const redirectTo = location.state && typeof location.state === 'object' && 'from' in location.state
    ? String(location.state.from || '/')
    : '/'

  if (isAuthenticated) return <Navigate to={redirectTo} replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (isRegister) {
      if (!name.trim()) {
        setError('Please enter your name')
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
      const result = await signUp(name.trim(), email.trim(), password)
      if (result.error) {
        setError(getFriendlyAuthMessage(result.error, 'signup'))
      } else if (result.needsEmailConfirmation) {
        setError('Account created. Please confirm your email before signing in.')
      }
    } else {
      const result = await login(email.trim(), password)
      if (result.error) {
        setError(getFriendlyAuthMessage(result.error, 'signin'))
      }
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />
      </div>

      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="login-header">
          <motion.div
            className="login-logo"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4 }}
          >
            <img src="/favicon.png" alt="HeartTune Logo" />
          </motion.div>
          <h1>HeartTune</h1>
          <p>Feel the beat. Love the music.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {!authAvailable && (
            <p className="login-error">
              Sign-in is unavailable until Supabase is configured correctly in `.env.local` or `.env`.
            </p>
          )}

          {isRegister && (
            <div className="input-group">
              <User size={18} />
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="input-group">
            <Mail size={18} />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <Lock size={18} />
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="toggle-pass"
              onClick={() => setShowPass(!showPass)}
            >
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <p className="login-error">{error}</p>}

          <motion.button
            type="submit"
            className="login-btn"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading || !authAvailable}
          >
            {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
          </motion.button>
        </form>

        <p className="login-switch">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" onClick={() => { setIsRegister(!isRegister); setError('') }}>
            {isRegister ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </motion.div>
    </div>
  )
}
