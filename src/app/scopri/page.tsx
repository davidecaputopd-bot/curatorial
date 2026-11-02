'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import BottomNav from '@/components/BottomNav'
import SaveHeart from '@/components/SaveHeart'

type DiscoveryMode = 'mix' | 'for_you' | 'outside_bubble'
type CategoryMode =
  | 'all'
  | 'branding'
  | 'typography'
  | 'fashion'
  | 'interior_design'
  | 'art'
  | 'web'

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
  onSelect,
}: {
  item: DiscoveryItem
  saved: boolean
  onLess: (id: string) => void
  onSelect: (item: DiscoveryItem) => void
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
      className="group relative block h-full overflow-hidden rounded-2xl bg-grow-card shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]"
    >
      <button
        type="button"
        aria-label={`Esplora ${item.title || 'reference'}`}
        onClick={() => onSelect(item)}
        className="absolute inset-0 z-10"
      />
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
          <span className="rounded-full bg-grow-text px-2 py-1 text-[11px] font-bold text-grow-black">
            Fuori bolla
          </span>
        )}
        {item.platform && PLATFORM_LABELS[item.platform] && (
          <span className="rounded-full bg-black/55 px-2 py-1 text-[11px] font-bold text-white backdrop-blur-xl">
            {PLATFORM_LABELS[item.platform]}
          </span>
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3 pr-[6.5rem] text-white">
        {item.artist_name && (
          <p className="truncate text-xs font-medium text-white/75">
            {item.artist_name}
          </p>
        )}
        <p className="mt-0.5 line-clamp-2 text-[13px] font-bold leading-tight">
          {item.title || 'Reference senza titolo'}
        </p>
      </div>

      <div className="absolute bottom-2 right-2 z-30 flex gap-1">
        <button
          type="button"
          onClick={(event) => void teach(event, 'less')}
          aria-label="Meno contenuti così"
          className="grow-press flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-xl font-bold text-white backdrop-blur-xl hover:bg-grow-yellow hover:text-grow-black"
        >
          −
        </button>
        <button
          type="button"
          onClick={(event) => void teach(event, 'more')}
          aria-label="Più contenuti così"
          className={[
            'grow-press flex h-11 w-11 items-center justify-center rounded-full text-xl font-bold backdrop-blur-xl',
            preference === 'more'
              ? 'grow-object bg-grow-yellow text-grow-black'
              : 'bg-black/55 text-white hover:bg-grow-yellow hover:text-grow-black',
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
  const [similarItems, setSimilarItems] = useState<DiscoveryItem[] | null>(null)
  const [similarTitle, setSimilarTitle] = useState('')
  const [selected, setSelected] = useState<DiscoveryItem | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<DiscoveryMode>('mix')
  const [category, setCategory] = useState<CategoryMode>('all')
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
        ? (similarItems || items).filter(
            (item) => category === 'all' || item.category === category
          )
        : (similarItems || items).filter(
            (item) =>
              item.discovery_mode === mode &&
              (category === 'all' || item.category === category)
          ),
    [category, items, mode, similarItems]
  )

  const findSimilar = async (item: DiscoveryItem) => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/discovery/similar?id=${encodeURIComponent(item.id)}`
      )
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Ricerca non disponibile')
      setSimilarItems(payload.items || [])
      setSimilarTitle(item.title || 'questa reference')
      setMode('mix')
      setCategory('all')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setSimilarItems([])
      setSimilarTitle(item.title || 'questa reference')
    } finally {
      setLoading(false)
    }
  }

  const selectReference = (item: DiscoveryItem) => {
    setSelected(item)
    void fetch('/api/interact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_id: item.id, action: 'open' }),
    })
  }

  return (
    <main className="min-h-[100dvh] bg-grow-bg pb-28 text-grow-text lg:pb-12">
      <div className="mx-auto max-w-lg px-4 pt-10 lg:max-w-6xl lg:px-8">
        <header className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="grow-page-title">
              Scopri<span className="text-grow-yellow">.</span>
            </h1>
            <p className="mt-4 max-w-sm text-[13px] leading-snug text-grow-muted">
              80% del tuo gusto. 20% di deviazioni utili.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              setSimilarItems(null)
              setSimilarTitle('')
              setSeed((current) => current + 1)
            }}
            className="grow-press grow-surface min-h-11 shrink-0 rounded-full px-4 text-[13px] font-semibold text-grow-text"
          >
            Cambia selezione
          </button>
        </header>

        {similarItems && (
          <div className="grow-surface mb-5 flex items-center justify-between gap-3 rounded-[1.4rem] py-3 pl-4 pr-3">
            <div className="min-w-0">
              <p className="text-[13px] text-grow-muted">
                Costellazione visuale
              </p>
              <p className="mt-0.5 truncate text-[15px] font-bold">
                Simili a {similarTitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSimilarItems(null)
                setSimilarTitle('')
              }}
              className="grow-press min-h-11 shrink-0 rounded-full bg-grow-soft px-4 text-sm font-semibold text-grow-text"
            >
              Torna al mix
            </button>
          </div>
        )}

        <div className="scrollbar-hide -mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1">
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
                'grow-press min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold',
                mode === value
                  ? 'grow-object bg-grow-text text-grow-black'
                  : 'grow-surface text-grow-muted',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="scrollbar-hide -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
          {[
            ['all', 'Tutto'],
            ['branding', 'Branding'],
            ['typography', 'Tipo'],
            ['fashion', 'Moda'],
            ['interior_design', 'Spazi'],
            ['art', 'Arte'],
            ['web', 'Digital'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value as CategoryMode)}
              className={[
                'grow-press min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold',
                category === value
                  ? 'grow-object bg-grow-text text-grow-black'
                  : 'grow-surface text-grow-muted',
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
                className="animate-pulse rounded-2xl bg-grow-card"
              />
            ))}
          </div>
        ) : visible.length > 0 ? (
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
                      similarItems
                        ? setSimilarItems((current) =>
                            (current || []).filter((candidate) => candidate.id !== id)
                          )
                        : setItems((current) =>
                            current.filter((candidate) => candidate.id !== id)
                          )
                    }
                    onSelect={selectReference}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="grow-surface rounded-[1.4rem] px-6 py-8">
            <p className="font-display text-[22px] leading-tight">Niente in questo taglio</p>
            <button
              type="button"
              onClick={() => {
                setMode('mix')
                setCategory('all')
                setSimilarItems(null)
                setSimilarTitle('')
              }}
              className="grow-press grow-object mt-4 min-h-11 rounded-full bg-grow-text px-5 text-sm font-bold text-grow-black"
            >
              Torna al mix
            </button>
          </div>
        )}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-[70] flex items-end bg-black/60 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={selected.title || 'Reference selezionata'}
            onClick={(event) => event.stopPropagation()}
            className="grow-surface mx-auto max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_-24px_48px_-12px_rgba(0,0,0,.7)]"
          >
            <div className="relative max-h-[52dvh] min-h-72 overflow-hidden bg-grow-soft">
              <SaveHeart
                itemId={selected.id}
                initialSaved={savedIds.has(selected.id)}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.image_url || ''}
                alt={selected.title || 'Reference'}
                className="max-h-[52dvh] min-h-72 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Chiudi"
                className="grow-press absolute left-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-xl font-bold text-white backdrop-blur-xl"
              >
                ×
              </button>
            </div>

            <div className="p-5 pb-8">
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-grow-muted">
                {selected.category && <span>{selected.category}</span>}
                {selected.platform && PLATFORM_LABELS[selected.platform] && (
                  <>
                    <span>·</span>
                    <span>{PLATFORM_LABELS[selected.platform]}</span>
                  </>
                )}
                {selected.discovery_mode === 'outside_bubble' && (
                  <span className="rounded-full bg-grow-text px-2 py-0.5 text-xs font-bold text-grow-black">
                    Fuori bolla
                  </span>
                )}
              </div>
              <h2 className="mt-3 font-display text-[28px] leading-none [text-wrap:balance]">
                {selected.title || 'Reference senza titolo'}
              </h2>
              {selected.artist_name && (
                <p className="mt-2 text-[15px] text-grow-muted">
                  {selected.artist_name}
                </p>
              )}
              {selected.summary && (
                <p className="mt-4 line-clamp-4 text-[15px] leading-relaxed text-grow-text/85">
                  {selected.summary}
                </p>
              )}

              <div className="mt-6 grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const item = selected
                    setSelected(null)
                    void findSimilar(item)
                  }}
                  className="grow-press grow-object min-h-12 rounded-full bg-grow-yellow px-4 text-[15px] font-bold text-grow-black"
                >
                  Trova simili
                </button>
              </div>

              {selected.url && (
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grow-press mt-2 flex min-h-12 items-center justify-center rounded-full bg-grow-soft text-[15px] font-semibold text-grow-text"
                >
                  Apri fonte originale
                </a>
              )}
            </div>
          </section>
        </div>
      )}
      <BottomNav />
    </main>
  )
}
