'use client'

import Link from 'next/link'
import {
  ArrowDown,
  ArrowSquareOut,
  ArrowUp,
  Brain,
  Copy,
  GridFour,
  Play,
  Sparkle,
  X,
} from '@phosphor-icons/react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { isTikTokUrl, tiktokVideoId } from '@/lib/tiktok'
import type {
  ContentIntelligence,
  ContentRole,
} from '@/lib/brain/content-intelligence'
import type { BrainFeedbackSignal } from '@/lib/brain/daily-brief'

type SocialItem = {
  id: string
  content?: string | null
  url?: string | null
  image_url?: string | null
  og_title?: string | null
  og_description?: string | null
  og_image?: string | null
  source?: string | null
  created_at: string
  intelligence?: ContentIntelligence
}

type SocialPreview = {
  title: string | null
  description: string | null
  image: string | null
}

type FeedbackState = {
  signal: BrainFeedbackSignal
  status: 'sending' | 'saved' | 'error'
}

const ROLE_FILTERS: Array<{
  key: 'all' | ContentRole
  label: string
}> = [
  { key: 'all', label: 'Tutto' },
  { key: 'work_direct', label: 'Lavoro' },
  { key: 'creative_nourishment', label: 'Nutrimento' },
  { key: 'personal', label: 'Personale' },
  { key: 'uncertain', label: 'Da capire' },
]

const FEEDBACK_OPTIONS: Array<{
  signal: BrainFeedbackSignal
  label: string
}> = [
  { signal: 'useful_now', label: 'Mi serve' },
  { signal: 'nourishment', label: 'Nutrimento' },
  { signal: 'personal', label: 'Personale' },
  { signal: 'not_for_me', label: 'Non per me' },
]

function sourceLabel(source?: string | null) {
  if (source?.toLocaleLowerCase('it-IT').includes('tiktok')) return 'TikTok'
  if (source?.toLocaleLowerCase('it-IT').includes('instagram')) return 'Instagram'
  return 'Social'
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

function itemTitle(item: SocialItem) {
  return item.og_title || item.content || 'Salvato social'
}

function instagramEmbedUrl(value?: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    const hostname = url.hostname.toLocaleLowerCase('en-US')
    if (hostname !== 'instagram.com' && !hostname.endsWith('.instagram.com')) {
      return null
    }
    const match = url.pathname.match(/^\/(p|reel|tv)\/([^/]+)/i)
    if (!match) return null
    return `https://www.instagram.com/${match[1]}/${match[2]}/embed/captioned`
  } catch {
    return null
  }
}

function SocialTile({
  item,
  onOpen,
  onPreview,
}: {
  item: SocialItem
  onOpen: () => void
  onPreview: (id: string, preview: SocialPreview) => void
}) {
  const tileRef = useRef<HTMLButtonElement>(null)
  const requested = useRef(false)
  const [imageFailed, setImageFailed] = useState(false)
  const [preview, setPreview] = useState<SocialPreview>({
    title: item.og_title || null,
    description: item.og_description || null,
    image: item.og_image || item.image_url || null,
  })

  useEffect(() => {
    const element = tileRef.current
    if (
      !element ||
      !item.url ||
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
            if (!payload?.preview) return
            const nextPreview = {
              title: payload.preview.title || null,
              description: payload.preview.description || null,
              image: payload.preview.image || null,
            }
            setPreview(nextPreview)
            onPreview(item.id, nextPreview)
          })
          .catch(() => {})
      },
      { rootMargin: '280px' }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [item.id, item.url, onPreview, preview.image, preview.title])

  const title = preview.title || item.content || 'Salvato social'
  const image = imageFailed ? null : preview.image

  return (
    <button
      ref={tileRef}
      type="button"
      onClick={onOpen}
      className="group relative aspect-[3/4] min-w-0 overflow-hidden bg-[#171717] text-left outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-grow-yellow"
      aria-label={`Apri ${title}`}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-active:scale-[0.985]"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col justify-between bg-[linear-gradient(155deg,#34312B_0%,#171717_56%,#080808_100%)] p-3 text-white">
          <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-grow-yellow">
            {sourceLabel(item.source)}
          </span>
          <p className="line-clamp-5 text-[11px] font-bold leading-snug">
            {title}
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/70" />
      <div className="pointer-events-none absolute left-2 top-2 flex h-7 items-center gap-1 rounded-full bg-black/55 px-2 font-mono text-[7px] uppercase tracking-[0.12em] text-white backdrop-blur-sm">
        {isTikTokUrl(item.url) && <Play size={9} weight="fill" />}
        {sourceLabel(item.source)}
      </div>
      {item.intelligence?.understood && (
        <span
          className="pointer-events-none absolute right-2 top-2 h-2.5 w-2.5 rounded-full border border-black/30 bg-grow-yellow"
          title="Compreso da GROW"
        />
      )}
      <p className="pointer-events-none absolute inset-x-0 bottom-0 line-clamp-2 p-2.5 text-[10px] font-bold leading-snug text-white drop-shadow-sm">
        {title}
      </p>
    </button>
  )
}

function FeedMedia({
  item,
  active,
  playing,
  onPlay,
}: {
  item: SocialItem
  active: boolean
  playing: boolean
  onPlay: () => void
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const videoId = tiktokVideoId(item.url)
  const instagramEmbed = instagramEmbedUrl(item.url)
  const previewImage = imageFailed ? null : item.og_image || item.image_url
  const playable = Boolean(videoId || instagramEmbed)
  const title = itemTitle(item)

  if (active && playing && videoId) {
    return (
      <iframe
        src={`https://www.tiktok.com/player/v1/${videoId}?autoplay=1&muted=1&controls=1&description=0`}
        title={title}
        allow="autoplay; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="relative z-10 h-full w-full border-0 bg-black"
      />
    )
  }

  if (active && playing && instagramEmbed) {
    return (
      <iframe
        src={instagramEmbed}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="relative z-10 h-full w-full border-0 bg-white"
      />
    )
  }

  return (
    <div className="absolute inset-0">
      {previewImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewImage}
            alt=""
            loading={active ? 'eager' : 'lazy'}
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl"
            aria-hidden="true"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewImage}
            alt=""
            loading={active ? 'eager' : 'lazy'}
            className="relative h-full w-full object-contain"
            onError={() => setImageFailed(true)}
          />
        </>
      ) : (
        <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#34312B_0%,#111_50%,#050505_100%)] px-10 text-center">
          <div className="max-w-xs">
            <GridFour size={30} className="mx-auto text-grow-yellow" />
            <p className="mt-4 text-lg font-bold leading-tight text-white">
              {title}
            </p>
            <p className="mt-2 text-xs text-white/45">
              Anteprima visiva non disponibile
            </p>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/90" />
      {playable && (
        <button
          type="button"
          onClick={onPlay}
          className="absolute left-1/2 top-1/2 z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-grow-yellow text-black shadow-[0_18px_50px_rgba(0,0,0,0.35)] transition active:scale-95"
          aria-label={`Riproduci ${title}`}
        >
          <Play size={25} weight="fill" className="ml-1" />
        </button>
      )}
    </div>
  )
}

function SocialFeed({
  items,
  startIndex,
  total,
  copiedId,
  feedback,
  onClose,
  onActiveIndex,
  onCopy,
  onFeedback,
}: {
  items: SocialItem[]
  startIndex: number
  total: number
  copiedId: string | null
  feedback: Record<string, FeedbackState>
  onClose: () => void
  onActiveIndex: (index: number) => void
  onCopy: (item: SocialItem) => void
  onFeedback: (item: SocialItem, signal: BrainFeedbackSignal) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<Array<HTMLElement | null>>([])
  const [activeIndex, setActiveIndex] = useState(startIndex)
  const [playingId, setPlayingId] = useState<string | null>(null)

  const goTo = useCallback((index: number) => {
    const next = Math.max(0, Math.min(items.length - 1, index))
    slideRefs.current[next]?.scrollIntoView({ block: 'start' })
  }, [items.length])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = window.requestAnimationFrame(() => goTo(startIndex))
    containerRef.current?.focus({ preventScroll: true })
    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
    }
  }, [goTo, startIndex])

  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!visible) return
        const index = Number((visible.target as HTMLElement).dataset.index)
        if (!Number.isFinite(index)) return
        setActiveIndex(index)
        setPlayingId(null)
        onActiveIndex(index)
      },
      { root, threshold: [0.55, 0.72, 0.9] }
    )
    slideRefs.current.forEach((slide) => {
      if (slide) observer.observe(slide)
    })
    return () => observer.disconnect()
  }, [items.length, onActiveIndex])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault()
        goTo(activeIndex + 1)
      }
      if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault()
        goTo(activeIndex - 1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeIndex, goTo, onClose])

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="dialog"
      aria-modal="true"
      aria-label="Archivio social, scorrimento verticale"
      className="fixed inset-0 z-[90] h-[100dvh] snap-y snap-mandatory overflow-y-auto overscroll-y-contain bg-[#050505] text-white outline-none"
    >
      {items.map((item, index) => {
        const active = index === activeIndex
        const title = itemTitle(item)
        const itemFeedback = feedback[item.id]
        return (
          <article
            key={item.id}
            ref={(element) => {
              slideRefs.current[index] = element
            }}
            data-index={index}
            className="relative h-[100dvh] snap-start snap-always overflow-hidden bg-black [content-visibility:auto] [contain-intrinsic-size:100dvh]"
            aria-label={`${title}, ${index + 1} di ${total}`}
          >
            <FeedMedia
              item={item}
              active={active}
              playing={playingId === item.id}
              onPlay={() => setPlayingId(item.id)}
            />

            <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <button
                type="button"
                onClick={onClose}
                className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md"
                aria-label="Chiudi archivio social"
              >
                <X size={20} weight="bold" />
              </button>
              <div className="rounded-full bg-black/45 px-3 py-2 text-center backdrop-blur-md">
                <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-grow-yellow">
                  Archivio social
                </p>
                <p className="mt-0.5 font-mono text-[8px] text-white/55">
                  {index + 1} / {total}
                </p>
              </div>
              <div className="h-11 w-11" aria-hidden="true" />
            </div>

            <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-0 right-0 z-30 px-4 pr-20">
              <div className="max-w-lg">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-grow-yellow px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-black">
                    {sourceLabel(item.source)}
                  </span>
                  <span className="font-mono text-[9px] text-white/45">
                    {timeAgo(item.created_at)}
                  </span>
                </div>
                <h2 className="mt-3 line-clamp-3 text-lg font-bold leading-tight tracking-[-0.02em]">
                  {title}
                </h2>
                {item.intelligence?.rationale && (
                  <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-white/60">
                    {item.intelligence.rationale}
                  </p>
                )}

                <div className="scrollbar-hide -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
                  {FEEDBACK_OPTIONS.map((option) => {
                    const selected = itemFeedback?.signal === option.signal
                    return (
                      <button
                        key={option.signal}
                        type="button"
                        disabled={itemFeedback?.status === 'sending'}
                        onClick={() => onFeedback(item, option.signal)}
                        className={[
                          'min-h-11 shrink-0 rounded-full px-3.5 font-mono text-[8px] uppercase tracking-[0.1em] backdrop-blur-md transition disabled:opacity-50',
                          selected && itemFeedback.status === 'saved'
                            ? 'bg-grow-yellow text-black'
                            : 'border border-white/15 bg-black/45 text-white/80',
                        ].join(' ')}
                      >
                        {selected && itemFeedback.status === 'sending'
                          ? 'Salvo…'
                          : selected && itemFeedback.status === 'saved'
                            ? 'Registrato'
                            : option.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-3 z-40 flex flex-col gap-3">
              <Link
                href={`/ai?brief=${encodeURIComponent(item.content || item.og_title || item.url || '')}`}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-grow-yellow text-black shadow-lg"
                aria-label="Usa questo salvato con GROW AI"
              >
                <Sparkle size={19} weight="fill" />
              </Link>
              <button
                type="button"
                onClick={() => onCopy(item)}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md"
                aria-label="Copia link"
              >
                {copiedId === item.id ? (
                  <span className="font-mono text-[8px] uppercase text-grow-yellow">OK</span>
                ) : (
                  <Copy size={18} />
                )}
              </button>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md"
                  aria-label="Apri originale"
                >
                  <ArrowSquareOut size={19} />
                </a>
              )}
              <div className="flex flex-col overflow-hidden rounded-full bg-black/55 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => goTo(index - 1)}
                  disabled={index === 0}
                  className="flex h-10 w-12 items-center justify-center border-b border-white/10 disabled:opacity-25"
                  aria-label="Salvato precedente"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => goTo(index + 1)}
                  disabled={index >= items.length - 1}
                  className="flex h-10 w-12 items-center justify-center disabled:opacity-25"
                  aria-label="Salvato successivo"
                >
                  <ArrowDown size={16} />
                </button>
              </div>
            </div>

            {index === startIndex && (
              <div className="pointer-events-none absolute bottom-28 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/45 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.12em] text-white/65 backdrop-blur-md">
                Scorri per continuare
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}

export default function SocialArchive() {
  const [items, setItems] = useState<SocialItem[]>([])
  const [total, setTotal] = useState(0)
  const [resultTotal, setResultTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | ContentRole>('all')
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Record<string, FeedbackState>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const roleParam =
      roleFilter === 'all' ? '' : `&role=${encodeURIComponent(roleFilter)}`
    fetch(`/api/inbox?lane=social&limit=100${roleParam}`)
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Caricamento non riuscito')
        return payload
      })
      .then((payload) => {
        if (cancelled) return
        setItems(payload.items || [])
        setTotal(Number(payload.all_total ?? payload.total ?? 0))
        setResultTotal(Number(payload.total ?? payload.items?.length ?? 0))
        setHasMore(Boolean(payload.has_more))
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Caricamento non riuscito')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [roleFilter])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const roleParam =
        roleFilter === 'all' ? '' : `&role=${encodeURIComponent(roleFilter)}`
      const response = await fetch(
        `/api/inbox?lane=social&offset=${items.length}&limit=100${roleParam}`
      )
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Caricamento non riuscito')
      setItems((current) => [...current, ...(payload.items || [])])
      setHasMore(Boolean(payload.has_more))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Caricamento non riuscito')
    } finally {
      setLoadingMore(false)
    }
  }, [hasMore, items.length, loadingMore, roleFilter])

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('it-IT')
    if (!normalized) return items
    return items.filter((item) =>
      [item.content, item.og_title, item.og_description, item.url]
        .filter(Boolean)
        .some((value) =>
          String(value).toLocaleLowerCase('it-IT').includes(normalized)
        )
    )
  }, [items, query])

  const summary = useMemo(() => {
    const understood = items.filter((item) => item.intelligence?.understood).length
    const craftCounts = new Map<string, number>()
    items.forEach((item) => {
      item.intelligence?.craft_labels.forEach((label) => {
        craftCounts.set(label, (craftCounts.get(label) || 0) + 1)
      })
    })
    return {
      understoodPercentage: items.length
        ? Math.round((understood / items.length) * 100)
        : 0,
      topCraft:
        [...craftCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ||
        'In scoperta',
    }
  }, [items])

  const updatePreview = useCallback((id: string, preview: SocialPreview) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              og_title: preview.title,
              og_description: preview.description,
              og_image: preview.image,
            }
          : item
      )
    )
  }, [])

  const copy = useCallback(async (item: SocialItem) => {
    try {
      await navigator.clipboard.writeText(item.url || item.content || '')
      setCopiedId(item.id)
      window.setTimeout(() => setCopiedId(null), 1200)
    } catch {}
  }, [])

  const registerFeedback = useCallback(
    async (item: SocialItem, signal: BrainFeedbackSignal) => {
      setFeedback((current) => ({
        ...current,
        [item.id]: { signal, status: 'sending' },
      }))
      try {
        const response = await fetch('/api/brain/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signal,
            source_type: 'inbox',
            source_id: item.id,
            title: itemTitle(item),
          }),
        })
        if (!response.ok) throw new Error('Feedback non salvato')
        setFeedback((current) => ({
          ...current,
          [item.id]: { signal, status: 'saved' },
        }))
      } catch {
        setFeedback((current) => ({
          ...current,
          [item.id]: { signal, status: 'error' },
        }))
      }
    },
    []
  )

  const handleActiveIndex = useCallback(
    (index: number) => {
      if (
        !query.trim() &&
        hasMore &&
        !loadingMore &&
        index >= visibleItems.length - 5
      ) {
        void loadMore()
      }
    },
    [hasMore, loadMore, loadingMore, query, visibleItems.length]
  )

  return (
    <>
      <section className="rounded-[1.5rem] border border-black/10 bg-white p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#0F0F10] text-grow-yellow">
            <Brain size={28} weight="fill" />
          </div>
          <div className="grid min-w-0 flex-1 grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-black leading-none">{total}</p>
              <p className="mt-1 font-mono text-[8px] uppercase tracking-wide text-grow-muted">Salvati</p>
            </div>
            <div>
              <p className="text-lg font-black leading-none">{summary.understoodPercentage}%</p>
              <p className="mt-1 font-mono text-[8px] uppercase tracking-wide text-grow-muted">Letti</p>
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-black leading-none">{summary.topCraft}</p>
              <p className="mt-1.5 font-mono text-[8px] uppercase tracking-wide text-grow-muted">Tratto</p>
            </div>
          </div>
        </div>
        <div className="mt-4 border-t border-black/10 pt-3">
          <p className="text-sm font-bold">Il tuo gusto, non un altro feed.</p>
          <p className="mt-1 text-[11px] leading-relaxed text-grow-muted">
            Scorri per ritrovare. Indica cosa ti serve: GROW userà le tue scelte per selezionare meglio, senza assegnare clienti da solo.
          </p>
        </div>
      </section>

      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <button
          type="button"
          disabled={visibleItems.length === 0}
          onClick={() => setViewerIndex(0)}
          className="flex min-h-12 items-center justify-between rounded-full bg-[#0F0F10] px-4 text-[10px] font-black uppercase tracking-[0.12em] text-white disabled:opacity-40"
        >
          <span className="flex items-center gap-2">
            <Play size={14} weight="fill" className="text-grow-yellow" />
            Scorri i salvati
          </span>
          <span className="text-grow-yellow">↓</span>
        </button>
        <Link
          href="/impostazioni/cattura"
          className="flex min-h-12 items-center rounded-full bg-grow-yellow px-4 text-[10px] font-black uppercase text-black"
        >
          Importa
        </Link>
      </div>

      <div className="mt-5">
        <div className="relative">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca nei salvati social..."
            className="min-h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none focus:border-grow-yellow"
          />
        </div>
        <div className="scrollbar-hide -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {ROLE_FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                if (option.key === roleFilter) return
                setLoading(true)
                setError('')
                setRoleFilter(option.key)
              }}
              className={[
                'min-h-11 shrink-0 rounded-full px-3 text-[9px] font-black uppercase tracking-wide',
                roleFilter === option.key
                  ? 'bg-[#0F0F10] text-grow-yellow'
                  : 'border border-black/10 bg-white text-grow-muted',
              ].join(' ')}
            >
              {option.label}
              {roleFilter === option.key
                ? ` · ${option.key === 'all' ? total : resultTotal}`
                : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-2 mt-5 flex items-center justify-between px-0.5">
        <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-grow-muted">
          <GridFour size={13} weight="fill" /> Profilo visivo
        </p>
        <p className="font-mono text-[9px] text-grow-muted">
          {visibleItems.length} visibili
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-[2px] lg:grid-cols-5">
          {Array.from({ length: 15 }, (_, index) => (
            <div key={index} className="aspect-[3/4] animate-pulse bg-black/10" />
          ))}
        </div>
      ) : error && items.length === 0 ? (
        <div className="rounded-[1.5rem] border border-black/10 bg-white px-6 py-12 text-center">
          <p className="text-sm font-bold">Non riesco a caricare l’Archivio social.</p>
          <p className="mt-2 text-xs text-grow-muted">{error}</p>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-[1.5rem] border border-black/10 bg-white px-6 py-12 text-center">
          <p className="text-sm font-bold">
            {items.length ? 'Nessun salvato trovato.' : 'Nessun salvato social ancora.'}
          </p>
          <p className="mt-2 text-xs text-grow-muted">
            {items.length ? 'Prova un altro filtro.' : 'Importa i preferiti da Instagram o TikTok.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-[2px] lg:grid-cols-5">
            {visibleItems.map((item, index) => (
              <SocialTile
                key={item.id}
                item={item}
                onOpen={() => setViewerIndex(index)}
                onPreview={updatePreview}
              />
            ))}
          </div>
          {hasMore && (
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void loadMore()}
              className="mt-4 min-h-12 w-full rounded-full border border-black/10 bg-white text-[10px] font-black uppercase tracking-wide disabled:opacity-50"
            >
              {loadingMore ? 'Carico…' : 'Mostra altri salvati'}
            </button>
          )}
          {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
        </>
      )}

      {viewerIndex !== null && visibleItems[viewerIndex] && (
        <SocialFeed
          items={visibleItems}
          startIndex={viewerIndex}
          total={roleFilter === 'all' ? total : resultTotal}
          copiedId={copiedId}
          feedback={feedback}
          onClose={() => setViewerIndex(null)}
          onActiveIndex={handleActiveIndex}
          onCopy={(item) => void copy(item)}
          onFeedback={(item, signal) => void registerFeedback(item, signal)}
        />
      )}
    </>
  )
}
