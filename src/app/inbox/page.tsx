'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ChatCircleDots,
  Copy,
  Image as ImageIcon,
  NotePencil,
  X,
} from '@phosphor-icons/react'
import BottomNav from '@/components/BottomNav'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import {
  classifyInboxItem,
  INBOX_NOTE_LABELS,
  INBOX_NOTE_TYPES,
  type InboxNoteType,
} from '@/lib/inbox/classify'
import { isTikTokUrl, tiktokVideoId } from '@/lib/tiktok'

type Item = {
  id: string
  content?: string
  url?: string
  image_url?: string
  og_title?: string | null
  og_description?: string | null
  og_image?: string | null
  note_type?: InboxNoteType
  created_at: string
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Adesso'
  if (minutes < 60) return `${minutes}m fa`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h fa`
  return `${Math.floor(hours / 24)}g fa`
}

function parseLinks(text: string) {
  const parts = text.split(/(https?:\/\/[^\s<>"']+)/)
  return parts.map((part, index) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={index}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        className="break-all font-semibold underline decoration-grow-yellow underline-offset-2 hover:opacity-70"
      >
        {part}
      </a>
    ) : part ? (
      <span key={index}>{part}</span>
    ) : null
  )
}

function OGCard({ item, expanded }: { item: Item; expanded: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const requested = useRef(false)
  const [preview, setPreview] = useState({
    title: item.og_title || null,
    description: item.og_description || null,
    image: item.og_image || null,
  })
  const url = item.url
  const isTikTok = isTikTokUrl(url)
  const videoId = tiktokVideoId(url)

  useEffect(() => {
    const element = cardRef.current
    if (!element || !url || requested.current || preview.title || preview.image) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        requested.current = true
        observer.disconnect()
        fetch('/api/inbox/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id }),
        })
          .then((response) => (response.ok ? response.json() : null))
          .then((payload) => {
            if (!payload?.preview) return
            setPreview({
              title: payload.preview.title || null,
              description: payload.preview.description || null,
              image: payload.preview.image || null,
            })
          })
          .catch(() => {})
      },
      { rootMargin: '180px' }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [item.id, preview.image, preview.title, url])

  if (!url) return null
  if (!preview.title && !preview.image && !isTikTok) return <div ref={cardRef} />

  if (!preview.title && !preview.image && isTikTok) {
    return (
      <div ref={cardRef} className="mt-2">
        {expanded && videoId ? (
          <iframe
            src={`https://www.tiktok.com/player/v1/${videoId}?autoplay=0&controls=1&description=1`}
            title="Anteprima TikTok"
            loading="lazy"
            allow="fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="aspect-[9/14] max-h-[34rem] w-full rounded-[1rem] border-0 bg-black"
          />
        ) : (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="flex items-center gap-3 rounded-[0.9rem] bg-[#0F0F10] p-3 text-white"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-grow-yellow">
              <ArrowDown size={17} weight="bold" />
            </span>
            <span>
              <span className="block text-xs font-black">Anteprima TikTok</span>
              <span className="mt-0.5 block text-[10px] text-white/50">
                Apri la nota per vedere il video
              </span>
            </span>
          </a>
        )}
      </div>
    )
  }

  return (
    <div ref={cardRef}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        className="mt-2 block overflow-hidden rounded-[0.9rem] border border-black/10 bg-white transition-opacity active:opacity-70"
      >
        {preview.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.image}
            alt=""
            loading="lazy"
            className="h-36 w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
        )}
        <div className="px-3 py-2">
          <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-grow-muted">
            {new URL(url).hostname.replace('www.', '')}
          </p>
          {preview.title && (
            <p className="mt-1 line-clamp-2 text-[12px] font-bold leading-tight text-grow-text">
              {preview.title}
            </p>
          )}
          {preview.description && (
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-grow-muted">
              {preview.description}
            </p>
          )}
        </div>
      </a>
    </div>
  )
}

export default function InboxPage() {
  const [items, setItems] = useState<Item[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | InboxNoteType>('all')
  const [copied, setCopied] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/inbox?lane=notes')
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled) return
        setItems(payload.items || [])
        setTotal(Number(payload.total ?? payload.items?.length ?? 0))
        setHasMore(Boolean(payload.has_more))
      })
      .catch(() => {
        if (!cancelled) setError('Non riesco a caricare le note.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const response = await fetch(
        `/api/inbox?lane=notes&offset=${items.length}&limit=100`
      )
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Caricamento non riuscito')
      setItems((current) => [...current, ...(payload.items || [])])
      setHasMore(Boolean(payload.has_more))
    } catch {
      setError('Non riesco a caricare altre note.')
    } finally {
      setLoadingMore(false)
    }
  }

  const save = async () => {
    if (!text.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, source: 'manual' }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.item) {
        throw new Error(payload.error || 'Salvataggio non riuscito')
      }
      setItems((current) => [payload.item as Item, ...current])
      setTotal((current) => current + 1)
      setText('')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Salvataggio non riuscito.')
    } finally {
      setSaving(false)
    }
  }

  const uploadScreenshot = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const supabase = createBrowserSupabaseClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessione scaduta')
      const extension = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/manual-${Date.now()}.${extension}`
      const { error: uploadError } = await supabase.storage
        .from('inbox-images')
        .upload(path, file, { contentType: file.type })
      if (uploadError) throw uploadError

      const response = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: path, source: 'manual' }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.item) {
        throw new Error(payload.error || 'Upload non riuscito')
      }
      setItems((current) => [payload.item as Item, ...current])
      setTotal((current) => current + 1)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload non riuscito.')
    } finally {
      setUploading(false)
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm('Eliminare questa nota?')) return
    const previous = items
    setItems((current) => current.filter((item) => item.id !== id))
    setTotal((current) => Math.max(0, current - 1))
    try {
      const response = await fetch('/api/inbox', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!response.ok) throw new Error('Eliminazione non riuscita')
    } catch {
      setItems(previous)
      setTotal(previous.length)
      setError('Non sono riuscito a eliminare la nota.')
    }
  }

  const copy = async (item: Item) => {
    try {
      await navigator.clipboard.writeText(item.content || item.url || '')
      setCopied(item.id)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  const typedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        note_type:
          item.note_type ||
          classifyInboxItem({
            content: item.content,
            url: item.url,
            imageUrl: item.image_url,
          }),
      })),
    [items]
  )
  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('it-IT')
    return typedItems.filter((item) => {
      if (filter !== 'all' && item.note_type !== filter) return false
      if (!normalized) return true
      return [item.content, item.url, item.og_title, item.og_description]
        .filter(Boolean)
        .some((value) =>
          String(value).toLocaleLowerCase('it-IT').includes(normalized)
        )
    })
  }, [filter, query, typedItems])

  const detectedUrl = /^https?:\/\//.test(text.trim())

  return (
    <main className="min-h-[100dvh] bg-grow-bg pb-28 text-grow-text lg:pb-12">
      <div className="mx-auto max-w-lg px-4 pt-10 lg:max-w-4xl lg:px-8">
        <header className="mb-7 flex items-start justify-between gap-4">
          <div>
            <p className="grow-page-kicker">
              GROW Inbox
            </p>
            <h1 className="grow-page-title mt-1">
              Inbox<span className="text-grow-yellow">.</span>
            </h1>
            <p className="mt-3 text-sm text-grow-muted">
              Cattura adesso. GROW classifica, senza inventare progetti.
            </p>
          </div>
          <Link
            href="/chat"
            className="mt-1 flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-grow-yellow px-4 text-[9px] font-black uppercase tracking-wide text-grow-black"
          >
            <ChatCircleDots size={15} weight="fill" /> Chat
          </Link>
        </header>

        <section
          className="mb-6 space-y-3 rounded-[1.5rem] border border-black/10 bg-white p-4"
          aria-label="Nuova nota"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            const file = Array.from(event.dataTransfer.files).find((candidate) =>
              candidate.type.startsWith('image/')
            )
            if (file) void uploadScreenshot(file)
          }}
        >
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void save()
              }
            }}
            onPaste={(event) => {
              const file = Array.from(event.clipboardData.items)
                .find((item) => item.type.startsWith('image/'))
                ?.getAsFile()
              if (file) {
                event.preventDefault()
                void uploadScreenshot(file)
              }
            }}
            placeholder="Idea, link, nota o incolla uno screenshot..."
            rows={4}
            className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-grow-text outline-none placeholder:text-grow-muted/70"
          />

          {detectedUrl && (
            <span className="inline-flex rounded-full bg-grow-soft px-2.5 py-1 font-mono text-[8px] uppercase tracking-wide text-grow-muted">
              Link · preparo l’anteprima
            </span>
          )}

          <div className="flex items-center gap-2 border-t border-black/8 pt-3">
            <p className="min-w-0 flex-1 font-mono text-[8px] uppercase tracking-[0.1em] text-grow-muted">
              Nota · link · screenshot
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void uploadScreenshot(file)
                event.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-grow-soft text-grow-text disabled:opacity-40"
              aria-label="Carica immagine"
            >
              {uploading ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-grow-text border-t-transparent" />
              ) : (
                <ImageIcon size={18} />
              )}
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={!text.trim() || saving}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0F0F10] text-grow-yellow disabled:opacity-35"
              aria-label="Salva nota"
            >
              {saving ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-grow-yellow border-t-transparent" />
              ) : (
                <ArrowDown size={18} weight="bold" />
              )}
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </section>

        <div className="mb-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca nel taccuino..."
            className="min-h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none focus:border-grow-yellow"
          />
          <div className="scrollbar-hide -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
            {[
              { key: 'all' as const, label: 'Tutto' },
              ...INBOX_NOTE_TYPES.map((type) => ({
                key: type,
                label: INBOX_NOTE_LABELS[type],
              })),
            ].map((option) => {
              const count =
                option.key === 'all'
                  ? total
                  : typedItems.filter((item) => item.note_type === option.key).length
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setFilter(option.key)}
                  className={[
                    'min-h-11 shrink-0 rounded-full px-3 font-mono text-[8px] uppercase tracking-wide',
                    filter === option.key
                      ? 'bg-[#0F0F10] text-grow-yellow'
                      : 'border border-black/10 bg-white text-grow-muted',
                  ].join(' ')}
                >
                  {option.label} · {count}
                </button>
              )
            })}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((index) => (
              <div key={index} className="h-24 animate-pulse rounded-[1.2rem] bg-white" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-[1.5rem] border border-black/10 bg-white px-6 py-16 text-center">
            <NotePencil size={28} className="mx-auto text-grow-muted" />
            <p className="mt-4 text-sm font-semibold text-grow-text">
              {items.length ? 'Nessuna nota trovata.' : 'Nessuna nota ancora.'}
            </p>
            <p className="mt-1 text-xs text-grow-muted">
              {items.length ? 'Prova un altro filtro.' : 'Scrivi la prima senza preoccuparti di ordinarla.'}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-black/10 overflow-hidden rounded-[1.5rem] border border-black/10 bg-white">
              {filteredItems.map((item) => (
                <article key={item.id} className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    {item.image_url && expanded !== item.id && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url}
                        alt=""
                        loading="lazy"
                        className="h-14 w-14 shrink-0 rounded-xl object-cover"
                      />
                    )}

                    <div className="min-w-0 flex-1">
                      {item.image_url && expanded === item.id && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url}
                          alt=""
                          className="mb-3 max-h-[28rem] w-full rounded-xl object-contain bg-grow-soft"
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                        className="w-full text-left"
                      >
                        <p className={`text-sm leading-relaxed text-grow-text ${expanded === item.id ? '' : 'line-clamp-2'}`}>
                          {item.content
                            ? parseLinks(item.content)
                            : item.url
                              ? item.url
                              : 'Screenshot'}
                        </p>
                      </button>

                      <OGCard item={item} expanded={expanded === item.id} />

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-grow-soft px-2 py-1 font-mono text-[8px] uppercase tracking-wide text-grow-muted">
                          {INBOX_NOTE_LABELS[item.note_type]}
                        </span>
                        <span className="font-mono text-[8px] text-grow-muted">
                          {timeAgo(item.created_at)}
                        </span>
                      </div>

                      {expanded === item.id && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link
                            href={`/ai?brief=${encodeURIComponent(item.content || item.url || '')}`}
                            className="inline-flex min-h-11 items-center rounded-full bg-grow-black px-3 text-[9px] font-black uppercase text-grow-yellow"
                          >
                            Usa con AI
                          </Link>
                          <button
                            type="button"
                            onClick={() => void copy(item)}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-grow-border px-3 text-[9px] font-black uppercase text-grow-muted"
                          >
                            <Copy size={14} /> {copied === item.id ? 'Copiato' : 'Copia'}
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => void remove(item.id)}
                      className="-mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-grow-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
                      aria-label="Elimina nota"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {hasMore && (
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => void loadMore()}
                className="mt-4 min-h-12 w-full rounded-full border border-black/10 bg-white text-[10px] font-black uppercase tracking-wide disabled:opacity-50"
              >
                {loadingMore ? 'Carico…' : 'Carica altre note'}
              </button>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
