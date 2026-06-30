'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

type Item = {
  id: string
  content?: string
  url?: string
  image_url?: string
  created_at: string
}

type LinkPreview = {
  title: string | null
  description: string | null
  image: string | null
  domain: string
}

type Filter = 'all' | 'links' | 'images' | 'text'

function extractFirstUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"']+/)
  return m ? m[0] : null
}

function renderContent(text: string) {
  const parts = text.split(/(https?:\/\/[^\s<>"']+)/)
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all font-semibold underline decoration-grow-yellow underline-offset-2"
        >
          {part}
        </a>
      )
    }
    return part ? <span key={i}>{part}</span> : null
  })
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'adesso'
  if (mins < 60) return `${mins}m fa`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h fa`
  return `${Math.floor(hours / 24)}g fa`
}

function LinkCard({ url, preview, compact = false }: { url: string; preview: LinkPreview; compact?: boolean }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 block overflow-hidden rounded-[0.9rem] border border-black/10 bg-grow-soft transition-opacity hover:opacity-80"
    >
      {preview.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.image}
          alt={preview.title || ''}
          className={compact ? 'h-24 w-full object-cover' : 'h-36 w-full object-cover'}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      )}
      <div className="px-3 py-2">
        <p className="text-[9px] font-black uppercase tracking-wider text-grow-muted">{preview.domain}</p>
        {preview.title && (
          <p className="mt-0.5 line-clamp-2 text-[12px] font-bold leading-tight text-grow-text">{preview.title}</p>
        )}
        {preview.description && !compact && (
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-grow-muted">{preview.description}</p>
        )}
      </div>
    </a>
  )
}

function MessageBubble({
  item,
  copiedId,
  onCopy,
  onRemove,
  previewCache,
}: {
  item: Item
  copiedId: string | null
  onCopy: (item: Item) => void
  onRemove: (id: string) => void
  previewCache: Record<string, LinkPreview | null>
}) {
  const url = item.content ? extractFirstUrl(item.content) : (item.url || null)
  const preview = url ? previewCache[url] : null
  const hasTextContent = Boolean(item.content)

  return (
    <div className="group flex items-end gap-2">
      <div className="flex-1 max-w-[86%]">
        <div className="rounded-[1.1rem] rounded-bl-[0.35rem] border border-grow-border bg-grow-card px-3.5 py-2.5 shadow-sm">
          {/* Image attachment */}
          {item.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image_url}
              alt=""
              className="mb-2 max-h-64 w-full rounded-lg object-cover"
            />
          )}

          {/* Text content with clickable links */}
          {hasTextContent && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-grow-text">
              {renderContent(item.content!)}
            </p>
          )}

          {/* Standalone URL (no other text) */}
          {!hasTextContent && item.url && !item.image_url && (
            <p className="break-all text-sm font-semibold text-grow-text underline decoration-grow-yellow underline-offset-2">
              <a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a>
            </p>
          )}

          {/* Link preview card */}
          {url && preview && (
            <LinkCard url={url} preview={preview} compact={!preview.description} />
          )}

          <p
            className="mt-1.5 text-[10px] text-grow-muted"
            style={{ fontFamily: 'DM Mono, monospace' }}
          >
            {timeAgo(item.created_at)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 flex-col gap-1 pb-1 opacity-0 transition-opacity group-hover:opacity-100">
        {(hasTextContent || item.url) && (
          <button
            onClick={() => onCopy(item)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-grow-soft text-grow-text"
            aria-label="Copia"
          >
            {copiedId === item.id ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
            )}
          </button>
        )}
        <button
          onClick={() => onRemove(item.id)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-grow-muted"
          aria-label="Elimina"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
        </button>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const [items, setItems] = useState<Item[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [previewCache, setPreviewCache] = useState<Record<string, LinkPreview | null>>({})
  const [inputPreview, setInputPreview] = useState<{ url: string; data: LinkPreview } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const previewDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ─── Data loading ─── */
  const load = async () => {
    try {
      const res = await fetch('/api/inbox?source=chat')
      const data = await res.json()
      const sorted = (data.items || []).slice().reverse()
      setItems(sorted)
      const latest = sorted[sorted.length - 1]
      if (latest) localStorage.setItem('grow_chat_last_seen', latest.created_at)
      fetchPreviews(sorted)
    } catch {}
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 6000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [items.length])

  /* ─── Link preview fetching ─── */
  const fetchPreviews = async (newItems: Item[]) => {
    for (const item of newItems) {
      const url = item.content ? extractFirstUrl(item.content) : (item.url || null)
      if (!url || previewCache[url] !== undefined) continue
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
        if (res.ok) {
          const data = await res.json() as LinkPreview
          setPreviewCache(prev => ({ ...prev, [url]: data }))
        } else {
          setPreviewCache(prev => ({ ...prev, [url]: null }))
        }
      } catch {
        setPreviewCache(prev => ({ ...prev, [url]: null }))
      }
    }
  }

  /* ─── Input URL detection ─── */
  const handleTextChange = (val: string) => {
    setText(val)
    if (previewDebounce.current) clearTimeout(previewDebounce.current)
    const url = extractFirstUrl(val)
    if (!url) { setInputPreview(null); return }
    previewDebounce.current = setTimeout(async () => {
      setLoadingPreview(true)
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
        if (res.ok) {
          const data = await res.json() as LinkPreview
          setInputPreview({ url, data })
        }
      } catch {}
      setLoadingPreview(false)
    }, 600)
  }

  /* ─── Send ─── */
  const send = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    const value = text
    setText('')
    setInputPreview(null)
    try {
      const res = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: value, source: 'chat' }),
      })
      const data = await res.json()
      if (data.item) {
        setItems(prev => [...prev, data.item])
        localStorage.setItem('grow_chat_last_seen', data.item.created_at)
        const url = extractFirstUrl(value)
        if (url && inputPreview?.url === url) {
          setPreviewCache(prev => ({ ...prev, [url]: inputPreview.data }))
        }
      }
    } catch {}
    setSending(false)
    inputRef.current?.focus()
  }

  /* ─── Image upload ─── */
  const uploadImage = async (file: File) => {
    setSending(true)
    try {
      const { createBrowserSupabaseClient } = await import('@/lib/supabase/client')
      const supabase = createBrowserSupabaseClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: uploadError } = await supabase.storage.from('inbox-images').upload(path, file, { contentType: file.type })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('inbox-images').getPublicUrl(path)
      const res = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: data.publicUrl, source: 'chat' }),
      })
      const saved = await res.json()
      if (saved.item) {
        setItems(prev => [...prev, saved.item])
        localStorage.setItem('grow_chat_last_seen', saved.item.created_at)
      }
    } catch {}
    setSending(false)
  }

  /* ─── Copy / Remove ─── */
  const copy = async (item: Item) => {
    const value = item.content || item.url || ''
    try {
      await navigator.clipboard.writeText(value)
      setCopiedId(item.id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {}
  }

  const remove = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    await fetch('/api/inbox', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

  /* ─── Filter ─── */
  const filtered = items.filter(item => {
    if (filter === 'links') return Boolean(item.url || (item.content && extractFirstUrl(item.content)))
    if (filter === 'images') return Boolean(item.image_url)
    if (filter === 'text') return Boolean(item.content) && !extractFirstUrl(item.content || '')
    return true
  })

  const filterLabels: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Tutto' },
    { key: 'links', label: 'Link' },
    { key: 'images', label: 'Immagini' },
    { key: 'text', label: 'Testo' },
  ]

  return (
    <main className="flex min-h-screen flex-col bg-grow-bg text-grow-text">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 pb-32 pt-8">

        {/* Header */}
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-grow-muted" style={{ fontFamily: 'DM Mono, monospace' }}>GROW / Telefono ↔ Computer</p>
            <h1 className="text-[26px] font-black uppercase tracking-tight">
              Chat veloce<span className="text-grow-yellow">.</span>
            </h1>
          </div>
          <Link href="/inbox" className="text-[10px] font-bold uppercase text-grow-muted hover:text-grow-text">
            Inbox →
          </Link>
        </header>

        {/* Filter bar */}
        <div className="scrollbar-hide mb-4 flex gap-2 overflow-x-auto">
          {filterLabels.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={[
                'shrink-0 rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-wide transition-colors',
                filter === f.key
                  ? 'bg-grow-yellow text-[#0F0F10]'
                  : 'border border-black/10 bg-white/60 text-grow-muted',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto shrink-0 self-center text-[10px] font-bold text-grow-muted" style={{ fontFamily: 'DM Mono, monospace' }}>
            {items.length} msg
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3">
          {filtered.length === 0 && (
            <div className="rounded-[1.3rem] border border-grow-border bg-grow-card px-5 py-10 text-center">
              <p className="text-[13px] font-bold text-grow-text">Niente ancora.</p>
              <p className="mt-1 text-sm text-grow-muted">
                {filter === 'all'
                  ? 'Manda un link, un\'immagine o un testo dal telefono — lo trovi qui sul computer.'
                  : `Nessun elemento di tipo "${filterLabels.find(f => f.key === filter)?.label.toLowerCase()}" salvato.`}
              </p>
            </div>
          )}
          {filtered.map(item => (
            <MessageBubble
              key={item.id}
              item={item}
              copiedId={copiedId}
              onCopy={copy}
              onRemove={remove}
              previewCache={previewCache}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input preview card */}
        {(inputPreview || loadingPreview) && (
          <div className="mb-2 overflow-hidden rounded-[1rem] border border-grow-border bg-grow-card shadow-sm">
            {loadingPreview && !inputPreview && (
              <div className="flex items-center gap-2 px-3 py-2.5">
                <div className="h-1.5 w-1.5 animate-ping rounded-full bg-grow-yellow" />
                <p className="text-[11px] text-grow-muted">Carico anteprima…</p>
              </div>
            )}
            {inputPreview && (
              <div className="flex items-start gap-3 px-3 py-2.5">
                {inputPreview.data.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={inputPreview.data.image}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black uppercase tracking-wider text-grow-muted">{inputPreview.data.domain}</p>
                  {inputPreview.data.title && (
                    <p className="line-clamp-1 text-[12px] font-bold text-grow-text">{inputPreview.data.title}</p>
                  )}
                  {inputPreview.data.description && (
                    <p className="line-clamp-1 text-[11px] text-grow-muted">{inputPreview.data.description}</p>
                  )}
                </div>
                <button
                  onClick={() => setInputPreview(null)}
                  className="shrink-0 text-grow-muted"
                  aria-label="Rimuovi anteprima"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Composer */}
        <div
          className="sticky bottom-20 rounded-[1.3rem] border border-grow-border bg-grow-card p-2 shadow-md"
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault()
            const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'))
            if (file) void uploadImage(file)
          }}
        >
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => handleTextChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
            onPaste={e => {
              const file = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))?.getAsFile()
              if (file) {
                e.preventDefault()
                void uploadImage(file)
              }
            }}
            placeholder="Scrivi, incolla un link o un'immagine…"
            rows={1}
            className="max-h-32 w-full resize-none bg-transparent px-2 py-2 text-sm text-grow-text placeholder:text-grow-muted focus:outline-none"
          />
          <div className="flex items-center justify-between px-2 pb-1">
            {/* Image attach button */}
            <label className="cursor-pointer text-grow-muted hover:text-grow-text">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) void uploadImage(file)
                  e.target.value = ''
                }}
              />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </label>

            <button
              onClick={() => void send()}
              disabled={!text.trim() || sending}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-grow-yellow text-[#0F0F10] disabled:opacity-40"
              aria-label="Invia"
            >
              {sending ? (
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#0F0F10] border-t-transparent" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </button>
          </div>
        </div>

      </div>
      <BottomNav />
    </main>
  )
}
