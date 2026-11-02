import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isGrowOwner } from '@/lib/auth/owner'

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
  const owner = isGrowOwner(user) ? user : null

  // Gli amici hanno un profilo (tv_profiles) e vedono solo Serie.
  let member = Boolean(owner)
  if (user && !owner) {
    const { data: profile } = await supabase
      .from('tv_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()
    member = Boolean(profile)
  }

  const path = request.nextUrl.pathname
  const isOwnerLogin = path === '/login'
  const isMemberLogin = path === '/entra'
  const isAuthRoute = isOwnerLogin || isMemberLogin || path.startsWith('/auth/')
  const isSerieRoute = path === '/serie' || path.startsWith('/serie/')

  const redirect = (pathname: string, keepNext = false) => {
    const url = request.nextUrl.clone()
    url.pathname = pathname
    url.search = ''
    if (keepNext) url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  // Senza accesso: Serie manda al suo login, il resto al login di GROW.
  if (!owner && !member) {
    if (isAuthRoute) return response
    // Autenticato ma senza profilo: serve un invito.
    if (user) return redirect('/entra')
    return isSerieRoute ? redirect('/entra', true) : redirect('/login', true)
  }

  if (owner) {
    if (isOwnerLogin || isMemberLogin) return redirect('/')
    return response
  }

  // Amico: solo Serie.
  return isSerieRoute ? response : redirect('/serie')
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
