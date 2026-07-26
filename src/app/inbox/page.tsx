'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import {
  classifyInboxItem,
  INBOX_NOTE_LABELS,
  INBOX_NOTE_TYPES,
  type InboxNoteType,
} from '@/lib/inbox/classify'
import { isTikTokUrl, tiktokVideoId } from '@/lib/tiktok'
import type {
  ContentIntelligence,
  ContentRole,
} from '@/lib/brain/content-intelligence'

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
  note_type?: InboxNoteType
  source?: string
  created_at: string
  intelligence?: ContentIntelligence
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
    if (
      !element ||
      !url ||
      requested.current ||
      preview.title ||
      preview.image
    ) {
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
            if (payload?.preview) {
              setPreview({
                title: payload.preview.title || null,
                description: payload.preview.description || null,
                image: payload.preview.image || null,
              })
            }
          })
          .catch(() => {})
      },
      { rootMargin: '180px' }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [item.id, preview.image, preview.title, url])

  if (!url) return null

  if (!preview.title && !preview.image && !isTikTok) {
    return <div ref={cardRef} />
  }

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
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-grow-yellow text-base font-black text-black">
              ▶
            </span>
            <span>
              <span className="block text-xs font-black">Anteprima TikTok</span>
              <span className="mt-0.5 block text-[10px] text-white/50">
                Tocca la nota per vedere il video
              </span>
            </span>
          </a>
        )}
      </div>
    )
  }

  return (
    <div ref={cardRef}>
      <a href={url} target="_blank" rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="mt-2 block overflow-hidden rounded-[0.85rem] border border-black/10 bg-white transition-opacity active:opacity-70">
      {preview.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.image} alt="" className="h-36 w-full object-cover"
          onError={e => { (e.target as HTMLElement).style.display = 'none' }} />
      )}
      <div className="px-3 py-2">
        <p className="text-[9px] font-black uppercase tracking-widest text-grow-muted">
          {new URL(url).hostname.replace('www.', '')}
        </p>
        {preview.title && (
          <p className="mt-0.5 line-clamp-2 text-[12px] font-bold leading-tight text-grow-text">{preview.title}</p>
        )}
        {preview.description && (
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-grow-muted">{preview.description}</p>
        )}
      </div>
      </a>
    </div>
  )
}

export default function InboxPage() {
  const [lane, setLane] = useState<'notes' | 'social'>('notes')
  const [items, setItems] = useState<Item[]>([])
  const [total, setTotal] = useState(0)
  const [resultTotal, setResultTotal] = useState(0)
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
  const [roleFilter, setRoleFilter] = useState<'all' | ContentRole>('all')
  const [copied, setCopied] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectLane = (nextLane: 'notes' | 'social') => {
    if (nextLane === lane) return
    setLoading(true)
    setItems([])
    setTotal(0)
    setResultTotal(0)
    setHasMore(false)
    setQuery('')
    setExpanded(null)
    setError('')
    setFilter('all')
    setRoleFilter('all')
    setLane(nextLane)
  }

  const selectRole = (nextRole: 'all' | ContentRole) => {
    if (nextRole === roleFilter) return
    setLoading(true)
    setItems([])
    setResultTotal(0)
    setHasMore(false)
    setQuery('')
    setExpanded(null)
    setError('')
    setRoleFilter(nextRole)
  }

  useEffect(() => {
    let cancelled = false
    const roleParam =
      lane === 'social' && roleFilter !== 'all'
        ? `&role=${encodeURIComponent(roleFilter)}`
        : ''
    fetch(`/api/inbox?lane=${lane}${roleParam}`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) {
          setItems(data.items || [])
          setTotal(
            Number(data.all_total ?? data.total ?? data.items?.length ?? 0)
          )
          setResultTotal(Number(data.total ?? data.items?.length ?? 0))
          setHasMore(Boolean(data.has_more))
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [lane, roleFilter])

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const roleParam =
        lane === 'social' && roleFilter !== 'all'
          ? `&role=${encodeURIComponent(roleFilter)}`
          : ''
      const response = await fetch(
        `/api/inbox?lane=${lane}${roleParam}&offset=${items.length}&limit=100`
      )
      const data = await response.json()
      if (response.ok) {
        setItems((current) => [...current, ...(data.items || [])])
        setHasMore(Boolean(data.has_more))
      }
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
      const res = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, source: 'manual' }),
      })
      const data = await res.json()
      if (data.item) {
        if (lane === 'notes') {
          setItems((prev) => [data.item as Item, ...prev])
          setTotal((current) => current + 1)
          setResultTotal((current) => current + 1)
        } else {
          selectLane('notes')
        }
        setText('')
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/manual-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('inbox-images').upload(path, file, { contentType: file.type })
      if (uploadError) throw uploadError
      const res = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: path, source: 'manual' }),
      })
      const saved = await res.json()
      if (saved.item) {
        if (lane === 'notes') {
          setItems((prev) => [saved.item as Item, ...prev])
          setTotal((current) => current + 1)
          setResultTotal((current) => current + 1)
        } else {
          selectLane('notes')
        }
      } else setError(saved.error || 'Upload non riuscito.')
    } catch { setError('Upload non riuscito.') }
    setUploading(false)
  }

  const remove = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    setTotal((current) => Math.max(0, current - 1))
    setResultTotal((current) => Math.max(0, current - 1))
    fetch('/api/inbox', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {})
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
    const normalizedQuery = query.trim().toLocaleLowerCase('it-IT')
    return typedItems.filter((item) => {
      if (lane === 'notes' && filter !== 'all' && item.note_type !== filter) {
        return false
      }
      if (
        lane === 'social' &&
        roleFilter !== 'all' &&
        item.intelligence?.role !== roleFilter
      ) {
        return false
      }
      if (!normalizedQuery) return true
      return [item.content, item.url, item.og_title, item.og_description]
        .filter(Boolean)
        .some((value) =>
          String(value).toLocaleLowerCase('it-IT').includes(normalizedQuery)
        )
    })
  }, [filter, lane, query, roleFilter, typedItems])

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
            <p className="mt-1 text-sm text-grow-muted">
              {lane === 'notes'
                ? 'Il tuo taccuino. Nessun progetto obbligatorio.'
                : 'Instagram e TikTok, separati dalle tue note.'}
            </p>
          </div>
          <Link href="/chat" className="mt-1 shrink-0 rounded-full bg-grow-yellow px-3 py-1.5 text-[10px] font-bold uppercase text-grow-black">
            Chat veloce →
          </Link>
        </header>

        <div className="mb-5 grid grid-cols-2 rounded-full bg-[#EDE8DE] p-1">
          {[
            { key: 'notes' as const, label: 'Taccuino' },
            { key: 'social' as const, label: 'Salvati social' },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => selectLane(option.key)}
              className={[
                'min-h-11 rounded-full px-4 text-[10px] font-black uppercase tracking-[0.12em] transition active:scale-[0.98]',
                lane === option.key
                  ? 'bg-[#0F0F10] text-grow-yellow'
                  : 'text-grow-muted',
              ].join(' ')}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Composer */}
        {lane === 'notes' && (
          <div
          className="mb-6 space-y-3 rounded-[1.5rem] border border-black/10 bg-white p-4"
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
            <p className="min-w-0 flex-1 text-[10px] font-bold uppercase tracking-wide text-grow-muted">
              Classificazione automatica · nessun progetto
            </p>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void uploadScreenshot(f); e.target.value = '' }} />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F1EDE5] text-grow-text disabled:opacity-40"
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
        )}

        {lane === 'social' && (
          <>
            <Link
              href="/impostazioni/cattura"
              className="mb-6 flex min-h-14 items-center justify-between gap-4 rounded-[1.25rem] bg-[#0F0F10] px-4 py-3 text-white transition active:scale-[0.98]"
            >
              <span>
                <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-grow-yellow">
                  {total} materiali
                </span>
                <span className="mt-1 block text-sm font-bold">
                  Aggiungi da Instagram o TikTok
                </span>
              </span>
              <span className="text-grow-yellow">→</span>
            </Link>
            {error && <p className="-mt-3 mb-4 text-xs text-red-500">{error}</p>}
          </>
        )}

        <div className="mb-4">
          <div className="relative">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-grow-muted"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                lane === 'notes'
                  ? 'Cerca nelle note...'
                  : 'Cerca nei salvati social...'
              }
              className="w-full rounded-2xl border border-black/10 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-grow-yellow"
            />
          </div>
          <div className="scrollbar-hide -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
            {lane === 'notes'
              ? [
                  { key: 'all' as const, label: 'Tutto' },
                  ...INBOX_NOTE_TYPES.map((type) => ({
                    key: type,
                    label: INBOX_NOTE_LABELS[type],
                  })),
                ].map((option) => {
                  const count =
                    option.key === 'all'
                      ? total
                      : typedItems.filter(
                          (item) => item.note_type === option.key
                        ).length
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setFilter(option.key)}
                      className={[
                        'shrink-0 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-wide',
                        filter === option.key
                          ? 'bg-[#0F0F10] text-grow-yellow'
                          : 'border border-black/10 bg-white text-grow-muted',
                      ].join(' ')}
                    >
                      {option.label} · {count}
                    </button>
                  )
                })
              : [
                  { key: 'all' as const, label: 'Tutto' },
                  { key: 'work_direct' as const, label: 'Lavoro' },
                  {
                    key: 'creative_nourishment' as const,
                    label: 'Nutrimento',
                  },
                  { key: 'personal' as const, label: 'Personale' },
                  { key: 'uncertain' as const, label: 'Da capire' },
                ].map((option) => {
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => selectRole(option.key)}
                      className={[
                        'shrink-0 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-wide',
                        roleFilter === option.key
                          ? 'bg-[#0F0F10] text-grow-yellow'
                          : 'border border-black/10 bg-white text-grow-muted',
                      ].join(' ')}
                    >
                      {option.label}
                      {option.key === 'all' || roleFilter === option.key
                        ? ` · ${option.key === 'all' ? total : resultTotal}`
                        : ''}
                    </button>
                  )
                })}
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-20 animate-pulse rounded-[1.2rem] bg-white" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-[1.5rem] border border-black/10 bg-white px-6 py-16 text-center">
            <p className="text-sm font-semibold text-grow-text">
              {items.length
                ? lane === 'notes'
                  ? 'Nessuna nota trovata.'
                  : 'Nessun salvato in questa categoria.'
                : lane === 'notes'
                  ? 'Nessuna nota ancora.'
                  : 'Nessun salvato social ancora.'}
            </p>
            <p className="mt-1 text-xs text-grow-muted">
              {items.length
                ? 'Prova un altro filtro.'
                : lane === 'notes'
                  ? 'Scrivi la prima.'
                  : 'Importa i tuoi preferiti da Instagram o TikTok.'}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-black/10 rounded-[1.5rem] border border-black/10 bg-white">
              {filteredItems.map(item => (
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
                    <OGCard item={item} expanded={expanded === item.id} />

                    {/* Meta row */}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {lane === 'notes' ? (
                        <span className="rounded-full bg-[#F1EDE5] px-2 py-0.5 text-[10px] font-bold text-grow-muted">
                          {INBOX_NOTE_LABELS[item.note_type]}
                        </span>
                      ) : (
                        <>
                          <span
                            className={[
                              'rounded-full px-2 py-0.5 text-[10px] font-black',
                              item.intelligence?.role === 'work_direct'
                                ? 'bg-grow-yellow text-grow-text'
                                : 'bg-[#F1EDE5] text-grow-muted',
                            ].join(' ')}
                          >
                            {item.intelligence?.role_label || 'Da capire'}
                          </span>
                          <span className="text-[10px] font-bold uppercase text-grow-muted">
                            {item.source || 'social'}
                          </span>
                        </>
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

                    {lane === 'social' &&
                      expanded === item.id &&
                      item.intelligence && (
                        <div className="mt-3 rounded-[1rem] bg-[#F4F0E8] p-3">
                          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-grow-muted">
                            Lettura GROW · {Math.round(item.intelligence.confidence * 100)}%
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-grow-text">
                            {item.intelligence.rationale}
                          </p>
                          {item.intelligence.craft_labels.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {item.intelligence.craft_labels.slice(0, 4).map((label) => (
                                <span
                                  key={label}
                                  className="rounded-full border border-black/10 bg-white px-2 py-1 text-[9px] font-bold text-grow-muted"
                                >
                                  {label}
                                </span>
                              ))}
                            </div>
                          )}
                          {item.intelligence.needs_review && (
                            <p className="mt-2 text-[10px] leading-relaxed text-grow-muted">
                              Dati insufficienti: GROW non forza una classificazione.
                            </p>
                          )}
                        </div>
                      )}

                    {/* AI handoff */}
                    {expanded === item.id && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={`/ai?brief=${encodeURIComponent(item.content || item.url || '')}`}
                          className="inline-flex items-center gap-1 rounded-full bg-grow-black px-3 py-1.5 text-[10px] font-bold uppercase text-grow-yellow">
                          Usa con AI →
                        </Link>
                        <button
                          type="button"
                          onClick={() => void copy(item)}
                          className="rounded-full border border-grow-border px-3 py-1.5 text-[10px] font-bold uppercase text-grow-muted"
                        >
                          {copied === item.id ? 'Copiato' : 'Copia'}
                        </button>
                      </div>
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
            {hasMore && (
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => void loadMore()}
                className="mt-4 min-h-12 w-full rounded-full border border-black/12 bg-white text-xs font-black uppercase tracking-wide disabled:opacity-50"
              >
                {loadingMore ? 'Carico…' : 'Carica altri 100'}
              </button>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
