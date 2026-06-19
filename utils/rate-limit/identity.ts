import type { NextRequest } from 'next/server'
import type { RateLimitRole } from './config'

export interface RequestIdentity {
  ip: string
  fingerprint: string
  role: RateLimitRole
  userId: string | null
}

function normalizeIp(value: string | null) {
  if (!value) return 'unknown'
  return value.split(',')[0]?.trim() || 'unknown'
}

function base64UrlDecode(value: string) {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    return atob(padded)
  } catch {
    return null
  }
}

function parseJwtPayload(token: string) {
  const [, payload] = token.split('.')
  if (!payload) return null

  const decoded = base64UrlDecode(payload)
  if (!decoded) return null

  try {
    return JSON.parse(decoded) as {
      sub?: string
      role?: string
      app_metadata?: Record<string, unknown>
      user_metadata?: Record<string, unknown>
    }
  } catch {
    return null
  }
}

function extractJwtCandidates(value: string) {
  const decoded = decodeURIComponent(value)
  return decoded.match(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g) || []
}

function roleFromPayload(payload: ReturnType<typeof parseJwtPayload>): RateLimitRole {
  if (!payload?.sub) return 'anonymous'

  const appRole = payload.app_metadata?.role
  const userRole = payload.user_metadata?.role
  const isAdmin = appRole === 'admin' || userRole === 'admin' || payload.role === 'admin'
  const isPremium = payload.app_metadata?.plan === 'premium' || payload.user_metadata?.plan === 'premium'

  if (isAdmin) return 'admin'
  if (isPremium) return 'premium'
  return 'authenticated'
}

function extractUserFromCookies(request: NextRequest) {
  for (const cookie of request.cookies.getAll()) {
    const candidates = extractJwtCandidates(cookie.value)

    for (const candidate of candidates) {
      const payload = parseJwtPayload(candidate)
      if (payload?.sub) {
        return {
          userId: payload.sub,
          role: roleFromPayload(payload),
        }
      }
    }
  }

  return {
    userId: null,
    role: 'anonymous' as RateLimitRole,
  }
}

function hashString(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }

  return (hash >>> 0).toString(36)
}

export function getRequestIdentity(request: NextRequest): RequestIdentity {
  const ip = normalizeIp(
    request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip')
  )
  const { userId, role } = extractUserFromCookies(request)
  const userAgent = request.headers.get('user-agent') || ''
  const acceptLanguage = request.headers.get('accept-language') || ''
  const fingerprint = hashString(`${ip}|${userAgent}|${acceptLanguage}`)

  return {
    ip,
    fingerprint,
    role,
    userId,
  }
}

