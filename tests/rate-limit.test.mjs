import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const configSource = await readFile(new URL('../utils/rate-limit/config.ts', import.meta.url), 'utf8')
const middlewareSource = await readFile(new URL('../middleware.ts', import.meta.url), 'utf8')
const envExample = await readFile(new URL('../.env.example', import.meta.url), 'utf8')

test('global role quotas are configured', () => {
  assert.match(configSource, /anonymous:\s*\{\s*limit:\s*100,\s*windowSeconds:\s*15\s*\*\s*60\s*\}/)
  assert.match(configSource, /authenticated:\s*\{\s*limit:\s*500,\s*windowSeconds:\s*15\s*\*\s*60\s*\}/)
  assert.match(configSource, /premium:\s*\{\s*limit:\s*2000,\s*windowSeconds:\s*15\s*\*\s*60\s*\}/)
  assert.match(configSource, /role === 'admin'/)
})

test('high-risk route quotas are configured', () => {
  assert.match(configSource, /search:\s*\{\s*limit:\s*30,\s*windowSeconds:\s*60\s*\}/)
  assert.match(configSource, /autocomplete:\s*\{\s*limit:\s*20,\s*windowSeconds:\s*60\s*\}/)
  assert.match(configSource, /login:\s*\{\s*limit:\s*5,\s*windowSeconds:\s*15\s*\*\s*60\s*\}/)
  assert.match(configSource, /signup:\s*\{\s*limit:\s*3,\s*windowSeconds:\s*60\s*\*\s*60\s*\}/)
  assert.match(configSource, /download:\s*\{\s*limit:\s*20,\s*windowSeconds:\s*60\s*\*\s*60\s*\}/)
  assert.match(configSource, /stream:\s*\{\s*limit:\s*100,\s*windowSeconds:\s*60\s*\*\s*60\s*\}/)
})

test('middleware enforces rate limiting before Supabase session refresh', () => {
  assert.ok(middlewareSource.indexOf('enforceRateLimit') < middlewareSource.indexOf('updateSession'))
  assert.match(middlewareSource, /rateLimitResponse\.status !== 200/)
})

test('server-only Upstash variables are documented without public prefix', () => {
  assert.match(envExample, /UPSTASH_REDIS_REST_URL=/)
  assert.match(envExample, /UPSTASH_REDIS_REST_TOKEN=/)
  assert.doesNotMatch(envExample, /NEXT_PUBLIC_UPSTASH/)
})

