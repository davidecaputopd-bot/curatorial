'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  CaretLeft,
  CaretRight,
  ChatCircleDots,
} from '@phosphor-icons/react'
import BottomNav from '@/components/BottomNav'
import SaveHeart from '@/components/SaveHeart'
import type {
  BrainFeedbackSignal,
  DailyBrainBrief,
  DailyBrainCard,
} from '@/lib/brain/daily-brief'

const PAGE_SIZE = 18
const FEED_CEILING = 18
const DAILY_FEED_SEED = Math.floor(Date.now() / 86_400_000)

const PLATFORM_LABELS: Record<string, string> = {
  arena: 'Are.na',
  unsplash: 'Unsplash',
  pexels: 'Pexels',
}

const placeholders: Record<string, string> = {
  branding: 'https://images.unsplash.com/photo-1634942537034-2531766767d1?w=900&q=80',
  typography: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=900&q=80',
  interior_design: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=900&q=80',
  fashion: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80',
  web: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=900&q=80',
  ai: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=900&q=80',
  art: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=900&q=80',
  social_design: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=900&q=80',
  design: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=900&q=80',
  lifestyle: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=900&q=80',
}

type FeedItem = {
  id: string
  title?: string | null
  image_url?: string | null
  category?: string | null
  platform?: string | null
  artist_name?: string | null
  url?: string | null
  height?: number | null
  width?: number | null
}

type ChatItem = {
  id: string
  created_at: string
}

function romeHour(date: Date) {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Rome',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(date)
  )
}

function SafeImage({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className: string
}) {
  const [failed, setFailed] = useState(false)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={failed ? placeholders.design : src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  )
}

const FEEDBACK_LABELS: Array<{
  signal: BrainFeedbackSignal
  label: string
}> = [
  { signal: 'keep', label: 'Tieni' },
  { signal: 'not_now', label: 'Non ora' },
  { signal: 'not_for_me', label: 'Non per me' },
]

const BRAIN_KIND_LABELS: Record<DailyBrainCard['kind'], string> = {
  dont_miss: 'Ora',
  resume: 'Riprendi',
  possibility: 'Esplora',
}

function BrainBriefCard({
  card,
  feedback,
  onFeedback,
  position,
  total,
  onPrevious,
  onNext,
}: {
  card: DailyBrainCard
  feedback?: BrainFeedbackSignal
  onFeedback: (card: DailyBrainCard, signal: BrainFeedbackSignal) => void
  position: number
  total: number
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-[#FFFDF8]">
      {card.image_url && (
        <div className="relative h-44 overflow-hidden bg-grow-soft sm:h-52">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.image_url}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          {card.outside_bubble && (
            <span className="absolute bottom-3 left-3 bg-grow-yellow px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-black">
              Fuori bolla
            </span>
          )}
        </div>
      )}

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-grow-muted">
              {BRAIN_KIND_LABELS[card.kind]} · {card.eyebrow}
            </p>
            <h3 className="mt-3 text-[25px] font-bold leading-[1.02] tracking-[-0.035em] text-grow-text sm:text-[30px]">
              {card.title}
            </h3>
          </div>
          <span className="font-mono shrink-0 text-[10px] text-grow-muted">
            {String(position + 1).padStart(2, '0')}/
            {String(total).padStart(2, '0')}
          </span>
        </div>

        <p className="mt-4 max-w-xl text-sm leading-relaxed text-grow-muted">
          {card.summary}
        </p>

        <div className="mt-5 border-l-2 border-grow-yellow pl-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-grow-muted">
            Perché ora
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-grow-text/75">
            {card.reason}
          </p>
          <p className="mt-1.5 text-[10px] text-grow-muted">
            {card.evidence.filter(Boolean).join(' · ')}
          </p>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <Link
            href={card.href}
            className="inline-flex min-h-11 flex-1 items-center justify-between rounded-full bg-[#0F0F10] px-4 text-[11px] font-bold text-white transition active:scale-[0.98]"
          >
            <span>{card.action_label}</span>
            <span className="text-grow-yellow">→</span>
          </Link>
          <button
            type="button"
            onClick={onPrevious}
            disabled={total < 2}
            aria-label="Scelta precedente"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-grow-muted disabled:opacity-30"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={total < 2}
            aria-label="Scelta successiva"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-grow-text disabled:opacity-30"
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>

        {card.kind !== 'dont_miss' && (
          <div className="mt-5 border-t border-black/[0.08] pt-4">
            {feedback ? (
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-grow-muted">
                Capito. GROW ne terrà conto.
              </p>
            ) : (
              <div className="flex items-center gap-1">
                <span className="mr-auto text-[11px] text-grow-muted">
                  Ti serve?
                </span>
                {FEEDBACK_LABELS.map((option) => (
                  <button
                    key={option.signal}
                    type="button"
                    onClick={() => onFeedback(card, option.signal)}
                    className="min-h-11 rounded-full px-3 text-[10px] font-medium text-grow-muted transition hover:bg-grow-soft hover:text-grow-text active:scale-[0.98]"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

function ImageCard({
  item,
  saved,
  onDwell,
  onLess,
}: {
  item: FeedItem
  saved: boolean
  onDwell: (id: string, seconds: number) => void
  onLess: (id: string) => void
}) {
  const enteredAt = useRef(0)
  const [preference, setPreference] = useState<'more' | 'less' | null>(null)
  const image =
    item.image_url ||
    placeholders[item.category || 'design'] ||
    placeholders.design
  const href = item.url && item.url !== '#' ? item.url : undefined

  const stopDwell = () => {
    if (!enteredAt.current) return
    const seconds = (Date.now() - enteredAt.current) / 1000
    enteredAt.current = 0
    if (seconds >= 3) onDwell(item.id, seconds)
  }

  const teachFeed = async (
    event: React.MouseEvent<HTMLButtonElement>,
    direction: 'more' | 'less'
  ) => {
    event.preventDefault()
    event.stopPropagation()
    if (preference) return
    setPreference(direction)
    try {
      const response = await fetch('/api/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_id: item.id,
          action: direction === 'more' ? 'more_like_this' : 'less_like_this',
        }),
      })
      if (!response.ok) throw new Error('Feedback non salvato')
      if (direction === 'less') onLess(item.id)
    } catch {
      setPreference(null)
    }
  }

  return (
    <a
      href={href}
      target={href ? '_blank' : undefined}
      rel="noopener noreferrer"
      onClick={() => {
        if (!href) return
        void fetch('/api/interact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content_id: item.id, action: 'open' }),
        })
      }}
      className="group relative block h-full w-full overflow-hidden rounded-[1.35rem] bg-grow-soft"
      onMouseEnter={() => {
        enteredAt.current = Date.now()
      }}
      onMouseLeave={stopDwell}
      onTouchStart={() => {
        enteredAt.current = Date.now()
      }}
      onTouchEnd={stopDwell}
    >
      <SaveHeart itemId={item.id} initialSaved={saved} />
      <SafeImage
        src={image}
        alt={item.title || 'Reference'}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.045]"
      />
      {item.platform && PLATFORM_LABELS[item.platform] && (
        <span className="absolute left-2 top-2 z-20 rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-[#0F0F10] backdrop-blur-xl">
          {PLATFORM_LABELS[item.platform]}
        </span>
      )}
      <div className="absolute bottom-2 right-2 z-30 flex gap-1">
        <button
          type="button"
          onClick={(event) => void teachFeed(event, 'less')}
          aria-label="Meno contenuti così"
          title="Meno così"
          className={[
            'flex h-7 w-7 items-center justify-center rounded-full border border-white/25 text-sm font-black backdrop-blur-xl transition',
            preference === 'less'
              ? 'bg-white text-black'
              : 'bg-black/35 text-white/80 hover:bg-white hover:text-black',
          ].join(' ')}
        >
          −
        </button>
        <button
          type="button"
          onClick={(event) => void teachFeed(event, 'more')}
          aria-label="Più contenuti così"
          title="Più così"
          className={[
            'flex h-7 w-7 items-center justify-center rounded-full border border-white/25 text-sm font-black backdrop-blur-xl transition',
            preference === 'more'
              ? 'bg-grow-yellow text-black'
              : 'bg-black/35 text-white/80 hover:bg-grow-yellow hover:text-black',
          ].join(' ')}
        >
          +
        </button>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent">
        <div className="absolute inset-x-0 bottom-0 p-3">
          {item.artist_name && (
            <p className="truncate text-[11px] font-bold text-white/90">
              {item.artist_name}
            </p>
          )}
          {item.title && (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-white/75">
              {item.title}
            </p>
          )}
        </div>
      </div>
    </a>
  )
}

export default function Home() {
  const [images, setImages] = useState<FeedItem[]>([])
  const [loadingImages, setLoadingImages] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [hasUnreadChat, setHasUnreadChat] = useState(false)
  const [dailyBrief, setDailyBrief] = useState<DailyBrainBrief | null>(null)
  const [loadingBrain, setLoadingBrain] = useState(true)
  const [brainIndex, setBrainIndex] = useState(0)
  const [brainFeedback, setBrainFeedback] = useState<
    Record<string, BrainFeedbackSignal>
  >({})
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const fetchFeedPage = (offset: number) =>
    fetch(
      `/api/feed?type=image&limit=${PAGE_SIZE}&offset=${offset}&seed=${DAILY_FEED_SEED}`
    ).then((response) => response.json())

  useEffect(() => {
    let cancelled = false

    Promise.all([
      fetchFeedPage(0),
      fetch('/api/saved').then((response) => response.json()),
      fetch('/api/inbox?source=chat').then((response) => response.json()),
    ])
      .then(([feed, saved, chat]) => {
        if (cancelled) return
        const feedItems = (feed.items || []) as FeedItem[]
        const chatItems = (chat.items || []) as ChatItem[]
        const latestChat = chatItems[0]
        const lastSeen = localStorage.getItem('grow_chat_last_seen')

        setImages(feedItems)
        setHasMore(Boolean(feed.hasMore) && feedItems.length < FEED_CEILING)
        setSavedIds(
          new Set(
            ((saved.items || []) as { id: string }[]).map((item) => item.id)
          )
        )
        setHasUnreadChat(
          Boolean(
            latestChat &&
              (!lastSeen ||
                new Date(latestChat.created_at).getTime() >
                  new Date(lastSeen).getTime())
          )
        )
      })
      .catch(() => {
        if (!cancelled) setHasMore(false)
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingImages(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/ai/brief')
      .then((response) => response.json())
      .then((data) => {
        if (cancelled || !data.brief) return
        setDailyBrief(data.brief as DailyBrainBrief)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingBrain(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const element = sentinelRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        if (loadingMore || loadingImages || !hasMore) return

        setLoadingMore(true)
        const offset = images.length
        fetchFeedPage(offset)
          .then((data) => {
            const newItems = (data.items || []) as FeedItem[]
            setImages((current) => [...current, ...newItems])
            setHasMore(
              Boolean(data.hasMore) &&
                offset + newItems.length < FEED_CEILING &&
                newItems.length > 0
            )
          })
          .catch(() => setHasMore(false))
          .finally(() => setLoadingMore(false))
      },
      { rootMargin: '600px' }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [hasMore, images.length, loadingImages, loadingMore])

  const registerBrainFeedback = async (
    card: DailyBrainCard,
    signal: BrainFeedbackSignal
  ) => {
    if (brainFeedback[card.id]) return
    setBrainFeedback((current) => ({ ...current, [card.id]: signal }))
    try {
      const response = await fetch('/api/brain/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signal,
          source_type: card.source_type,
          source_id: card.source_id,
          content_id: card.content_id,
          title: card.title,
        }),
      })
      if (!response.ok) throw new Error('Feedback non salvato')
    } catch {
      setBrainFeedback((current) => {
        const next = { ...current }
        delete next[card.id]
        return next
      })
    }
  }

  const now = new Date()
  const currentHour = romeHour(now)
  const greeting =
    currentHour < 12
      ? 'Buongiorno'
      : currentHour < 18
        ? 'Buon pomeriggio'
        : 'Buonasera'
  const brainCards = dailyBrief?.cards || []
  const activeBrainIndex = Math.min(
    brainIndex,
    Math.max(0, brainCards.length - 1)
  )
  const activeBrainCard = brainCards[activeBrainIndex]

  const handleDwell = async (itemId: string, seconds: number) => {
    try {
      await fetch('/api/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_id: itemId,
          action: 'dwell',
          read_seconds: Math.round(seconds),
        }),
      })
    } catch {}
  }

  return (
    <main className="min-h-screen bg-grow-bg pb-28 text-grow-text lg:pb-12">
      <div className="mx-auto max-w-lg px-4 pt-10 lg:max-w-6xl lg:px-8">
        <header className="mb-8 flex min-h-[7.25rem] items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-grow-muted">
              {greeting}
            </p>
            <h1 className="mt-2 text-[42px] font-black uppercase leading-[0.88] tracking-tighter">
              Oggi<span className="text-grow-yellow">.</span>
            </h1>
            <Link
              href="/chat"
              className="relative mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0F0F10] px-4 text-[11px] font-bold text-white transition active:scale-[0.98]"
            >
              <ChatCircleDots
                size={17}
                weight="bold"
                className="text-grow-yellow"
              />
              Chat veloce
              {hasUnreadChat && (
                <>
                  <span
                    className="h-2 w-2 rounded-full bg-grow-yellow"
                    aria-hidden="true"
                  />
                  <span className="sr-only">Nuovi messaggi</span>
                </>
              )}
            </Link>
          </div>
          <div className="flex min-w-[7.5rem] flex-col items-end">
            <div className="flex h-[5.75rem] w-[5.25rem] items-end justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon-1.svg"
                alt="Seme GROW"
                className="w-[4.6rem] object-contain"
              />
            </div>
            <p className="mt-1 text-right font-mono text-[9px] uppercase tracking-[0.12em] text-grow-muted">
              {now.toLocaleDateString('it-IT', {
                timeZone: 'Europe/Rome',
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>
        </header>

        <section aria-labelledby="daily-edit-title">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-grow-muted">
                Cervello GROW
              </p>
              <h2
                id="daily-edit-title"
                className="mt-1 text-[29px] font-bold leading-none tracking-[-0.04em]"
              >
                Daily Edit
              </h2>
            </div>
            <Link
              href="/ai?brief=Leggi%20GROW%20e%20dimmi%20la%20singola%20mossa%20pi%C3%B9%20utile%20ora."
              className="text-[11px] font-bold text-grow-muted transition hover:text-grow-text"
            >
              Chiedi a GROW →
            </Link>
          </div>

          {loadingBrain ? (
            <div className="h-[26rem] animate-pulse rounded-[1.5rem] border border-black/5 bg-white/70" />
          ) : activeBrainCard ? (
            <BrainBriefCard
              key={activeBrainCard.id}
              card={activeBrainCard}
              feedback={brainFeedback[activeBrainCard.id]}
              position={activeBrainIndex}
              total={brainCards.length}
              onPrevious={() =>
                setBrainIndex((current) =>
                  (current - 1 + brainCards.length) % brainCards.length
                )
              }
              onNext={() =>
                setBrainIndex((current) => (current + 1) % brainCards.length)
              }
              onFeedback={(selected, signal) =>
                void registerBrainFeedback(selected, signal)
              }
            />
          ) : (
            <div className="rounded-[1.5rem] border border-black/10 bg-[#FFFDF8] px-5 py-12">
              <p className="text-base font-bold">Nessun segnale forte oggi.</p>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-grow-muted">
                GROW non inventa una priorità quando Piano, Inbox e Archivio
                non offrono abbastanza contesto.
              </p>
              <Link
                href="/inbox"
                className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#0F0F10] px-4 text-[11px] font-bold text-white"
              >
                Aggiungi una nota
              </Link>
            </div>
          )}

          <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-grow-muted">
            Piano · Inbox · Archivio · si aggiorna con le tue scelte
          </p>
        </section>

        <section id="scopri" className="mt-12 scroll-mt-6">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-grow-muted">
                Selezione visiva
              </p>
              <h2 className="mt-1 text-[28px] font-black uppercase leading-none">
                Scopri<span className="text-grow-yellow">.</span>
              </h2>
            </div>
            <Link
              href="/scopri"
              className="text-[10px] font-black uppercase text-grow-muted"
            >
              Apri Scopri →
            </Link>
          </div>

          {loadingImages ? (
            <div className="grid auto-rows-[122px] grid-cols-3 gap-2">
              {Array.from({ length: 12 }).map((_, index) => (
                <div
                  key={index}
                  className={[
                    'animate-pulse rounded-[1.35rem] bg-grow-soft',
                    index % 7 === 0 ? 'row-span-2' : '',
                  ].join(' ')}
                />
              ))}
            </div>
          ) : images.length === 0 ? (
            <div className="rounded-[2rem] border border-grow-border bg-grow-card p-6 text-center">
              <p className="text-sm font-bold text-grow-muted">
                Nessuna reference disponibile.
              </p>
            </div>
          ) : (
            <div className="grid auto-rows-[122px] grid-cols-3 gap-2 lg:grid-cols-6">
              {images.map((item, index) => {
                const portrait = (item.height || 0) > (item.width || 0)
                const tall = index % 7 === 0 || index % 13 === 0 || portrait
                return (
                  <div
                    key={item.id}
                    className={tall ? 'row-span-2' : 'row-span-1'}
                  >
                    <ImageCard
                      item={item}
                      saved={savedIds.has(item.id)}
                      onDwell={handleDwell}
                      onLess={(itemId) =>
                        setImages((current) =>
                          current.filter((candidate) => candidate.id !== itemId)
                        )
                      }
                    />
                  </div>
                )
              })}
            </div>
          )}

          {!loadingImages && images.length > 0 && (
            <div
              ref={sentinelRef}
              className="flex h-16 items-center justify-center"
            >
              {loadingMore && (
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-grow-muted">
                  Carico altre reference…
                </span>
              )}
            </div>
          )}
        </section>
      </div>

      <BottomNav />
    </main>
  )
}
