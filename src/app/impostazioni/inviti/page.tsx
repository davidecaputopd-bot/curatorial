'use client'

import { useCallback, useEffect, useState } from 'react'
import BottomNav from '@/components/BottomNav'

type Invite = {
  code: string
  note: string | null
  created_at: string
  used_at: string | null
  used_by: string | null
}

export default function InvitiPage() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    const response = await fetch('/api/account/invites')
    const data = await response.json().catch(() => ({}))
    setInvites(data.invites || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void load())
    return () => window.cancelAnimationFrame(frame)
  }, [load])

  async function create() {
    setCreating(true)
    await fetch('/api/account/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    })
    setNote('')
    await load()
    setCreating(false)
  }

  async function copy(code: string) {
    await navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 1600)
  }

  return (
    <main className="min-h-screen bg-grow-bg pb-32 text-grow-text lg:pb-12">
      <div className="mx-auto max-w-lg lg:max-w-3xl">
        <header className="px-5 pt-10 lg:px-8">
          <h1 className="grow-page-title">
            Inviti<span className="text-grow-yellow">.</span>
          </h1>
          <p className="mt-3 text-[15px] leading-snug text-grow-muted">
            Un codice vale un account. Chi lo usa entra solo in Serie, con la sua libreria.
          </p>
        </header>

        <div className="mt-8 px-5 lg:px-8">
          <div className="flex gap-2">
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Per chi è (opzionale)"
              className="grow-surface min-w-0 flex-1 rounded-2xl border border-transparent px-4 py-3.5 text-[16px] text-grow-text outline-none focus:border-grow-yellow"
            />
            <button
              type="button"
              onClick={() => void create()}
              disabled={creating}
              className="grow-press grow-object min-h-12 shrink-0 rounded-full bg-grow-yellow px-5 text-[14px] font-bold text-grow-black disabled:opacity-40"
            >
              {creating ? '…' : 'Crea codice'}
            </button>
          </div>

          <div className="mt-6 space-y-2">
            {loading ? (
              <p className="text-[15px] text-grow-muted">Carico…</p>
            ) : invites.length === 0 ? (
              <p className="text-[15px] text-grow-muted">Nessun codice ancora.</p>
            ) : (
              invites.map((invite) => (
                <div
                  key={invite.code}
                  className="grow-surface flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-[17px] font-bold tracking-[0.18em] tabular-nums">{invite.code}</p>
                    <p className="mt-0.5 truncate text-[13px] text-grow-muted">
                      {invite.used_at
                        ? `Usato il ${new Date(invite.used_at).toLocaleDateString('it-IT')}`
                        : invite.note || 'Libero'}
                    </p>
                  </div>
                  {!invite.used_at && (
                    <button
                      type="button"
                      onClick={() => void copy(invite.code)}
                      className="grow-press shrink-0 rounded-full border border-grow-border px-4 py-2 text-[13px] font-semibold text-grow-muted"
                    >
                      {copied === invite.code ? 'Copiato' : 'Copia'}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
