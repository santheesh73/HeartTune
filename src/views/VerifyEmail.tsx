import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { resendVerificationEmail } from '../services/authService'
import { getErrorMessage } from '../services/serviceUtils'

export default function VerifyEmail() {
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
      await resendVerificationEmail(email.trim())
      setStatus('Verification email sent. Open the newest link before signing in.')
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Unable to send verification email'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page auth-flow-page">
      <form className="login-card login-form" onSubmit={submit}>
        <div className="login-header">
          <h1>Verify email</h1>
          <p>Confirm your email to unlock HeartTune.</p>
        </div>
        <div className="input-group">
          <Mail size={18} />
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        {status && <p className="login-success">{status}</p>}
        {error && <p className="login-error">{error}</p>}
        <button className="login-btn" disabled={loading}>
          {loading ? 'Sending...' : 'Resend verification'}
        </button>
        <p className="login-switch compact-auth-link"><Link to="/login">Back to sign in</Link></p>
      </form>
    </div>
  )
}
