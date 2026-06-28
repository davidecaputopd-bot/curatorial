'use client'

import { FormEvent, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createBrowserSupabaseClient()
    const next = new URLSearchParams(window.location.search).get('next') || '/'
    const callback = new URL('/auth/callback', window.location.origin)
    callback.searchParams.set('next', next)

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callback.toString(),
        shouldCreateUser: false,
      },
    })

    setLoading(false)
    if (signInError) {
      setError('Accesso non riuscito. Controlla l’email e riprova.')
      return
    }
    setSent(true)
  }

  return (
    <main className="min-h-screen bg-[#F7F4EE] px-6 text-[#0F0F10]">
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center">
        <p className="mb-12 text-4xl font-black tracking-tight">
          GROW<span className="text-[#FFD600]">.</span>
        </p>

        {sent ? (
          <div>
            <h1 className="text-2xl font-bold">Controlla la posta.</h1>
            <p className="mt-3 text-sm leading-6 text-black/60">
              Ti abbiamo inviato un link personale. Nessuna password.
            </p>
          </div>
        ) : (
          <form onSubmit={signIn}>
            <h1 className="text-2xl font-bold">Accesso personale</h1>
            <p className="mt-2 text-sm leading-6 text-black/60">
              Inserisci l’email autorizzata per ricevere il link di accesso.
            </p>
            <label className="mt-8 block text-xs font-bold uppercase tracking-wider" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-black/15 bg-white px-4 py-3 outline-none focus:border-[#FFD600]"
            />
            {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-[#FFD600] px-4 py-3 font-bold disabled:opacity-50"
            >
              {loading ? 'Invio…' : 'Mandami il link'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
