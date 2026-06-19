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

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from('security_logs').insert({
      user_id: user?.id || null,
      event_type: eventType,
      metadata: metadata as Json,
    })

    if (error) {
      await captureAppError(error, { eventType, metadata })
    }
  } catch (error) {
    console.warn('Audit log skipped:', error)
  }
}
import type { Json } from '../types/database'
