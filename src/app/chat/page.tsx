'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

type Item = {
  id: string
  content?: string
  url?: string
  image_url?: string
  created_at: string
}

type OGPreview = {
  title: string | null
  description: string | null
  image: string | null
  domain: string
}

type Filter = 'all' | 'links' | 'images' | 'text'

/* ─── Helpers ─── */

function firstUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"']+/)
  return m ? m[0] : null
}

function parseContent(text: string): React.ReactNode[] {
  const parts = text.split(/(https?:\/\/[^\s<>"']+)/)
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all font-semibold underline decoration-grow-yellow underline-offset-2 hover:opacity-70"
      >
        {part}
      </a>
    ) : part ? (
      <span key={i}>{part}</span>
    ) : null
  )
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'adesso'
  if (s < 3600) return `${Math.floor(s / 60)}m fa`
  if (s < 86400) return `${Math.floor(s / 3600)}h fa`
  return `${Math.floor(s / 86400)}g fa`
}

/* ─── Per-message link preview component ─── */

function LinkPreview({ url }: { url: string }) {
  const [data, setData] = useState<OGPreview | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then(r => r.ok ? r.json() : null)
      .then((json: OGPreview | null) => {
        if (!cancelled) { setData(json); setDone(true) }
      })
      .catch(() => { if (!cancelled) setDone(true) })
    return () => { cancelled = true }
  }, [url])

  if (!done) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-[0.9rem] border border-white/10 bg-white/5 px-3 py-2">
        <div className="h-1.5 w-1.5 animate-ping rounded-full bg-grow-yellow" />
        <span className="text-[10px] text-white/45">{new URL(url).hostname.replace('www.', '')}</span>
      </div>
    )
  }

  if (!data) return null

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 block overflow-hidden rounded-[0.9rem] border border-white/10 bg-black/20 transition-opacity active:opacity-70"
    >
      {data.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.image}
          alt=""
          className="h-32 w-full object-cover"
          onError={e => { (e.target as HTMLElement).style.display = 'none' }}
        />
      )}
      <div className="px-3 py-2">
        <p className="text-[9px] font-black uppercase tracking-widest text-white/45">{data.domain}</p>
        {data.title && (
          <p className="mt-0.5 line-clamp-2 text-[12px] font-bold leading-tight text-white">{data.title}</p>
        )}
        {data.description && (
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/55">{data.description}</p>
        )}
      </div>
    </a>
  )
}

/* ─── Input preview strip ─── */

function InputPreview({ url, onDismiss }: { url: string; onDismiss: () => void }) {
  const [data, setData] = useState<OGPreview | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    setData(null); setDone(false)
    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then(r => r.ok ? r.json() : null)
      .then((json: OGPreview | null) => { if (!cancelled) { setData(json); setDone(true) } })
      .catch(() => { if (!cancelled) setDone(true) })
    return () => { cancelled = true }
  }, [url])

  if (done && !data) return null

  return (
    <div className="mb-2 flex items-center gap-3 overflow-hidden rounded-[1rem] border border-white/10 bg-white/[0.07] px-3 py-2.5">
      {!done && <div className="h-1.5 w-1.5 animate-ping rounded-full bg-grow-yellow" />}
      {data?.image && done && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover"
          onError={e => { (e.target as HTMLElement).style.display = 'none' }} />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black uppercase tracking-widest text-white/45">
          {done ? (data?.domain ?? new URL(url).hostname.replace('www.', '')) : 'Carico anteprima...'}
        </p>
        {data?.title && <p className="line-clamp-1 text-[12px] font-bold text-white">{data.title}</p>}
      </div>
      <button onClick={onDismiss} className="shrink-0 text-white/45" aria-label="Chiudi">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

/* ─── Single message bubble ─── */

function Bubble({
  item, copiedId, onCopy, onRemove,
}: {
  item: Item
  copiedId: string | null
  onCopy: (item: Item) => void
  onRemove: (id: string) => void
}) {
  const linkUrl = item.content ? firstUrl(item.content) : (item.url ?? null)

  return (
    <div className="group flex items-end gap-2">
      <div className="max-w-[86%] flex-1">
        <div className="rounded-[1.1rem] rounded-bl-[0.35rem] border border-white/10 bg-white/[0.07] px-3.5 py-2.5 shadow-[0_12px_28px_rgba(0,0,0,0.18)]">

          {/* Image */}
          {item.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image_url} alt="" className="mb-2 max-h-64 w-full rounded-xl object-cover" />
          )}

          {/* Text with clickable links */}
          {item.content && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/90">
              {parseContent(item.content)}
            </p>
          )}

          {/* Bare URL field (no content) */}
          {!item.content && item.url && !item.image_url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              className="break-all text-sm font-semibold text-white underline decoration-grow-yellow underline-offset-2">
              {item.url}
            </a>
          )}

          {/* Link preview card, one per message, self-fetching */}
          {linkUrl && <LinkPreview url={linkUrl} />}

          <p className="mt-1.5 text-[10px] text-white/35" style={{ fontFamily: 'DM Mono, monospace' }}>
            {timeAgo(item.created_at)}
          </p>
        </div>
      </div>

      {/* Actions (visible on hover) */}
      <div className="flex shrink-0 flex-col gap-1 pb-1 opacity-0 transition-opacity group-hover:opacity-100">
        {(item.content || item.url) && (
          <button onClick={() => onCopy(item)} aria-label="Copia"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
            {copiedId === item.id
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>}
          </button>
        )}
        <button onClick={() => onRemove(item.id)} aria-label="Elimina"
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/35">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

/* ─── Page ─── */

export default function ChatPage() {
  const [items, setItems] = useState<Item[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [inputUrl, setInputUrl] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const urlDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ─── Load ─── */
  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/inbox?source=chat')
      const d = await r.json()
      const sorted = (d.items as Item[] || []).slice().reverse()
      setItems(sorted)
      const latest = sorted[sorted.length - 1]
      if (latest) localStorage.setItem('grow_chat_last_seen', latest.created_at)
    } catch {}
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 6000)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [items.length])

  /* ─── Input URL detection ─── */
  const handleChange = (val: string) => {
    setText(val)
    if (urlDebounce.current) clearTimeout(urlDebounce.current)
    const url = firstUrl(val)
    if (!url) { setInputUrl(null); return }
    urlDebounce.current = setTimeout(() => setInputUrl(url), 500)
  }

  /* ─── Send ─── */
  const send = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    const value = text
    setText(''); setInputUrl(null)
    try {
      const r = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: value, source: 'chat' }),
      })
      const d = await r.json()
      if (d.item) {
        setItems(prev => [...prev, d.item as Item])
        localStorage.setItem('grow_chat_last_seen', (d.item as Item).created_at)
      }
    } catch {}
    setSending(false)
    textareaRef.current?.focus()
  }

  /* ─── Image upload ─── */
  const uploadImage = async (file: File) => {
    setSending(true)
    try {
      const { createBrowserSupabaseClient } = await import('@/lib/supabase/client')
      const sb = createBrowserSupabaseClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `chat-${Date.now()}.${ext}`
      const { error } = await sb.storage.from('inbox-images').upload(path, file, { contentType: file.type })
      if (error) throw error
      const { data } = sb.storage.from('inbox-images').getPublicUrl(path)
      const r = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: data.publicUrl, source: 'chat' }),
      })
      const saved = await r.json()
      if (saved.item) {
        setItems(prev => [...prev, saved.item as Item])
        localStorage.setItem('grow_chat_last_seen', (saved.item as Item).created_at)
      }
    } catch {}
    setSending(false)
  }

  /* ─── Copy / Remove ─── */
  const copy = async (item: Item) => {
    try {
      await navigator.clipboard.writeText(item.content || item.url || '')
      setCopiedId(item.id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {}
  }

  const remove = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    fetch('/api/inbox', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {})
  }

  /* ─── Filter ─── */
  const filtered = items.filter(item => {
    if (filter === 'links') return Boolean(item.url || (item.content && firstUrl(item.content)))
    if (filter === 'images') return Boolean(item.image_url)
    if (filter === 'text') return Boolean(item.content && !firstUrl(item.content))
    return true
  })

  const tabs: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Tutto' },
    { key: 'links', label: 'Link' },
    { key: 'images', label: 'Immagini' },
    { key: 'text', label: 'Testo' },
  ]

  return (
    <main className="flex min-h-screen flex-col bg-[#0F0F10] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 pb-32 pt-8">

        {/* Header */}
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/45" style={{ fontFamily: 'DM Mono, monospace' }}>
              Telefono ↔ Computer
            </p>
            <h1 className="text-[26px] font-black uppercase tracking-tight">
              Chat veloce<span className="text-grow-yellow">.</span>
            </h1>
          </div>
          <Link href="/inbox" className="text-[10px] font-bold uppercase text-white/45 hover:text-grow-yellow">
            Inbox →
          </Link>
        </header>

        {/* Filter tabs */}
        <div className="scrollbar-hide mb-4 flex items-center gap-2 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={[
                'shrink-0 rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-wide transition-colors',
                filter === t.key ? 'bg-grow-yellow text-[#0F0F10]' : 'border border-white/10 bg-white/[0.06] text-white/45',
              ].join(' ')}>
              {t.label}
            </button>
          ))}
          <span className="ml-auto shrink-0 text-[10px] font-bold text-white/35" style={{ fontFamily: 'DM Mono, monospace' }}>
            {items.length}
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3">
          {filtered.length === 0 && (
            <div className="rounded-[1.3rem] border border-white/10 bg-white/[0.06] px-5 py-10 text-center">
              <p className="text-[13px] font-bold">
                {filter === 'all' ? 'Niente ancora.' : `Nessun ${tabs.find(t => t.key === filter)?.label.toLowerCase()} salvato.`}
              </p>
              {filter === 'all' && (
                <p className="mt-1 text-sm text-white/55">
                  Manda un link, un&apos;immagine o del testo dal telefono. Lo trovi qui.
                </p>
              )}
            </div>
          )}

          {filtered.map(item => (
            <Bubble key={item.id} item={item} copiedId={copiedId} onCopy={copy} onRemove={remove} />
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Input preview (shows when URL detected in input) */}
        {inputUrl && (
          <InputPreview url={inputUrl} onDismiss={() => setInputUrl(null)} />
        )}

        {/* Composer */}
        <div
          className="sticky bottom-20 rounded-[1.3rem] border border-white/10 bg-[#171717]/95 p-2 shadow-[0_18px_46px_rgba(0,0,0,0.42)] backdrop-blur"
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault()
            const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'))
            if (file) void uploadImage(file)
          }}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => handleChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() }
            }}
            onPaste={e => {
              const file = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))?.getAsFile()
              if (file) { e.preventDefault(); void uploadImage(file) }
            }}
            placeholder="Scrivi, incolla un link o trascina un'immagine…"
            rows={1}
            className="max-h-32 w-full resize-none bg-transparent px-2 py-2 text-sm text-white placeholder:text-white/35 focus:outline-none"
          />
          <div className="flex items-center justify-between px-2 pb-1">
            <label className="cursor-pointer text-white/45 hover:text-grow-yellow">
              <input type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) void uploadImage(f); e.target.value = '' }} />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </label>
            <button onClick={() => void send()} disabled={!text.trim() || sending} aria-label="Invia"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-grow-yellow text-[#0F0F10] disabled:opacity-40">
              {sending
                ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#0F0F10] border-t-transparent" />
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              }
            </button>
          </div>
        </div>

      </div>
      <BottomNav />
    </main>
  )
}
