import { NextResponse } from 'next/server'
import type { RateLimitResult } from './store'

export function applyRateLimitHeaders(response: NextResponse, result: RateLimitResult) {
  response.headers.set('X-RateLimit-Limit', String(result.limit))
  response.headers.set('X-RateLimit-Remaining', String(result.remaining))
  response.headers.set('X-RateLimit-Reset', String(result.reset))

  if (!result.allowed) {
    response.headers.set('Retry-After', String(result.retryAfter))
  }

  return response
}

export function createRateLimitResponse(result: RateLimitResult, reason = 'rate_limit_exceeded') {
  const response = NextResponse.json(
    {
      error: 'Too many requests',
      reason,
      retryAfter: result.retryAfter,
      reset: result.reset,
    },
    { status: 429 }
  )

  return applyRateLimitHeaders(response, result)
}

export function createBlockedResponse(reason: string) {
  return NextResponse.json(
    {
      error: 'Request blocked',
      reason,
    },
    { status: 403 }
  )
}

