import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

const securityHeaders = await read('securityHeaders.ts')
const nextConfig = await read('next.config.mjs')
const middleware = await read('middleware.ts')
const app = await read('src/App.tsx')
const authService = await read('src/services/authService.ts')
const passwordResetRoute = await read('src/app/api/auth/password-reset/route.ts')
const resetPasswordView = await read('src/views/ResetPassword.tsx')
const passwordPolicy = await read('src/utils/passwordPolicy.ts')
const apiClient = await read('src/lib/apiClient.ts')
const schema = await read('supabase/schema.sql')
const monitoring = await read('src/lib/monitoring.ts')

test('enterprise security headers are configured', () => {
  for (const header of [
    'Content-Security-Policy',
    'Strict-Transport-Security',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Referrer-Policy',
    'Permissions-Policy',
    'Cross-Origin-Resource-Policy',
    'Cross-Origin-Opener-Policy',
    'Cross-Origin-Embedder-Policy',
  ]) {
    assert.match(securityHeaders, new RegExp(header))
  }

  assert.match(
    securityHeaders,
    /script-src 'self' 'unsafe-inline' 'unsafe-eval'/
  )
  assert.match(securityHeaders, /worker-src 'self' blob:/)
  assert.match(securityHeaders, /child-src 'self' blob:/)
  assert.match(securityHeaders, /connect-src 'self'.*https:.*wss:/s)
  assert.match(securityHeaders, /https:\/\/\*\.supabase\.co/)
  assert.match(securityHeaders, /https:\/\/\*\.supabase\.in/)
  assert.match(securityHeaders, /https:\/\/\*\.ingest\.sentry\.io/)
  assert.match(securityHeaders, /https:\/\/\*\.ingest\.us\.sentry\.io/)
  assert.match(securityHeaders, /media-src 'self' blob: https:/)
  assert.doesNotMatch(nextConfig, /Content-Security-Policy/)
  assert.match(middleware, /monitoring/)
})

test('protected routes and email verification are enforced in middleware', () => {
  for (const route of ['/profile', '/library', '/downloads', '/playlists', '/settings']) {
    assert.match(middleware, new RegExp(`'${route}'`))
  }

  assert.match(middleware, /email_confirmed_at/)
  assert.match(middleware, /\/verify-email/)
  assert.match(middleware, /redirectToLogin/)
})

test('password reset and email verification use Supabase flows', () => {
  assert.match(authService, /\/api\/auth\/password-reset/)
  assert.match(authService, /resetPasswordForEmail/)
  assert.match(passwordResetRoute, /resetPasswordForEmail/)
  assert.match(passwordResetRoute, /redirectTo:\s*`\$\{origin\}\/reset-password`/)
  assert.match(app, /isPasswordRecoveryUrl/)
  assert.match(resetPasswordView, /existingSession && hasRecoveryToken/)
  assert.match(authService, /verifyOtp/)
  assert.match(authService, /updateUser\(\{ password \}\)/)
  assert.match(authService, /auth\.resend/)
  assert.match(authService, /emailRedirectTo/)
  assert.match(passwordPolicy, /password\.length >= 10/)
  assert.match(passwordPolicy, /\[A-Z\]/)
  assert.match(passwordPolicy, /\[a-z\]/)
  assert.match(passwordPolicy, /\\d/)
  assert.match(passwordPolicy, /\[\^A-Za-z0-9\]/)
})

test('external API client validates origins, timeouts, retries, and circuit breaker state', () => {
  assert.match(apiClient, /DEFAULT_TIMEOUT_MS = 10_000/)
  assert.match(apiClient, /AbortController/)
  assert.match(apiClient, /retries = 1/)
  assert.match(apiClient, /CIRCUIT_FAILURE_THRESHOLD/)
  assert.match(apiClient, /Blocked request to unauthorized origin/)
  assert.match(apiClient, /validate/)
})

test('RLS policies include ownership checks and audit logging table', () => {
  assert.match(schema, /create table if not exists public\.security_logs/)
  assert.match(schema, /alter table public\.security_logs enable row level security/)
  assert.match(schema, /security_logs_select_admin/)
  assert.match(schema, /playlists\.id = playlist_songs\.playlist_id/)
  assert.match(schema, /playlists\.user_id = auth\.uid\(\)/)
})

test('monitoring records requested security event types', () => {
  for (const event of [
    'login_success',
    'login_failure',
    'signup',
    'password_reset',
    'email_verification',
    'download_activity',
    'playlist_modification',
    'profile_update',
    'api_failure',
    'playback_failure',
    'search_failure',
  ]) {
    assert.match(monitoring, new RegExp(event))
  }
})
