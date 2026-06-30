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
  const next = searchParams.get('next') || '/'

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
    <main className="min-h-screen bg-[#F7F4EE] px-6 text-[#0F0F10]">
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center">
        <p className="mb-12 text-4xl font-black tracking-tight">
          GROW<span className="text-[#FFE500]">.</span>
        </p>

        <form onSubmit={handleSubmit}>
          <h1 className="text-2xl font-black">Inserisci PIN</h1>
          <p className="mt-2 text-sm leading-relaxed text-black/55">
            Accesso rapido alla tua app personale. Niente più codici via mail.
          </p>

          <label
            className="mt-8 block text-[11px] font-black uppercase tracking-widest text-black/40"
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
            className="mt-2 w-full rounded-2xl border border-black/12 bg-white px-4 py-4 text-center text-2xl font-black tracking-[0.35em] outline-none transition-colors focus:border-[#FFE500]"
            placeholder="••••••"
          />

          {message && (
            <p className="mt-3 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-600">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'loading' || pin.length < 4}
            className="mt-4 w-full rounded-2xl bg-[#FFE500] py-3.5 text-sm font-black disabled:opacity-40"
          >
            {status === 'loading' ? 'Accesso…' : 'Entra'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-relaxed text-black/35">
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
        <main className="flex min-h-screen items-center justify-center bg-[#F7F4EE]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F0F10]/20 border-t-[#0F0F10]" />
        </main>
      }
    >
      <LoginInner />
    </Suspense>
  )
}
