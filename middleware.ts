import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { applySecurityHeaders } from './securityHeaders'
import { enforceRateLimit } from './utils/rate-limit'
import { updateSession } from './utils/supabase/middleware'

const PROTECTED_ROUTES = ['/profile', '/library', '/downloads', '/playlists', '/settings']
const PUBLIC_AUTH_ROUTES = ['/login', '/forgot-password']

function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('from', request.nextUrl.pathname)
  return NextResponse.redirect(url)
}

export async function middleware(request: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(request)

  if (rateLimitResponse && rateLimitResponse.status !== 200) {
    return applySecurityHeaders(rateLimitResponse)
  }

  const { pathname } = request.nextUrl
  const { response, user } = await updateSession(request)

  if (isProtectedRoute(pathname) && !user) {
    return applySecurityHeaders(redirectToLogin(request))
  }

  if (isProtectedRoute(pathname) && user && !user.email_confirmed_at) {
    const url = request.nextUrl.clone()
    url.pathname = '/verify-email'
    url.searchParams.set('from', pathname)
    return applySecurityHeaders(NextResponse.redirect(url))
  }

  if (PUBLIC_AUTH_ROUTES.includes(pathname) && user?.email_confirmed_at) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return applySecurityHeaders(NextResponse.redirect(url))
  }

  if (rateLimitResponse) {
    for (const [key, value] of rateLimitResponse.headers) {
      if (key.toLowerCase().startsWith('x-ratelimit')) {
        response.headers.set(key, value)
      }
    }
  }

  return applySecurityHeaders(response)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
