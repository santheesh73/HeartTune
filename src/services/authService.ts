import type { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { auditLog } from '../lib/monitoring'
import { assertNoSupabaseError, getErrorMessage, requireSupabase } from './serviceUtils'

export async function signUpUser(email: string, password: string, fullName: string) {
  const client = requireSupabase(supabase)
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/verify-email`,
      data: {
        full_name: fullName,
      },
    },
  })

  assertNoSupabaseError(error, 'Unable to create account')
  await auditLog('signup', { email })
  return data
}

export async function loginUser(email: string, password: string) {
  const client = requireSupabase(supabase)
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    await auditLog('login_failure', { email, reason: error.message })
    assertNoSupabaseError(error, 'Unable to sign in')
  }

  if (data.user && !data.user.email_confirmed_at) {
    await client.auth.signOut()
    await auditLog('login_failure', { email, reason: 'email_not_verified' })
    throw new Error('Please verify your email before signing in.')
  }

  await auditLog('login_success', { email })
  return data
}

export async function logoutUser() {
  const client = requireSupabase(supabase)
  const { error } = await client.auth.signOut()
  assertNoSupabaseError(error, 'Unable to sign out')
}

export async function getCurrentUser(): Promise<SupabaseUser | null> {
  const client = requireSupabase(supabase)
  const { data, error } = await client.auth.getUser()
  assertNoSupabaseError(error, 'Unable to get current user')
  return data.user
}

export async function sendPasswordResetEmail(email: string) {
  let response: Response

  try {
    response = await fetch('/api/auth/password-reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ email }),
    })
  } catch (nextError) {
    const message = getNetworkFallbackMessage(nextError)

    if (!message) {
      throw nextError
    }

    const client = requireSupabase(supabase)
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    assertNoSupabaseError(error, message)
    await auditLog('password_reset', { email, fallback: 'supabase_client' })
    return
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error || 'Unable to send password reset link')
  }

  await auditLog('password_reset', { email })
}

export const sendPasswordResetCode = sendPasswordResetEmail

function getNetworkFallbackMessage(error: unknown) {
  const message = getErrorMessage(error).toLowerCase()

  if (message.includes('failed to fetch') || message.includes('networkerror')) {
    return 'Unable to reach the HeartTune reset API. Sent the reset link directly through Supabase instead.'
  }

  return ''
}

export async function verifyPasswordResetCode(email: string, code: string) {
  const client = requireSupabase(supabase)
  const token = code.replace(/\s+/g, '')
  const { data, error } = await client.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })

  assertNoSupabaseError(error, 'Invalid or expired reset code')
  await auditLog('password_reset', { email, action: 'code_verified' })
  return data
}

export async function updateUserPassword(password: string) {
  const client = requireSupabase(supabase)
  const { error } = await client.auth.updateUser({ password })
  assertNoSupabaseError(error, 'Unable to update password')
  await auditLog('password_reset', { action: 'password_updated' })
}

export async function resendVerificationEmail(email: string) {
  const client = requireSupabase(supabase)
  const { error } = await client.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/verify-email`,
    },
  })
  assertNoSupabaseError(error, 'Unable to resend verification email')
  await auditLog('email_verification', { email, action: 'resend' })
}
