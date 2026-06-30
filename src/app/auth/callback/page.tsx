'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState(false)

  useEffect(() => {
    const nextPath = searchParams.get('next')
    const next = nextPath?.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/'

    const supabase = createBrowserSupabaseClient()

    // With implicit flow the token lands in the URL hash.
    // onAuthStateChange fires as soon as Supabase has parsed it — safe to use
    // instead of getSession() which may run before the hash is consumed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe()
        router.replace(next)
        return
      }
      if (event === 'INITIAL_SESSION' && !session) {
        // No session and no hash token — genuinely failed
        setError(true)
        setTimeout(() => router.replace('/login?error=callback'), 1500)
      }
    })

    // Safety timeout: if nothing fires in 8s, redirect to login
    const timeout = setTimeout(() => {
      subscription.unsubscribe()
      setError(true)
      router.replace('/login?error=timeout')
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [router, searchParams])

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F4EE] px-6 text-[#0F0F10]">
      <p className="text-sm text-black/60">
        {error ? 'Accesso non riuscito, torno alla pagina di login...' : 'Accesso in corso...'}
      </p>
    </main>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackInner />
    </Suspense>
  )
}
