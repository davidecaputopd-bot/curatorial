'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<'loading' | 'expired' | 'error'>('loading')
  const done = useRef(false)

  useEffect(() => {
    const nextPath = searchParams.get('next')
    const next = nextPath?.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/'
    const supabase = createBrowserSupabaseClient()

    const go = (path: string) => {
      if (done.current) return
      done.current = true
      router.replace(path)
    }

    // Check for errors in URL params or hash
    const urlError = searchParams.get('error_code') || searchParams.get('error')
    const hashError = typeof window !== 'undefined' && window.location.hash.includes('error=')

    if (urlError === 'otp_expired' || hashError) {
      done.current = true
      setState('expired')
      return
    }
    if (urlError) {
      done.current = true
      setState('error')
      return
    }

    // PKCE: ?code= in params
    const code = searchParams.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) { done.current = true; setState('error') }
          else go(next)
        })
      return
    }

    // Implicit: #access_token= in hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        subscription.unsubscribe()
        go(next)
      }
    })

    const timeout = setTimeout(() => {
      subscription.unsubscribe()
      done.current = true
      setState('error')
    }, 10000)

    return () => { subscription.unsubscribe(); clearTimeout(timeout) }
  }, [router, searchParams])

  if (state === 'expired') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#F7F4EE] px-6 text-center">
        <p className="text-3xl">⚠️</p>
        <div>
          <h1 className="text-lg font-black text-[#0F0F10]">Link scaduto</h1>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-black/60">
            Il link è già stato usato o è scaduto.<br />
            <strong>Se usi Mail.app</strong>, l'app apre il link in anteprima consumandolo prima che tu lo clicchi. Apri Gmail dal browser invece.
          </p>
        </div>
        <a href="/login"
          className="rounded-full bg-[#FFE500] px-6 py-3 text-sm font-black text-[#0F0F10]">
          Richiedi un nuovo link →
        </a>
      </main>
    )
  }

  if (state === 'error') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#F7F4EE] px-6 text-center">
        <h1 className="text-lg font-black text-[#0F0F10]">Accesso non riuscito</h1>
        <a href="/login"
          className="rounded-full bg-[#FFE500] px-6 py-3 text-sm font-black text-[#0F0F10]">
          Riprova →
        </a>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F7F4EE]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F0F10]/20 border-t-[#0F0F10]" />
      <p className="text-sm text-black/50">Accesso in corso…</p>
    </main>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-[#F7F4EE]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F0F10]/20 border-t-[#0F0F10]" />
      </main>
    }>
      <AuthCallbackInner />
    </Suspense>
  )
}
