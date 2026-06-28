'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UnlockPage() {
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [nextPath, setNextPath] = useState('/')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setNextPath(params.get('next') || '/')
  }, [])

  async function unlock() {
    if (!password.trim() || loading) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (!res.ok) {
        setError('Password non corretta.')
        setLoading(false)
        return
      }

      router.replace(nextPath)
      router.refresh()
    } catch {
      setError('Errore di accesso. Riprova.')
      setLoading(false)
    }
  }

  return (
    <main
      className="min-h-screen bg-grow-bg text-grow-text flex items-center justify-center px-4"
      style={{ fontFamily: "Inter, 'Helvetica Neue', system-ui, sans-serif" }}
    >
      <section className="w-full max-w-sm rounded-[28px] border border-grow-border bg-grow-card p-6 shadow-sm">
        <div className="mb-8">
          <h1 className="text-[30px] font-black uppercase tracking-tight">
            GROW<span className="text-grow-yellow">.</span>
          </h1>
          <p className="mt-2 text-sm text-grow-muted">
            Area privata. Inserisci la password per entrare.
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') unlock()
            }}
            placeholder="Password"
            className="w-full rounded-full border border-grow-border bg-grow-soft px-4 py-3 text-sm text-grow-text placeholder:text-grow-muted focus:outline-none focus:border-grow-yellow"
          />

          {error && (
            <p className="text-sm font-medium text-red-500">
              {error}
            </p>
          )}

          <button
            onClick={unlock}
            disabled={!password.trim() || loading}
            className="w-full rounded-full bg-grow-yellow px-4 py-3 text-sm font-black uppercase tracking-tight text-grow-text disabled:opacity-40"
          >
            {loading ? 'Accesso…' : 'Entra'}
          </button>
        </div>
      </section>
    </main>
  )
}
