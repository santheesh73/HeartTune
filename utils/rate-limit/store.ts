import { RATE_LIMIT_FAIL_CLOSED, RATE_LIMIT_REDIS_PREFIX, type RateLimitCategory } from './config'

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  reset: number
  retryAfter: number
}

interface UpstashPipelineResult<T> {
  result?: T
  error?: string
}

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) return null
  return {
    url: url.replace(/\/+$/, ''),
    token,
  }
}

function sanitizeKeyPart(value: string) {
  return value.replace(/[^a-zA-Z0-9:._-]/g, '_').slice(0, 160)
}

function buildKey(category: RateLimitCategory, identifier: string) {
  return `${RATE_LIMIT_REDIS_PREFIX}:${category}:${sanitizeKeyPart(identifier)}`
}

async function runPipeline<T>(commands: unknown[][]): Promise<Array<UpstashPipelineResult<T>>> {
  const redis = getRedisConfig()

  if (!redis) {
    if (RATE_LIMIT_FAIL_CLOSED) {
      throw new Error('Rate limiting is required, but Upstash Redis is not configured.')
    }

    return []
  }

  const response = await fetch(`${redis.url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${redis.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Upstash Redis request failed: ${response.status}`)
  }

  return (await response.json()) as Array<UpstashPipelineResult<T>>
}

export async function checkSlidingWindowLimit(
  category: RateLimitCategory,
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = now - windowSeconds * 1000
  const reset = Math.ceil((now + windowSeconds * 1000) / 1000)
  const key = buildKey(category, identifier)
  const member = `${now}:${crypto.randomUUID()}`

  try {
    const pipeline = await runPipeline<number | string>([
      ['ZREMRANGEBYSCORE', key, 0, windowStart],
      ['ZADD', key, now, member],
      ['ZCARD', key],
      ['EXPIRE', key, windowSeconds + 30],
    ])

    if (!pipeline.length) {
      return {
        allowed: true,
        limit,
        remaining: limit,
        reset,
        retryAfter: 0,
      }
    }

    const count = Number(pipeline[2]?.result || 0)
    const allowed = count <= limit
    const remaining = Math.max(limit - count, 0)

    return {
      allowed,
      limit,
      remaining,
      reset,
      retryAfter: allowed ? 0 : windowSeconds,
    }
  } catch (error) {
    console.error('Rate limit storage failure:', error)

    if (RATE_LIMIT_FAIL_CLOSED) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        reset,
        retryAfter: windowSeconds,
      }
    }

    return {
      allowed: true,
      limit,
      remaining: limit,
      reset,
      retryAfter: 0,
    }
  }
}

