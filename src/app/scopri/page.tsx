'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import BottomNav from '@/components/BottomNav'
import SaveHeart from '@/components/SaveHeart'

type DiscoveryMode = 'mix' | 'for_you' | 'outside_bubble'

type DiscoveryItem = {
  id: string
  title?: string | null
  summary?: string | null
  image_url?: string | null
  url?: string | null
  platform?: string | null
  artist_name?: string | null
  category?: string | null
  width?: number | null
  height?: number | null
  discovery_mode?: 'for_you' | 'outside_bubble'
}

const PLATFORM_LABELS: Record<string, string> = {
  arena: 'Are.na',
  unsplash: 'Unsplash',
  pexels: 'Pexels',
}

const INITIAL_DISCOVERY_SEED = Math.floor(Date.now() / 86_400_000)

function DiscoveryCard({
  item,
  saved,
  onLess,
}: {
  item: DiscoveryItem
  saved: boolean
  onLess: (id: string) => void
}) {
  const enteredAt = useRef(0)
  const [preference, setPreference] = useState<'more' | 'less' | null>(null)

  const teach = async (
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

  const recordDwell = () => {
    if (!enteredAt.current) return
    const seconds = Math.round((Date.now() - enteredAt.current) / 1000)
    enteredAt.current = 0
    if (seconds < 3) return
    void fetch('/api/interact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content_id: item.id,
        action: 'dwell',
        read_seconds: seconds,
      }),
    })
  }

  return (
    <article
      onMouseEnter={() => {
        enteredAt.current = Date.now()
      }}
      onMouseLeave={recordDwell}
      onTouchStart={() => {
        enteredAt.current = Date.now()
      }}
      onTouchEnd={recordDwell}
      className="group relative block h-full overflow-hidden rounded-[1.35rem] bg-grow-soft"
    >
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Apri ${item.title || 'reference'}`}
          className="absolute inset-0 z-10"
        />
      )}
      <SaveHeart itemId={item.id} initialSaved={saved} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.image_url || ''}
        alt={item.title || 'Reference'}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"
      />

      <div className="absolute left-2 top-2 z-20 flex flex-wrap gap-1">
        {item.discovery_mode === 'outside_bubble' && (
          <span className="rounded-full bg-grow-yellow px-2 py-1 text-[8px] font-black uppercase tracking-wide text-black">
            Fuori bolla
          </span>
        )}
        {item.platform && PLATFORM_LABELS[item.platform] && (
          <span className="rounded-full bg-white/90 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-black backdrop-blur-xl">
            {PLATFORM_LABELS[item.platform]}
          </span>
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
      <div className="absolute inset-x-0 bottom-0 z-10 p-3 pr-20 text-white">
        {item.artist_name && (
          <p className="truncate text-[10px] font-black uppercase text-white/55">
            {item.artist_name}
          </p>
        )}
        <p className="mt-0.5 line-clamp-2 text-xs font-bold leading-tight">
          {item.title || 'Reference senza titolo'}
        </p>
      </div>

      <div className="absolute bottom-2 right-2 z-30 flex gap-1">
        <button
          type="button"
          onClick={(event) => void teach(event, 'less')}
          aria-label="Meno contenuti così"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-black/40 text-sm font-black text-white backdrop-blur-xl hover:bg-white hover:text-black"
        >
          −
        </button>
        <button
          type="button"
          onClick={(event) => void teach(event, 'more')}
          aria-label="Più contenuti così"
          className={[
            'flex h-8 w-8 items-center justify-center rounded-full border border-white/25 text-sm font-black backdrop-blur-xl',
            preference === 'more'
              ? 'bg-grow-yellow text-black'
              : 'bg-black/40 text-white hover:bg-grow-yellow hover:text-black',
          ].join(' ')}
        >
          +
        </button>
      </div>
    </article>
  )
}

export default function ScopriPage() {
  const [items, setItems] = useState<DiscoveryItem[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<DiscoveryMode>('mix')
  const [seed, setSeed] = useState(INITIAL_DISCOVERY_SEED)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch(`/api/feed?type=image&limit=60&seed=${seed}`).then((response) =>
        response.json()
      ),
      fetch('/api/saved').then((response) => response.json()),
    ])
      .then(([feed, saved]) => {
        if (cancelled) return
        setItems(feed.items || [])
        setSavedIds(
          new Set(
            ((saved.items || []) as { id: string }[]).map((item) => item.id)
          )
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [seed])

  const visible = useMemo(
    () =>
      mode === 'mix'
        ? items
        : items.filter((item) => item.discovery_mode === mode),
    [items, mode]
  )

  return (
    <main className="min-h-screen bg-grow-bg pb-28 text-grow-text">
      <div className="mx-auto max-w-lg px-4 pt-10 lg:max-w-6xl lg:px-8">
        <header className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-grow-muted">
              Selezione quotidiana
            </p>
            <h1 className="mt-2 text-[38px] font-black uppercase leading-[0.88] tracking-tighter">
              Scopri<span className="text-grow-yellow">.</span>
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-grow-muted">
              80% del tuo gusto. 20% di deviazioni utili.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              setSeed((current) => current + 1)
            }}
            className="rounded-full bg-[#0F0F10] px-3 py-2 text-[9px] font-black uppercase text-grow-yellow"
          >
            Cambia selezione
          </button>
        </header>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {[
            ['mix', 'Mix 80/20'],
            ['for_you', 'Per te'],
            ['outside_bubble', 'Fuori bolla'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value as DiscoveryMode)}
              className={[
                'shrink-0 rounded-full px-4 py-2 text-[10px] font-black uppercase',
                mode === value
                  ? 'bg-[#0F0F10] text-grow-yellow'
                  : 'border border-grow-border bg-grow-card text-grow-muted',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid auto-rows-[150px] grid-cols-2 gap-2 lg:grid-cols-5">
            {Array.from({ length: 12 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-[1.35rem] bg-grow-soft"
              />
            ))}
          </div>
        ) : (
          <div className="grid auto-rows-[160px] grid-cols-2 gap-2 lg:grid-cols-5">
            {visible.map((item, index) => {
              const portrait = (item.height || 0) > (item.width || 0)
              const tall = portrait || index % 9 === 0
              return (
                <div key={item.id} className={tall ? 'row-span-2' : 'row-span-1'}>
                  <DiscoveryCard
                    item={item}
                    saved={savedIds.has(item.id)}
                    onLess={(id) =>
                      setItems((current) =>
                        current.filter((candidate) => candidate.id !== id)
                      )
                    }
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
