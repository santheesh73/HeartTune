# HeartWave Security

## Security Architecture

HeartWave uses Next.js middleware as the first security boundary. Middleware applies security headers, route guards, email-verification enforcement, bot scoring, burst limits, and sliding-window rate limits backed by Upstash Redis.

## Authentication Flow

Supabase Auth handles signup, login, password reset, and email verification. Users cannot sign in successfully until `email_confirmed_at` is present, and protected routes redirect unverified users to `/verify-email`.
HeartTune-branded Supabase email templates are stored in `supabase/email-templates/` and should be pasted into the Supabase Auth email template settings before production launch.

## Authorization Model

Client access uses the Supabase publishable key only. Row Level Security is enabled for profiles, liked songs, playlists, playlist songs, recently played songs, downloads, and security logs. `playlist_songs` insert/update/delete now verifies that the parent playlist belongs to `auth.uid()`.

## Rate Limiting Strategy

Global limits:

- Anonymous: 100 requests per 15 minutes
- Authenticated: 500 requests per 15 minutes
- Premium: 2000 requests per 15 minutes

Route limits:

- Login: 5 attempts per 15 minutes
- Password reset: 3 attempts per hour
- Search: 30 requests per minute
- Streaming: 100 requests per hour
- Downloads: 20 requests per hour

429 responses include `Retry-After`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`.

## Monitoring Setup

Sentry browser and server configs are provided. Configure `NEXT_PUBLIC_SENTRY_DSN` and optional sampling variables before deployment. The app records authentication, API, search, playback, download, playlist, and profile failures or changes in `security_logs`.

## Incident Response

1. Review Sentry for crash and performance anomalies.
2. Query `security_logs` by `event_type`, `user_id`, and `created_at`.
3. Rotate affected Supabase, Upstash, or Sentry credentials.
4. Temporarily set `RATE_LIMIT_FAIL_CLOSED=true` during active abuse if Redis is reliable.
5. Patch, test, and redeploy through Security CI.

## Deployment Checklist

- No service-role keys in browser-visible environment variables.
- Upstash Redis configured for production rate limiting.
- Supabase migrations applied.
- Sentry DSN configured.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm audit --audit-level=high` pass.
