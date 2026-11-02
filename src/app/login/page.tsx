'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

function LoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createBrowserSupabaseClient(true), [])

  const [pin, setPin] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const email = process.env.NEXT_PUBLIC_GROW_LOGIN_EMAIL
  const requestedNext = searchParams.get('next')
  const next =
    requestedNext?.startsWith('/') && !requestedNext.startsWith('//')
      ? requestedNext
      : '/'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const cleanPin = pin.replace(/\D/g, '')

    if (!email) {
      setStatus('error')
      setMessage('Email di accesso non configurata.')
      return
    }

    if (cleanPin.length < 4) {
      setStatus('error')
      setMessage('Inserisci il PIN numerico.')
      return
    }

    setStatus('loading')
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: cleanPin,
    })

    if (error) {
      setStatus('error')
      setMessage('PIN non corretto.')
      setPin('')
      return
    }

    router.replace(next)
    router.refresh()
  }

  return (
    <main className="min-h-[100dvh] bg-grow-bg px-6 text-grow-text">
      <div className="mx-auto flex min-h-[100dvh] max-w-sm flex-col justify-center">
        <div className="mb-12 flex items-end justify-between">
          <p className="font-display text-5xl leading-none">
            GROW<span className="text-grow-yellow">.</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <h1 className="font-display text-[36px] leading-none">Inserisci PIN</h1>
          <p className="mt-3 text-[15px] leading-snug text-grow-muted">
            Accesso rapido alla tua app personale. Niente più codici via mail.
          </p>

          <label
            className="mt-8 block text-[13px] font-semibold text-grow-muted"
            htmlFor="pin"
          >
            PIN numerico
          </label>

          <input
            id="pin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            pattern="[0-9]*"
            maxLength={12}
            required
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="grow-surface mt-2 w-full rounded-2xl border border-transparent px-4 py-4 text-center text-2xl font-bold tracking-[0.4em] text-grow-text outline-none focus:border-grow-yellow"
            placeholder="••••••"
          />

          {message && (
            <p className="mt-3 rounded-2xl bg-grow-fix/10 px-4 py-3 text-sm font-semibold text-grow-fix">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'loading' || pin.length < 4}
            className="grow-press grow-object mt-4 min-h-12 w-full rounded-full bg-grow-yellow text-[15px] font-bold text-grow-black disabled:opacity-40"
          >
            {status === 'loading' ? 'Accesso…' : 'Entra'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-relaxed text-grow-muted">
          Il PIN resta collegato al tuo account Supabase, quindi Inbox, Archivio e Calendario continuano a usare gli stessi dati.
        </p>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[100dvh] items-center justify-center bg-grow-bg">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-grow-text/20 border-t-grow-text" />
        </main>
      }
    >
      <LoginInner />
    </Suspense>
  )
}
