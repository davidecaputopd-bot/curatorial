import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY)!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Un account vale solo con il suo profilo: i profili nascono da un invito.
  let profile = null
  if (user) {
    const { data } = await supabase
      .from('tv_profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle()
    profile = data
  }

  const path = request.nextUrl.pathname
  const isAuthRoute = path === '/entra' || path.startsWith('/auth/')

  if (!profile) {
    if (isAuthRoute) return response
    const url = request.nextUrl.clone()
    url.pathname = '/entra'
    url.search = ''
    // Chi è autenticato ma senza profilo deve solo sapere che serve un invito.
    if (!user) url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  if (isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Gli inviti sono solo di chi ha ruolo owner.
  if (path === '/inviti' && profile.role !== 'owner') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
