import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function getResetOrigin(request: NextRequest) {
  if (siteUrl) return siteUrl.replace(/\/+$/, '')

  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const host = forwardedHost || request.headers.get('host')

  if (host) {
    return `${forwardedProto || request.nextUrl.protocol.replace(':', '')}://${host}`
  }

  return request.nextUrl.origin
}

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !supabaseKey) {
    return jsonError('Supabase is not configured.', 503)
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null
  const email = typeof body?.email === 'string' ? body.email.trim() : ''

  if (!email || !email.includes('@')) {
    return jsonError('Enter a valid email address.')
  }

  const origin = getResetOrigin(request)
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  // Supabase sends this through the dashboard's Password Recovery template.
  // HeartTune's template uses {{ .ConfirmationURL }} as the branded reset link.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  })

  if (error) {
    return jsonError(error.message, error.status || 400)
  }

  return NextResponse.json({ ok: true })
}
