import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
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

  const origin = request.nextUrl.origin
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
