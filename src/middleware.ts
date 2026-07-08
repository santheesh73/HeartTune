import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple list of known bad user agents (commonly used by basic vulnerability scanners)
const BAD_USER_AGENTS = ['nikto', 'sqlmap', 'nmap', 'zmeu', 'grabber', 'masscan']

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || ''
  
  // 1. Block known malicious bots
  if (BAD_USER_AGENTS.some(bot => userAgent.includes(bot))) {
    return new NextResponse('Access Denied', { status: 403 })
  }

  // 2. Validate Origin for Mutation Requests (CSRF protection)
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')
    
    // Only allow mutations from our own origin or a strictly defined set in production
    // (In dev, host might be localhost:3000, origin http://localhost:3000)
    if (origin && host && !origin.includes(host) && !origin.includes('vercel.app')) {
      console.warn(`[Security] Suspicious cross-origin mutation blocked: ${origin} vs ${host}`)
      return new NextResponse('Cross-Origin Requests Not Allowed', { status: 403 })
    }
  }

  return NextResponse.next()
}

export const config = {
  // Apply this middleware to all routes except Next.js internals and static files
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
