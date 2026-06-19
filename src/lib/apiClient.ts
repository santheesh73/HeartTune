const DEFAULT_TIMEOUT_MS = 10_000
const CIRCUIT_FAILURE_THRESHOLD = 5
const CIRCUIT_COOLDOWN_MS = 30_000

interface CircuitState {
  failures: number
  openedAt: number
}

interface SecureFetchOptions<T> extends RequestInit {
  timeoutMs?: number
  retries?: number
  validate?: (value: unknown) => value is T
}

const circuits = new Map<string, CircuitState>()

function circuitKey(url: string) {
  return new URL(url, window.location.origin).origin
}

function assertAllowedUrl(url: string) {
  const target = new URL(url, window.location.origin)
  const allowedOrigins = new Set([
    window.location.origin,
    new URL(process.env.NEXT_PUBLIC_SAAVN_API_URL || 'https://saavn.sumit.co').origin,
    'https://api.dicebear.com',
  ])

  if (!allowedOrigins.has(target.origin)) {
    throw new Error(`Blocked request to unauthorized origin: ${target.origin}`)
  }
}

function isCircuitOpen(key: string) {
  const state = circuits.get(key)
  if (!state || state.failures < CIRCUIT_FAILURE_THRESHOLD) return false
  if (Date.now() - state.openedAt > CIRCUIT_COOLDOWN_MS) {
    circuits.delete(key)
    return false
  }
  return true
}

function recordFailure(key: string) {
  const current = circuits.get(key) || { failures: 0, openedAt: 0 }
  circuits.set(key, {
    failures: current.failures + 1,
    openedAt: current.failures + 1 >= CIRCUIT_FAILURE_THRESHOLD ? Date.now() : current.openedAt,
  })
}

function recordSuccess(key: string) {
  circuits.delete(key)
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function secureJsonFetch<T>(url: string, options: SecureFetchOptions<T> = {}): Promise<T> {
  assertAllowedUrl(url)

  const key = circuitKey(url)
  if (isCircuitOpen(key)) {
    throw new Error('External API is temporarily unavailable.')
  }

  const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = 1, validate, ...fetchOptions } = options

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...fetchOptions.headers,
        },
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const json = (await response.json()) as unknown
      if (validate && !validate(json)) {
        throw new Error('API response validation failed.')
      }

      recordSuccess(key)
      return json as T
    } catch (error) {
      recordFailure(key)
      if (attempt >= retries) throw error
      await delay(250 * (attempt + 1))
    } finally {
      window.clearTimeout(timeout)
    }
  }

  throw new Error('API request failed.')
}
