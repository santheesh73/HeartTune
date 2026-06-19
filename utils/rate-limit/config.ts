export type RateLimitRole = 'anonymous' | 'authenticated' | 'premium' | 'admin'

export type RateLimitCategory =
  | 'global'
  | 'burst'
  | 'search'
  | 'autocomplete'
  | 'suggestions'
  | 'login'
  | 'signup'
  | 'passwordReset'
  | 'emailVerification'
  | 'download'
  | 'stream'

export interface RateLimitRule {
  limit: number
  windowSeconds: number
}

export interface RoutePolicy {
  category: RateLimitCategory
  keyScope: 'ip' | 'userOrIp'
  limit: number
  windowSeconds: number
}

export const GLOBAL_RATE_LIMITS: Record<Exclude<RateLimitRole, 'admin'>, RateLimitRule> = {
  anonymous: { limit: 100, windowSeconds: 15 * 60 },
  authenticated: { limit: 500, windowSeconds: 15 * 60 },
  premium: { limit: 2000, windowSeconds: 15 * 60 },
}

export const BURST_RATE_LIMIT: RateLimitRule = {
  limit: 60,
  windowSeconds: 60,
}

export const ROUTE_RATE_LIMITS = {
  search: { limit: 30, windowSeconds: 60 },
  autocomplete: { limit: 20, windowSeconds: 60 },
  suggestions: { limit: 20, windowSeconds: 60 },
  login: { limit: 5, windowSeconds: 15 * 60 },
  signup: { limit: 3, windowSeconds: 60 * 60 },
  passwordReset: { limit: 3, windowSeconds: 60 * 60 },
  emailVerification: { limit: 5, windowSeconds: 60 * 60 },
  download: { limit: 20, windowSeconds: 60 * 60 },
  stream: { limit: 100, windowSeconds: 60 * 60 },
} satisfies Record<Exclude<RateLimitCategory, 'global' | 'burst'>, RateLimitRule>

export const RATE_LIMIT_REDIS_PREFIX =
  process.env.RATE_LIMIT_REDIS_PREFIX || 'heartwave:rate-limit'

export const RATE_LIMIT_FAIL_CLOSED =
  process.env.RATE_LIMIT_FAIL_CLOSED === 'true' && process.env.NODE_ENV === 'production'

export const SUSPICIOUS_SCORE_BLOCK_THRESHOLD = 70

export function getGlobalRule(role: RateLimitRole) {
  if (role === 'admin') return null
  return GLOBAL_RATE_LIMITS[role]
}

function numberParam(value: string | null) {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function classifyRateLimitRoute(pathname: string, searchParams: URLSearchParams): RoutePolicy | null {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/'

  if (normalizedPath === '/api/search/songs') {
    const limit = numberParam(searchParams.get('limit'))
    const query = searchParams.get('query') || ''
    const isAutocomplete = limit !== null && limit <= 8
    const isSuggestion = query.length > 0 && query.length < 3

    if (isSuggestion) {
      return { category: 'suggestions', keyScope: 'userOrIp', ...ROUTE_RATE_LIMITS.suggestions }
    }

    if (isAutocomplete) {
      return { category: 'autocomplete', keyScope: 'userOrIp', ...ROUTE_RATE_LIMITS.autocomplete }
    }

    return { category: 'search', keyScope: 'userOrIp', ...ROUTE_RATE_LIMITS.search }
  }

  if (normalizedPath === '/api/search/albums' || normalizedPath === '/api/search/playlists') {
    return { category: 'search', keyScope: 'userOrIp', ...ROUTE_RATE_LIMITS.search }
  }

  if (normalizedPath === '/api/songs') {
    return { category: 'stream', keyScope: 'userOrIp', ...ROUTE_RATE_LIMITS.stream }
  }

  if (normalizedPath.includes('/download') || normalizedPath.includes('/downloads')) {
    return { category: 'download', keyScope: 'userOrIp', ...ROUTE_RATE_LIMITS.download }
  }

  if (normalizedPath === '/auth/login' || normalizedPath === '/api/auth/login') {
    return { category: 'login', keyScope: 'ip', ...ROUTE_RATE_LIMITS.login }
  }

  if (normalizedPath === '/auth/signup' || normalizedPath === '/api/auth/signup') {
    return { category: 'signup', keyScope: 'ip', ...ROUTE_RATE_LIMITS.signup }
  }

  if (normalizedPath.includes('password-reset') || normalizedPath.includes('reset-password')) {
    return { category: 'passwordReset', keyScope: 'ip', ...ROUTE_RATE_LIMITS.passwordReset }
  }

  if (normalizedPath.includes('email-verification') || normalizedPath.includes('verify-email')) {
    return { category: 'emailVerification', keyScope: 'ip', ...ROUTE_RATE_LIMITS.emailVerification }
  }

  return null
}

