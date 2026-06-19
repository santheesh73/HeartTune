export interface PasswordCheck {
  label: string
  passed: boolean
}

export function getPasswordChecks(password: string): PasswordCheck[] {
  return [
    { label: '10 characters', passed: password.length >= 10 },
    { label: 'uppercase letter', passed: /[A-Z]/.test(password) },
    { label: 'lowercase letter', passed: /[a-z]/.test(password) },
    { label: 'number', passed: /\d/.test(password) },
    { label: 'special character', passed: /[^A-Za-z0-9]/.test(password) },
  ]
}

export function validatePassword(password: string) {
  const checks = getPasswordChecks(password)
  const missing = checks.filter((check) => !check.passed).map((check) => check.label)

  return {
    valid: missing.length === 0,
    checks,
    message: missing.length ? `Password must include ${missing.join(', ')}.` : null,
    score: checks.filter((check) => check.passed).length,
  }
}
