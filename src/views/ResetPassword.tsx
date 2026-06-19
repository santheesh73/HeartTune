import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import PasswordStrength from '../components/PasswordStrength'
import { supabase } from '../lib/supabase'
import { sendPasswordResetEmail, updateUserPassword } from '../services/authService'
import { getErrorMessage } from '../services/serviceUtils'
import { validatePassword } from '../utils/passwordPolicy'

function getRecoveryTokens() {
  const params = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))

  return {
    code: params.get('code'),
    tokenHash: params.get('token_hash') || hash.get('token_hash'),
    type: params.get('type') || hash.get('type'),
    accessToken: hash.get('access_token') || params.get('access_token'),
    refreshToken: hash.get('refresh_token') || params.get('refresh_token'),
  }
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    let mounted = true

    const prepareRecoverySession = async () => {
      if (!supabase) {
        if (mounted) {
          setError('Supabase is not configured.')
          setSessionLoading(false)
        }
        return
      }

      try {
        const { code, tokenHash, type, accessToken, refreshToken } = getRecoveryTokens()
        const hasRecoveryToken = Boolean(code || tokenHash || (accessToken && refreshToken))

        const {
          data: { session: existingSession },
          error: existingSessionError,
        } = await supabase.auth.getSession()

        if (existingSessionError) throw existingSessionError

        if (existingSession && hasRecoveryToken) {
          navigate('/reset-password', { replace: true })
        } else if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
          navigate('/reset-password', { replace: true })
        } else if (tokenHash && type === 'recovery') {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          })
          if (verifyError) throw verifyError
          navigate('/reset-password', { replace: true })
        } else if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (sessionError) throw sessionError
          navigate('/reset-password', { replace: true })
        }

        const {
          data: { session },
          error: currentSessionError,
        } = await supabase.auth.getSession()

        if (currentSessionError) throw currentSessionError

        if (mounted) {
          setSessionReady(Boolean(session))
          if (!session) {
            setError('This page needs the newest reset link from your HeartTune email. Request a new reset link, then open it in the same browser.')
          }
        }
      } catch (nextError) {
        if (mounted) {
          setSessionReady(false)
          setError(getErrorMessage(nextError, 'Reset link is invalid, expired, already used, or not allowed by Supabase redirect settings. Request a new HeartTune reset link.'))
        }
      } finally {
        if (mounted) setSessionLoading(false)
      }
    }

    void prepareRecoverySession()

    return () => {
      mounted = false
    }
  }, [navigate])

  if (saved) return <Navigate to="/" replace />

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    const validation = validatePassword(password)
    if (!validation.valid) {
      setError(validation.message || 'Please choose a stronger password.')
      return
    }

    setLoading(true)
    try {
      if (!sessionReady) {
        throw new Error('This page needs the reset link from your email. Go back, send a new reset email, then open the newest HeartTune reset link.')
      }
      await updateUserPassword(password)
      setSaved(true)
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Unable to update password. Use the latest reset link.'))
    } finally {
      setLoading(false)
    }
  }

  const resendResetLink = async () => {
    setError('')
    setStatus('')

    if (!email.trim()) {
      setError('Enter your email to receive a new HeartTune reset link.')
      return
    }

    setLoading(true)
    try {
      await sendPasswordResetEmail(email.trim())
      setStatus('New HeartTune reset link sent. Open the newest email, then save your password.')
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Unable to send reset link'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page auth-flow-page">
      <form className="login-card login-form" onSubmit={submit}>
        <div className="login-header">
          <h1>New password</h1>
          <p>Use the latest reset link from your email.</p>
        </div>
        <div className="input-group">
          <Lock size={18} />
          <input
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button type="button" className="toggle-pass" onClick={() => setShowPass(!showPass)}>
            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <PasswordStrength password={password} />
        {!sessionReady && !sessionLoading && (
          <div className="reset-link-helper">
            <div className="input-group">
              <Mail size={18} />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <button type="button" className="secondary-auth-btn" onClick={resendResetLink} disabled={loading}>
              Send new reset link
            </button>
          </div>
        )}
        {status && <p className="login-success">{status}</p>}
        {error && <p className="login-error">{error}</p>}
        <button className="login-btn" disabled={loading || sessionLoading || !sessionReady}>
          {sessionLoading ? 'Checking link...' : loading ? 'Saving...' : 'Save password'}
        </button>
        <p className="login-switch compact-auth-link"><Link to="/login">Back to sign in</Link></p>
      </form>
    </div>
  )
}
