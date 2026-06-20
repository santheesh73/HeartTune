export type SecurityEventType =
  | 'login_success'
  | 'login_failure'
  | 'signup'
  | 'password_reset'
  | 'email_verification'
  | 'download_activity'
  | 'playlist_modification'
  | 'profile_update'
  | 'api_failure'
  | 'playback_failure'
  | 'search_failure'

export async function captureAppError(error: unknown, context: Record<string, unknown> = {}) {
  const sentry = await import('@sentry/nextjs').catch(() => null)
  if (sentry) {
    sentry.captureException(error, { extra: context })
  }
}

export async function auditLog(eventType: SecurityEventType, metadata: Record<string, unknown> = {}) {
  try {
    const { supabase } = await import('./supabase')
    if (!supabase) return

    // Audit logging is best-effort and must not turn every anonymous API error
    // into a second network failure. getSession() reads the persisted session;
    // getUser() always contacts Supabase, even when nobody is signed in.
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.user) return

    const { error } = await supabase.from('security_logs').insert({
      user_id: session.user.id,
      event_type: eventType,
      metadata: metadata as Json,
    })

    if (error) {
      await captureAppError(error, { eventType, metadata })
    }
  } catch {
    // Monitoring must never affect the user-facing request or flood the Next.js
    // development error overlay when the logging backend is unavailable.
  }
}
import type { Json } from '../types/database'
