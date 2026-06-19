import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { assessRequest } from './bot'
import { BURST_RATE_LIMIT, classifyRateLimitRoute, getGlobalRule } from './config'
import { getRequestIdentity } from './identity'
import { applyRateLimitHeaders, createBlockedResponse, createRateLimitResponse } from './response'
import { checkSlidingWindowLimit } from './store'

function shouldRateLimit(pathname: string) {
  return (
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname.includes('password-reset') ||
    pathname.includes('reset-password') ||
    pathname.includes('email-verification') ||
    pathname.includes('verify-email')
  )
}

function logSecurityEvent(type: string, details: Record<string, unknown>) {
  console.warn(
    JSON.stringify({
      type,
      at: new Date().toISOString(),
      ...details,
    })
  )
}

export async function enforceRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const { pathname, searchParams } = request.nextUrl

  if (!shouldRateLimit(pathname)) return null

  const identity = getRequestIdentity(request)
  const botAssessment = assessRequest(request.headers, pathname)

  if (botAssessment.blocked) {
    logSecurityEvent('request_blocked', {
      ip: identity.ip,
      fingerprint: identity.fingerprint,
      pathname,
      score: botAssessment.score,
      reasons: botAssessment.reasons,
    })
    return createBlockedResponse(botAssessment.reasons.join(',') || 'suspicious_request')
  }

  if (identity.role === 'admin') return null

  const burstResult = await checkSlidingWindowLimit(
    'burst',
    `fp:${identity.fingerprint}`,
    BURST_RATE_LIMIT.limit,
    BURST_RATE_LIMIT.windowSeconds
  )

  if (!burstResult.allowed) {
    logSecurityEvent('rate_limit_exceeded', {
      category: 'burst',
      ip: identity.ip,
      fingerprint: identity.fingerprint,
      pathname,
    })
    return createRateLimitResponse(burstResult, 'burst_limit_exceeded')
  }

  const globalRule = getGlobalRule(identity.role)
  const globalIdentifier = identity.userId ? `user:${identity.userId}` : `ip:${identity.ip}`
  let lastResult = burstResult

  if (globalRule) {
    const globalResult = await checkSlidingWindowLimit(
      'global',
      globalIdentifier,
      globalRule.limit,
      globalRule.windowSeconds
    )

    lastResult = globalResult

    if (!globalResult.allowed) {
      logSecurityEvent('rate_limit_exceeded', {
        category: 'global',
        role: identity.role,
        ip: identity.ip,
        userId: identity.userId,
        pathname,
      })
      return createRateLimitResponse(globalResult, 'global_limit_exceeded')
    }
  }

  const routePolicy = classifyRateLimitRoute(pathname, searchParams)

  if (routePolicy) {
    const routeIdentifier =
      routePolicy.keyScope === 'userOrIp' && identity.userId
        ? `user:${identity.userId}`
        : `ip:${identity.ip}`
    const routeResult = await checkSlidingWindowLimit(
      routePolicy.category,
      routeIdentifier,
      routePolicy.limit,
      routePolicy.windowSeconds
    )

    lastResult = routeResult

    if (!routeResult.allowed) {
      logSecurityEvent('rate_limit_exceeded', {
        category: routePolicy.category,
        role: identity.role,
        ip: identity.ip,
        userId: identity.userId,
        pathname,
      })
      return createRateLimitResponse(routeResult, `${routePolicy.category}_limit_exceeded`)
    }
  }

  return applyRateLimitHeaders(NextResponse.next(), lastResult)
}

