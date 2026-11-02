'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

type Mode = 'accedi' | 'invito'

function EntraInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])

  const [mode, setMode] = useState<Mode>('accedi')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')
  const [message, setMessage] = useState('')

  const requestedNext = searchParams.get('next')
  const next =
    requestedNext?.startsWith('/serie') && !requestedNext.startsWith('//') ? requestedNext : '/serie'

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      setMessage('Email o password non corretti.')
      setStatus('idle')
      return
    }
    router.replace(next)
    router.refresh()
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('loading')
    setMessage('')

    if (mode === 'accedi') {
      await signIn()
      return
    }

    const response = await fetch('/api/account/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: name, email, password, code }),
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      setMessage(data.error || 'Non è stato possibile creare l’account.')
      setStatus('idle')
      return
    }

    await signIn()
  }

  const field =
    'grow-surface mt-2 w-full rounded-2xl border border-transparent px-4 py-3.5 text-[16px] text-grow-text outline-none focus:border-grow-yellow'
  const label = 'mt-5 block text-[13px] font-semibold text-grow-muted'

  return (
    <main className="min-h-[100dvh] bg-grow-bg px-6 text-grow-text">
      <div className="mx-auto flex min-h-[100dvh] max-w-sm flex-col justify-center py-12">
        <p className="font-display text-5xl leading-none">
          Serie<span className="text-grow-yellow">.</span>
        </p>

        <div className="grow-surface mt-10 grid grid-cols-2 rounded-full p-1">
          {(['accedi', 'invito'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setMode(item)
                setMessage('')
              }}
              className={[
                'grow-press min-h-11 rounded-full text-[13px] font-bold',
                mode === item ? 'grow-object bg-grow-text text-grow-black' : 'text-grow-muted',
              ].join(' ')}
            >
              {item === 'accedi' ? 'Accedi' : 'Ho un invito'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-8">
          <h1 className="font-display text-[32px] leading-none">
            {mode === 'accedi' ? 'Bentornato.' : 'Crea il tuo account.'}
          </h1>
          <p className="mt-3 text-[15px] leading-snug text-grow-muted">
            {mode === 'accedi'
              ? 'Le tue serie, il punto in cui sei, le prossime puntate.'
              : 'Serve il codice che ti ha dato Davide. Senza codice non si entra.'}
          </p>

          {mode === 'invito' && (
            <>
              <label className={label} htmlFor="nome">
                Come ti chiami
              </label>
              <input
                id="nome"
                required
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={field}
              />

              <label className={label} htmlFor="codice">
                Codice di invito
              </label>
              <input
                id="codice"
                required
                autoCapitalize="characters"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                className={`${field} text-center text-xl font-bold tracking-[0.3em]`}
                placeholder="XXXXXXXX"
              />
            </>
          )}

          <label className={label} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={field}
          />

          <label className={label} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={mode === 'invito' ? 8 : undefined}
            autoComplete={mode === 'invito' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={field}
          />
          {mode === 'invito' && (
            <p className="mt-2 text-xs text-grow-muted">Almeno 8 caratteri.</p>
          )}

          {message && (
            <p className="mt-4 rounded-2xl bg-grow-fix/10 px-4 py-3 text-sm font-semibold text-grow-fix">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="grow-press grow-object mt-6 min-h-12 w-full rounded-full bg-grow-yellow text-[15px] font-bold text-grow-black disabled:opacity-40"
          >
            {status === 'loading' ? 'Un attimo…' : mode === 'accedi' ? 'Entra' : 'Crea account'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default function EntraPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[100dvh] items-center justify-center bg-grow-bg">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-grow-text/20 border-t-grow-text" />
        </main>
      }
    >
      <EntraInner />
    </Suspense>
  )
}
