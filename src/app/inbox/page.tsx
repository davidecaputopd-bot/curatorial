'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

const CLIENTS = ['ANventitre', 'Exousia', 'Cantina Don Carlo', 'ACI Copertino', 'TRAMA', 'Altro']

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Adesso'
  if (mins < 60) return `${mins}m fa`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h fa`
  return `${Math.floor(hours / 24)}g fa`
}

function parseLinks(text: string) {
  const parts = text.split(/(https?:\/\/[^\s<>"']+)/)
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="break-all font-semibold underline decoration-grow-yellow underline-offset-2 hover:opacity-70">
        {part}
      </a>
    ) : part ? <span key={i}>{part}</span> : null
  )
}

type Item = {
  id: string
  content?: string
  url?: string
  image_url?: string
  og_title?: string | null
  og_description?: string | null
  og_image?: string | null
  client?: string
  source?: string
  created_at: string
}

function OGCard({ item }: { item: Item }) {
  const url = item.url
  if (!url) return null
  // show card only if we have at least a title or image from OG
  const hasPreview = item.og_title || item.og_image
  if (!hasPreview) return null

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className="mt-2 block overflow-hidden rounded-[0.85rem] border border-black/10 bg-grow-soft transition-opacity active:opacity-70">
      {item.og_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.og_image} alt="" className="h-36 w-full object-cover"
          onError={e => { (e.target as HTMLElement).style.display = 'none' }} />
      )}
      <div className="px-3 py-2">
        <p className="text-[9px] font-black uppercase tracking-widest text-grow-muted">
          {new URL(url).hostname.replace('www.', '')}
        </p>
        {item.og_title && (
          <p className="mt-0.5 line-clamp-2 text-[12px] font-bold leading-tight text-grow-text">{item.og_title}</p>
        )}
        {item.og_description && (
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-grow-muted">{item.og_description}</p>
        )}
      </div>
    </a>
  )
}

export default function InboxPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [client, setClient] = useState('')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { void loadItems() }, [])

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
      const res = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, client, source: 'manual' }),
      })
      const data = await res.json()
      if (data.item) {
        setItems(prev => [data.item as Item, ...prev])
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

  const uploadScreenshot = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const supabase = createBrowserSupabaseClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `manual-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('inbox-images').upload(path, file, { contentType: file.type })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('inbox-images').getPublicUrl(path)
      const res = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: data.publicUrl, client, source: 'manual' }),
      })
      const saved = await res.json()
      if (saved.item) setItems(prev => [saved.item as Item, ...prev])
      else setError(saved.error || 'Upload non riuscito.')
    } catch { setError('Upload non riuscito.') }
    setUploading(false)
  }

  const remove = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    fetch('/api/inbox', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {})
  }

  const isDetectedUrl = /^https?:\/\//.test(text.trim())

  return (
    <main className="min-h-screen bg-grow-bg pb-28 text-grow-text lg:pb-12">
      <div className="mx-auto max-w-lg px-4 pt-12 lg:max-w-4xl lg:px-8">

        <header className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-grow-muted" style={{ fontFamily: 'DM Mono, monospace' }}>GROW Inbox</p>
            <h1 className="text-[28px] font-black uppercase tracking-tight">
              Inbox<span className="text-grow-yellow">.</span>
            </h1>
            <p className="mt-1 text-sm text-grow-muted">Cattura tutto. Organizza dopo.</p>
          </div>
          <Link href="/chat" className="mt-1 shrink-0 rounded-full bg-grow-black px-3 py-1.5 text-[10px] font-bold uppercase text-grow-yellow">
            Chat veloce →
          </Link>
        </header>

        {/* Composer */}
        <div
          className="mb-6 space-y-3 rounded-[1.5rem] border border-grow-border bg-grow-card p-4"
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault()
            const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'))
            if (file) void uploadScreenshot(file)
          }}
        >
          <textarea
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void save() }
            }}
            onPaste={e => {
              const file = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))?.getAsFile()
              if (file) { e.preventDefault(); void uploadScreenshot(file) }
            }}
            placeholder="Idea, link, nota o incolla uno screenshot..."
            rows={3}
            className="w-full resize-none bg-transparent text-sm text-grow-text placeholder:text-grow-muted focus:outline-none"
          />
          {isDetectedUrl && (
            <span className="inline-block rounded-full bg-grow-yellow px-2 py-0.5 text-[10px] font-bold uppercase text-grow-text">
              Link — anteprima generata al salvataggio
            </span>
          )}
          <div className="flex items-center gap-2">
            <select value={client} onChange={e => setClient(e.target.value)}
              className="flex-1 rounded-full border border-grow-border bg-grow-soft px-3 py-2 text-xs text-grow-text focus:outline-none">
              <option value="">Nessun cliente</option>
              {CLIENTS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void uploadScreenshot(f); e.target.value = '' }} />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-grow-soft text-grow-text disabled:opacity-40"
              aria-label="Carica immagine">
              {uploading ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-grow-text border-t-transparent" /> : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                </svg>
              )}
            </button>
            <button onClick={() => void save()} disabled={!text.trim() || saving}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-grow-yellow text-grow-text disabled:opacity-40"
              aria-label="Salva">
              {saving ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-grow-text border-t-transparent" /> : (
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
          <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-20 animate-pulse rounded-[1.2rem] bg-grow-soft" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[1.5rem] border border-grow-border bg-grow-card px-6 py-16 text-center">
            <p className="text-sm font-semibold text-grow-text">Nessuna idea ancora.</p>
            <p className="mt-1 text-xs text-grow-muted">Scrivi la prima.</p>
          </div>
        ) : (
          <div className="divide-y divide-grow-border rounded-[1.5rem] border border-grow-border bg-grow-card">
            {items.map(item => (
              <div key={item.id} className="px-4 py-3.5">
                <div className="flex items-start gap-3">
                  {/* Thumbnail immagine (se c'è) */}
                  {item.image_url && expanded !== item.id && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  )}

                  <div className="min-w-0 flex-1">
                    {/* Immagine espansa */}
                    {item.image_url && expanded === item.id && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt="" className="mb-2 h-48 w-full rounded-xl object-cover" />
                    )}

                    {/* Contenuto testo con link cliccabili */}
                    <button
                      onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                      className="w-full text-left"
                    >
                      <p className={`text-sm leading-relaxed text-grow-text ${expanded === item.id ? '' : 'line-clamp-2'}`}>
                        {item.content ? parseLinks(item.content) : (
                          item.url ? (
                            <a href={item.url} target="_blank" rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="break-all font-semibold underline decoration-grow-yellow underline-offset-2">
                              {item.url}
                            </a>
                          ) : null
                        )}
                      </p>
                    </button>

                    {/* OG preview card (da DB) — sempre visibile se disponibile */}
                    <OGCard item={item} />

                    {/* Meta row */}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {item.client && (
                        <span className="rounded-full bg-grow-yellow px-2 py-0.5 text-[10px] font-bold text-grow-text">
                          {item.client}
                        </span>
                      )}
                      {item.url && !item.og_title && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="rounded-full border border-grow-border px-2 py-0.5 text-[10px] font-bold text-grow-muted hover:text-grow-text">
                          {new URL(item.url).hostname.replace('www.', '')} ↗
                        </a>
                      )}
                      <span className="text-[10px] text-grow-muted" style={{ fontFamily: 'DM Mono, monospace' }}>
                        {timeAgo(item.created_at)}
                      </span>
                    </div>

                    {/* AI handoff */}
                    {expanded === item.id && (
                      <Link
                        href={`/ai?brief=${encodeURIComponent(item.content || item.url || '')}${item.client ? `&project=${encodeURIComponent(item.client)}` : ''}`}
                        className="mt-3 inline-flex items-center gap-1 rounded-full bg-grow-black px-3 py-1.5 text-[10px] font-bold uppercase text-grow-yellow">
                        Lavora in AI →
                      </Link>
                    )}
                  </div>

                  <button onClick={() => remove(item.id)}
                    className="-mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-grow-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
                    aria-label="Elimina">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
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
