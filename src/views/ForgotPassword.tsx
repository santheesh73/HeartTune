import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { sendPasswordResetEmail } from '../services/authService'
import { getErrorMessage } from '../services/serviceUtils'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setStatus('')
    setLoading(true)

    try {
      await sendPasswordResetEmail(email.trim())
      setStatus('HeartTune password reset link sent. Open the newest HeartTune music app email and click Reset HeartTune password.')
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
          <h1>Reset password</h1>
          <p>Enter your account email and HeartTune will send a password reset link.</p>
        </div>
        <div className="input-group">
          <Mail size={18} />
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        {status && <p className="login-success">{status}</p>}
        {error && <p className="login-error">{error}</p>}
        <button className="login-btn" disabled={loading}>
          {loading ? 'Please wait...' : 'Send reset link'}
        </button>
        <p className="login-switch compact-auth-link"><Link to="/login">Back to sign in</Link></p>
      </form>
    </div>
  )
}
