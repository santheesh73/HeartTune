import * as Sentry from '@sentry/nextjs'

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || 0.1),
    replaysSessionSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_REPLAY_SAMPLE_RATE || 0.05),
    replaysOnErrorSampleRate: 1,
    integrations: [Sentry.replayIntegration()],
    environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV,
  })
}
