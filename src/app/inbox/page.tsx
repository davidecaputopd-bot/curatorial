'use client'

import { useEffect, useState } from 'react'
import BottomNav from '@/components/BottomNav'

const CLIENTS = ['ANventitre', 'Exousia', 'Cantina Don Carlo', 'ACI Copertino', 'TRAMA', 'Altro']

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Adesso'
  if (mins < 60) return `${mins} minuti fa`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h fa`
  const days = Math.floor(hours / 24)
  return `${days}g fa`
}

function isUrl(text: string) {
  return text.startsWith('http://') || text.startsWith('https://')
}

type Item = {
  id: string
  content?: string
  url?: string
  client?: string
  source?: string
  created_at: string
}

export default function InboxPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [client, setClient] = useState('')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => { loadItems() }, [])

  const loadItems = async () => {
    try {
      const res = await fetch('/api/inbox')
      const data = await res.json()
      setItems(data.items || [])
    } catch {}
    setLoading(false)
  }

  const save = async () => {
    if (!text.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      const body = isUrl(text)
        ? { url: text, content: text, client, source: 'manual' }
        : { content: text, client, source: 'manual' }
      const res = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.item) {
        setItems(prev => [data.item, ...prev])
        setText('')
        setClient('')
      } else {
        setError(data.error || 'Salvataggio non riuscito.')
      }
    } catch {
      setError('Errore di rete. Riprova.')
    }
    setSaving(false)
  }

  const remove = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    await fetch('/api/inbox', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
  }

  return (
    <main className="min-h-screen bg-grow-bg pb-28 text-grow-text" style={{ fontFamily: "Inter, 'Helvetica Neue', system-ui, sans-serif" }}>
      <div className="mx-auto max-w-lg px-4 pt-12">
        <header className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-grow-muted" style={{ fontFamily: 'DM Mono, monospace' }}>GROW Inbox</p>
          <h1 className="text-[28px] font-black uppercase tracking-tight">
            Inbox<span className="text-grow-yellow">.</span>
          </h1>
          <p className="mt-1 text-sm text-grow-muted">Cattura tutto. Organizza dopo.</p>
        </header>

        {/* Input */}
        <div className="mb-6 rounded-[1.5rem] border border-grow-border bg-grow-card p-4 space-y-3">
          <textarea
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                save()
              }
            }}
            placeholder="Idea, link, nota, URL..."
            rows={3}
            className="w-full resize-none bg-transparent text-sm text-grow-text placeholder:text-grow-muted focus:outline-none"
          />
          {isUrl(text) && (
            <span className="inline-block rounded-full bg-grow-yellow px-2 py-0.5 text-[10px] font-bold uppercase text-grow-text">Link</span>
          )}
          <div className="flex items-center gap-2">
            <select
              value={client}
              onChange={e => setClient(e.target.value)}
              className="flex-1 rounded-full border border-grow-border bg-grow-soft px-3 py-2 text-xs text-grow-text focus:outline-none"
            >
              <option value="">Nessun cliente</option>
              {CLIENTS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              onClick={save}
              disabled={!text.trim() || saving}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-grow-yellow text-grow-text disabled:opacity-40"
            >
              {saving ? '…' : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-pulse rounded-full bg-grow-yellow" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[1.5rem] border border-grow-border bg-grow-card px-6 py-16 text-center">
            <p className="text-sm font-semibold text-grow-text">Nessuna idea ancora.</p>
            <p className="mt-1 text-xs text-grow-muted">Scrivi la prima.</p>
          </div>
        ) : (
          <div className="space-y-0 rounded-[1.5rem] border border-grow-border bg-grow-card divide-y divide-grow-border">
            {items.map(item => (
              <div key={item.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                    className="flex-1 text-left"
                  >
                    <p className={`text-sm text-grow-text ${expanded === item.id ? '' : 'line-clamp-2'}`}>
                      {item.content || item.url}
                    </p>
                  </button>
                  <button onClick={() => remove(item.id)} className="shrink-0 text-grow-muted hover:text-red-400 transition-colors mt-0.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  {item.client && (
                    <span className="rounded-full bg-grow-yellow px-2 py-0.5 text-[10px] font-bold text-grow-text">{item.client}</span>
                  )}
                  <span className="text-[10px] text-grow-muted" style={{ fontFamily: 'DM Mono, monospace' }}>{timeAgo(item.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
