import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (url && token) return new Redis({ url, token })
  return null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')
  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 })

  const redis = getRedis()
  if (!redis) return NextResponse.json({ data: null }) // Fallback if no redis config

  try {
    const data = await redis.get(key)
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ data: null })
  }
}

export async function POST(request: Request) {
  const body = await request.json()
  const { key, value, ttlSeconds = 3600 } = body

  if (!key || !value) return NextResponse.json({ error: 'Missing key or value' }, { status: 400 })

  const redis = getRedis()
  if (!redis) return NextResponse.json({ success: false })

  try {
    await redis.set(key, value, { ex: ttlSeconds })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false })
  }
}
