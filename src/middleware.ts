import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = [
  '/unlock',
  '/api/unlock',
  '/favicon.ico',
]

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return true
  }

  if (pathname.startsWith('/_next/')) {
    return true
  }

  if (/\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|xml|json|woff|woff2)$/i.test(pathname)) {
    return true
  }

  return false
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const expectedToken = process.env.GROW_ACCESS_TOKEN
  const sessionToken = request.cookies.get('grow_session')?.value

  if (expectedToken && sessionToken === expectedToken) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const unlockUrl = request.nextUrl.clone()
  unlockUrl.pathname = '/unlock'
  unlockUrl.searchParams.set('next', pathname)

  return NextResponse.redirect(unlockUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
