import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (url && token) return new Redis({ url, token })
  return null
}

export async function POST(request: Request) {
  const body = await request.json()
  const { action } = body

  const redis = getRedis()
  if (!redis) return NextResponse.json({ success: false, data: {} }) // Fallback

  try {
    if (action === 'GET') {
      const { keys } = body as { keys: string[] }
      if (!keys || !keys.length) return NextResponse.json({ data: {} })

      // mget returns values in the exact same order as keys
      const values = await redis.mget(...keys)
      const data: Record<string, any> = {}
      
      keys.forEach((key, i) => {
        data[key] = values[i]
      })
      
      return NextResponse.json({ data })
    } 
    
    if (action === 'SET') {
      const { items } = body as { items: { key: string, value: any, ttlSeconds?: number }[] }
      if (!items || !items.length) return NextResponse.json({ success: true })

      const p = redis.pipeline()
      for (const item of items) {
        if (item.ttlSeconds) {
          p.set(item.key, item.value, { ex: item.ttlSeconds })
        } else {
          p.set(item.key, item.value)
        }
      }
      await p.exec()
      
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ success: false, data: {} })
  }
}
