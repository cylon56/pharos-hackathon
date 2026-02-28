import { NextRequest, NextResponse } from 'next/server'

const BYPASS_PREFIXES = [
  '/login',
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow auth routes and static assets
  if (BYPASS_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const sitePassword = process.env.SITE_PASSWORD || 'nodoj'
  const validToken = btoa(`${sitePassword}:pharos`)
  const authCookie = request.cookies.get('pharos-auth')

  if (!authCookie || authCookie.value !== validToken) {
    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/') {
      loginUrl.searchParams.set('from', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
