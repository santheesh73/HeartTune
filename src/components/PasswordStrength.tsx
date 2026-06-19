import { validatePassword } from '../utils/passwordPolicy'

export default function PasswordStrength({ password }: { password: string }) {
  const { checks, score } = validatePassword(password)
  const width = `${(score / checks.length) * 100}%`

  return (
    <div className="password-strength">
      <div className="password-strength-track">
        <span style={{ width }} />
      </div>
      <div className="password-checks">
        {checks.map((check) => (
          <span key={check.label} className={check.passed ? 'passed' : ''}>
            {check.label}
          </span>
        ))}
      </div>
    </div>
  )
}
