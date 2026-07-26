'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
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

const STATUS_LABELS: Record<string, string> = {
  idea: 'Idea',
  in_produzione: 'In produzione',
  pronto: 'Pronto',
  pubblicato: 'Pubblicato',
  da_riciclare: 'Da riciclare',
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

type CalendarItem = {
  id: string
  client: string
  title: string
  content_type?: string | null
  status: string
  scheduled_date?: string | null
}

type InboxItem = {
  id: string
  content?: string | null
  url?: string | null
  created_at: string
}

function localDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || ''
  const year = value('year')
  const month = value('month')
  const day = value('day')
  return `${year}-${month}-${day}`
}

function shortDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('it-IT', {
    timeZone: 'Europe/Rome',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
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

function timeAgo(value: string) {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60_000)
  if (minutes < 1) return 'adesso'
  if (minutes < 60) return `${minutes}m fa`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h fa`
  return `${Math.floor(hours / 24)}g fa`
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
  { signal: 'useful_now', label: 'Utile' },
  { signal: 'nourishment', label: 'Nutrimento' },
  { signal: 'personal', label: 'Personale' },
  { signal: 'not_for_me', label: 'Non per me' },
  { signal: 'used', label: 'Già usato' },
]

function BrainBriefCard({
  card,
  feedback,
  onFeedback,
}: {
  card: DailyBrainCard
  feedback?: BrainFeedbackSignal
  onFeedback: (card: DailyBrainCard, signal: BrainFeedbackSignal) => void
}) {
  return (
    <article className="rounded-[1.15rem] border border-white/10 bg-white/[0.055] p-4">
      <div className="flex items-start gap-3">
        <span
          className={[
            'mt-1 h-8 w-1 shrink-0 rounded-full',
            card.kind === 'dont_miss' ? 'bg-grow-yellow' : 'bg-white/20',
          ].join(' ')}
        />
        <div className="min-w-0 flex-1">
          <p
            className={[
              'text-[9px] font-black uppercase tracking-[0.16em]',
              card.kind === 'dont_miss'
                ? 'text-grow-yellow'
                : 'text-white/40',
            ].join(' ')}
          >
            {card.eyebrow}
          </p>
          <h3 className="mt-1 text-sm font-black leading-tight text-white">
            {card.title}
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-white/55">
            {card.summary}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={card.href}
              className={[
                'rounded-full px-3 py-2 text-[9px] font-black uppercase tracking-wide active:scale-[0.98]',
                card.kind === 'dont_miss'
                  ? 'bg-grow-yellow text-black'
                  : 'bg-white text-black',
              ].join(' ')}
            >
              {card.action_label} →
            </Link>
            <details className="group">
              <summary className="cursor-pointer list-none rounded-full border border-white/10 px-3 py-2 text-[9px] font-black uppercase tracking-wide text-white/45">
                Perché
              </summary>
              <div className="mt-2 rounded-xl bg-black/25 p-3">
                <p className="max-w-md text-[10px] leading-relaxed text-white/60">
                  {card.reason}
                </p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-white/30">
                  {card.evidence.filter(Boolean).join(' · ')}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {FEEDBACK_LABELS.map((option) => (
                    <button
                      key={option.signal}
                      type="button"
                      disabled={Boolean(feedback)}
                      onClick={() => onFeedback(card, option.signal)}
                      className={[
                        'rounded-full border px-2.5 py-1.5 text-[8px] font-black uppercase tracking-wide transition disabled:cursor-default',
                        feedback === option.signal
                          ? 'border-grow-yellow bg-grow-yellow text-black'
                          : 'border-white/10 text-white/45 hover:border-white/25 hover:text-white/70 disabled:opacity-35',
                      ].join(' ')}
                    >
                      {feedback === option.signal ? 'Registrato' : option.label}
                    </button>
                  ))}
                </div>
              </div>
            </details>
          </div>
        </div>
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
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([])
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([])
  const [loadingImages, setLoadingImages] = useState(true)
  const [loadingWork, setLoadingWork] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [hasUnreadChat, setHasUnreadChat] = useState(false)
  const [inboxTotal, setInboxTotal] = useState(0)
  const [dailyBrief, setDailyBrief] = useState<DailyBrainBrief | null>(null)
  const [loadingBrain, setLoadingBrain] = useState(true)
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
      fetch('/api/calendar').then((response) => response.json()),
      fetch('/api/inbox').then((response) => response.json()),
      fetch('/api/inbox?source=chat').then((response) => response.json()),
      fetch('/api/inbox?lane=notes&limit=12').then((response) =>
        response.json()
      ),
    ])
      .then(([feed, saved, calendar, inbox, chat, manualInbox]) => {
        if (cancelled) return
        const feedItems = (feed.items || []) as FeedItem[]
        const chatItems = (chat.items || []) as InboxItem[]
        const latestChat = chatItems[0]
        const lastSeen = localStorage.getItem('grow_chat_last_seen')

        setImages(feedItems)
        setHasMore(Boolean(feed.hasMore) && feedItems.length < FEED_CEILING)
        setSavedIds(
          new Set(
            ((saved.items || []) as { id: string }[]).map((item) => item.id)
          )
        )
        setCalendarItems((calendar.items || []) as CalendarItem[])
        setInboxTotal(Number(inbox.total || inbox.items?.length || 0))
        setInboxItems((manualInbox.items || []) as InboxItem[])
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
          setLoadingWork(false)
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
  const today = localDateKey(now)
  const upcomingItems = calendarItems
    .filter(
      (item) =>
        item.scheduled_date &&
        item.scheduled_date > today &&
        item.status !== 'pubblicato'
    )
    .sort((a, b) =>
      String(a.scheduled_date).localeCompare(String(b.scheduled_date))
    )
    .slice(0, 4)
  const activeItems = calendarItems
    .filter(
      (item) =>
        item.status === 'in_produzione' || item.status === 'pronto'
    )
    .slice(0, 4)
  const currentHour = romeHour(now)
  const greeting =
    currentHour < 12
      ? 'Buongiorno'
      : currentHour < 18
        ? 'Buon pomeriggio'
        : 'Buonasera'

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
        <header className="mb-7 flex min-h-[7.25rem] items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-grow-muted">
              {greeting}
            </p>
            <h1 className="mt-2 text-[38px] font-black uppercase leading-[0.88] tracking-tighter">
              Oggi<span className="text-grow-yellow">.</span>
            </h1>
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
            <p className="mt-1 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-grow-muted">
              {now.toLocaleDateString('it-IT', {
                timeZone: 'Europe/Rome',
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>
        </header>

        <section className="mb-5 grid grid-cols-3 gap-2 lg:hidden">
          <Link
            href="/chat"
            className="relative min-h-[76px] rounded-[1.25rem] bg-[#0F0F10] p-3 text-white shadow-[0_14px_34px_rgba(15,15,16,0.16)] active:scale-[0.98]"
          >
            {hasUnreadChat && (
              <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-grow-yellow" />
            )}
            <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-grow-yellow">
              Chat
            </span>
            <span className="mt-2 block text-[12px] font-black uppercase leading-tight">
              Veloce
            </span>
            <span className="mt-1 block text-[9px] font-bold uppercase tracking-wide text-white/40">
              Telefono
            </span>
          </Link>

          <Link
            href="/inbox"
            className="min-h-[76px] rounded-[1.25rem] border border-grow-border bg-white p-3 text-grow-text active:scale-[0.98]"
          >
            <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-grow-muted">
              Nota
            </span>
            <span className="mt-2 block text-[12px] font-black uppercase leading-tight">
              Inbox
            </span>
            <span className="mt-1 block text-[9px] font-bold uppercase tracking-wide text-grow-muted">
              Taccuino
            </span>
          </Link>

          <Link
            href="/ai"
            className="min-h-[76px] rounded-[1.25rem] bg-grow-yellow p-3 text-[#0F0F10] shadow-[0_14px_34px_rgba(255,229,0,0.22)] active:scale-[0.98]"
          >
            <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-black/55">
              AI
            </span>
            <span className="mt-2 block text-[12px] font-black uppercase leading-tight">
              Regia
            </span>
            <span className="mt-1 block text-[9px] font-bold uppercase tracking-wide text-black/45">
              Ragiona
            </span>
          </Link>
        </section>

        <section className="grid gap-3 lg:grid-cols-[1.45fr_0.8fr]">
          <div className="rounded-[1.5rem] bg-[#0F0F10] p-5 text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                  Cervello operativo
                </p>
                <h2 className="mt-1 text-xl font-black uppercase">
                  Regia di oggi
                </h2>
              </div>
              <Link
                href="/ai?brief=Leggi%20GROW%20e%20dimmi%20la%20singola%20mossa%20pi%C3%B9%20utile%20ora."
                className="rounded-full border border-white/15 px-3 py-2 text-[9px] font-black uppercase text-white/60"
              >
                Chiedi a GROW →
              </Link>
            </div>

            <div className="mt-4 space-y-2">
              {loadingBrain ? (
                <>
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-28 animate-pulse rounded-[1.15rem] bg-white/5"
                    />
                  ))}
                </>
              ) : dailyBrief?.cards.length ? (
                dailyBrief.cards.map((card) => (
                  <BrainBriefCard
                    key={card.id}
                    card={card}
                    feedback={brainFeedback[card.id]}
                    onFeedback={(selected, signal) =>
                      void registerBrainFeedback(selected, signal)
                    }
                  />
                ))
              ) : (
                <div className="rounded-[1.1rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-bold">Nessun segnale forte.</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/45">
                    GROW non inventa una priorità quando i dati non bastano.
                  </p>
                </div>
              )}
            </div>
          </div>

          <Link
            href="/inbox"
            className="flex min-h-44 flex-col justify-between rounded-[1.5rem] border border-grow-border bg-grow-card p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-grow-muted">
                  Taccuino
                </p>
                <h2 className="mt-1 text-xl font-black uppercase">Inbox</h2>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-grow-yellow text-lg font-black">
                +
              </span>
            </div>
            <div>
              <p className="text-4xl font-black">{inboxTotal}</p>
              <p className="mt-1 text-xs leading-relaxed text-grow-muted">
                Note, link e salvati social. Li interpreta GROW quando servono.
              </p>
            </div>
          </Link>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-grow-muted">
                  Prossime
                </p>
                <h2 className="mt-1 text-lg font-black uppercase">Scadenze</h2>
              </div>
              <Link
                href="/calendario"
                className="text-[10px] font-black uppercase text-grow-muted"
              >
                Vedi piano
              </Link>
            </div>
            <div className="overflow-hidden rounded-[1.5rem] border border-grow-border bg-grow-card">
              {loadingWork ? (
                <div className="h-36 animate-pulse bg-grow-soft" />
              ) : upcomingItems.length ? (
                upcomingItems.map((item) => (
                  <Link
                    key={item.id}
                    href="/calendario"
                    className="flex items-center gap-3 border-t border-grow-border px-4 py-3 first:border-t-0"
                  >
                    <span className="w-16 shrink-0 text-[9px] font-black uppercase text-grow-muted">
                      {shortDate(item.scheduled_date!)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-grow-muted">
                        {item.client}
                      </span>
                    </span>
                  </Link>
                ))
              ) : (
                <p className="px-5 py-10 text-center text-sm text-grow-muted">
                  Nessuna scadenza futura.
                </p>
              )}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-grow-muted">
                  Continua
                </p>
                <h2 className="mt-1 text-lg font-black uppercase">
                  Lavori aperti
                </h2>
              </div>
              <Link
                href="/ai"
                className="rounded-full bg-[#0F0F10] px-3 py-2 text-[9px] font-black uppercase text-grow-yellow"
              >
                Lavora in AI →
              </Link>
            </div>
            <div className="overflow-hidden rounded-[1.5rem] border border-grow-border bg-grow-card">
              {loadingWork ? (
                <div className="h-36 animate-pulse bg-grow-soft" />
              ) : activeItems.length ? (
                activeItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/ai?project=${encodeURIComponent(item.client)}&brief=${encodeURIComponent(item.title)}`}
                    className="flex items-center gap-3 border-t border-grow-border px-4 py-3 first:border-t-0"
                  >
                    <span className="h-8 w-1 shrink-0 rounded-full bg-grow-yellow" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-[10px] font-bold uppercase text-grow-muted">
                        {item.client} · {STATUS_LABELS[item.status]}
                      </span>
                    </span>
                    <span className="text-grow-muted">→</span>
                  </Link>
                ))
              ) : (
                <p className="px-5 py-10 text-center text-sm text-grow-muted">
                  Nessun lavoro in produzione.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="rounded-[1.4rem] border border-grow-border bg-grow-card px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-grow-muted">
                  Ultime note
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-bold">
                  {inboxItems[0]?.content ||
                    inboxItems[0]?.url ||
                    'Il taccuino è vuoto.'}
                </p>
              </div>
              {inboxItems[0] && (
                <span className="ml-4 shrink-0 text-[9px] font-bold uppercase text-grow-muted">
                  {timeAgo(inboxItems[0].created_at)}
                </span>
              )}
            </div>
          </div>
        </section>

        <section id="scopri" className="mt-10 scroll-mt-6">
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
