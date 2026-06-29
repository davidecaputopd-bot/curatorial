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
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError || !data.session) {
        setError(true)
        setTimeout(() => router.replace('/login?error=callback'), 1500)
        return
      }
      router.replace(next)
    })
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
