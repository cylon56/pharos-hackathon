import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { password } = await request.json()

  const sitePassword = process.env.SITE_PASSWORD || 'nodoj'

  if (password !== sitePassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const token = btoa(`${sitePassword}:pharos`)

  const response = NextResponse.json({ success: true })
  response.cookies.set('pharos-auth', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return response
}
