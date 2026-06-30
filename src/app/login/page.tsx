'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

type Step = 'email' | 'code' | 'done'

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [persist, setPersist] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function requestOtp(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createBrowserSupabaseClient(persist)
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })

    setLoading(false)
    if (err) {
      setError('Email non autorizzata o errore di rete.')
      return
    }
    setStep('code')
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createBrowserSupabaseClient(persist)
    const { error: err } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    })

    setLoading(false)
    if (err) {
      setError('Codice non valido o scaduto. Richiedine uno nuovo.')
      return
    }

    const next = new URLSearchParams(window.location.search).get('next') || '/'
    router.replace(next)
  }

  return (
    <main className="min-h-screen bg-[#F7F4EE] px-6 text-[#0F0F10]">
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center">

        <p className="mb-12 text-4xl font-black tracking-tight">
          GROW<span className="text-[#FFE500]">.</span>
        </p>

        {step === 'email' && (
          <form onSubmit={requestOtp}>
            <h1 className="text-2xl font-black">Accesso</h1>
            <p className="mt-2 text-sm leading-relaxed text-black/55">
              Inserisci la tua email. Ti mandiamo un codice a 6 cifre.
            </p>

            <label className="mt-8 block text-[11px] font-black uppercase tracking-widest text-black/40" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/12 bg-white px-4 py-3.5 text-sm outline-none transition-colors focus:border-[#FFE500]"
            />

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading || !email}
              className="mt-4 w-full rounded-2xl bg-[#FFE500] py-3.5 text-sm font-black disabled:opacity-40"
            >
              {loading ? 'Invio…' : 'Invia codice'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={verifyOtp}>
            <button
              type="button"
              onClick={() => { setStep('email'); setCode(''); setError('') }}
              className="mb-6 flex items-center gap-1.5 text-xs text-black/40 hover:text-black/70"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round"/>
              </svg>
              Cambia email
            </button>

            <h1 className="text-2xl font-black">Inserisci il codice</h1>
            <p className="mt-2 text-sm leading-relaxed text-black/55">
              Abbiamo inviato un codice a 6 cifre a{' '}
              <span className="font-semibold text-black/80">{email}</span>.
              Controlla anche lo spam.
            </p>

            <label className="mt-8 block text-[11px] font-black uppercase tracking-widest text-black/40" htmlFor="code">
              Codice
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              autoFocus
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              className="mt-2 w-full rounded-2xl border border-black/12 bg-white px-4 py-3.5 text-center text-2xl font-black tracking-[0.4em] outline-none transition-colors focus:border-[#FFE500]"
              placeholder="——————"
            />

            {error && (
              <div className="mt-3">
                <p className="text-sm text-red-600">{error}</p>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setCode(''); setError('') }}
                  className="mt-1 text-xs font-semibold text-black/50 underline"
                >
                  Richiedi un nuovo codice
                </button>
              </div>
            )}

            {/* Resta connesso */}
            <label className="mt-6 flex cursor-pointer items-center gap-3">
              <div
                onClick={() => setPersist(p => !p)}
                className={`relative h-6 w-11 rounded-full transition-colors ${persist ? 'bg-[#0F0F10]' : 'bg-black/20'}`}
              >
                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${persist ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm font-semibold text-black/70">Resta connesso</span>
            </label>
            <p className="mt-1.5 pl-14 text-xs text-black/35">
              {persist
                ? 'La sessione rimane attiva finché non esci manualmente.'
                : 'La sessione termina quando chiudi il browser.'}
            </p>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="mt-6 w-full rounded-2xl bg-[#FFE500] py-3.5 text-sm font-black disabled:opacity-40"
            >
              {loading ? 'Verifica…' : 'Accedi'}
            </button>
          </form>
        )}

      </div>
    </main>
  )
}
