'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import BottomNav from '@/components/BottomNav'
import {
  airLabel,
  airTime,
  CheckButton,
  episodeCode,
  Poster,
  ProgressBar,
  progressState,
  type TvShow,
} from '@/components/tv/TvBits'
import { currentPushSubscription, disablePush, enablePush, pushSupported } from '@/lib/tv/push-client'

type Upcoming = {
  id: number
  show_id: number
  season: number
  number: number
  name: string | null
  airstamp: string
  tv_shows: { title: string; poster: string | null; network: string | null }
}

type SearchResult = { tvmaze_id: number; title: string; poster: string | null; network: string | null; status: string | null }

const TABS = [
  { id: 'vedere', label: 'Da vedere' },
  { id: 'arrivo', label: 'In arrivo' },
  { id: 'mie', label: 'Le mie serie' },
] as const
type Tab = (typeof TABS)[number]['id']

const FILTERS = [
  { id: 'tutte', label: 'Tutte' },
  { id: 'progress', label: 'In corso' },
  { id: 'uptodate', label: 'Al passo' },
  { id: 'done', label: 'Completate' },
  { id: 'new', label: 'Non iniziate' },
  { id: 'unknown', label: 'Da impostare' },
  { id: 'fav', label: 'Preferite' },
  { id: 'archivio', label: 'Non seguite' },
]

export default function SeriePage() {
  const [tab, setTab] = useState<Tab>('vedere')
  const [shows, setShows] = useState<TvShow[]>([])
  const [upcoming, setUpcoming] = useState<Upcoming[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<{ remaining: number } | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const [filter, setFilter] = useState('tutte')
  const [showNotStarted, setShowNotStarted] = useState(false)
  const [push, setPush] = useState<'on' | 'off' | 'unsupported'>('off')
  const [pushError, setPushError] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  const load = useCallback(async () => {
    const response = await fetch('/api/tv')
    const data = await response.json().catch(() => ({}))
    setShows(data.shows || [])
    setUpcoming(data.upcoming || [])
    setLoading(false)
    return (data.shows || []) as TvShow[]
  }, [])

  // Al primo avvio scarica gli episodi da TVmaze, poche serie per volta.
  const sync = useCallback(async () => {
    let remaining = 1
    setSyncing({ remaining: 0 })
    while (remaining > 0) {
      const response = await fetch('/api/tv/sync', { method: 'POST' })
      const data = await response.json().catch(() => ({ remaining: 0 }))
      if (!response.ok) break
      remaining = data.remaining
      setSyncing({ remaining })
      if (data.synced === 0) break
    }
    setSyncing(null)
    await load()
  }, [load])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void (async () => {
        const list = await load()
        const stale = list.some(
          (show) => show.tvmaze_id && (!show.synced_at || Date.now() - new Date(show.synced_at).getTime() > 20 * 3600_000)
        )
        if (stale) void sync()
      })()
      if (!pushSupported()) setPush('unsupported')
      else void currentPushSubscription().then((subscription) => setPush(subscription ? 'on' : 'off'))
    })
    return () => window.cancelAnimationFrame(frame)
  }, [load, sync])

  const [now] = useState(() => Date.now())
  const followed = useMemo(() => shows.filter((show) => show.followed), [shows])
  const toWatch = followed
    .filter((show) => show.next_episode_id && show.progress_season !== null && !(show.progress_season === 0 && show.progress_episode === 0))
    .sort((a, b) => String(b.last_watched_at || b.followed_at).localeCompare(String(a.last_watched_at || a.followed_at)))
  const unknown = followed.filter((show) => show.progress_season === null && show.aired_count > 0)
  const notStarted = followed.filter(
    (show) => show.progress_season === 0 && show.progress_episode === 0 && show.aired_count > 0
  )

  const markWatched = async (show: TvShow) => {
    if (!show.next_season || !show.next_number) return
    setBusy(show.id)
    await fetch('/api/tv/watch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ show_id: show.id, season: show.next_season, episode: show.next_number }),
    })
    await load()
    setBusy(null)
  }

  const togglePush = async () => {
    setPushError('')
    try {
      if (push === 'on') {
        await disablePush()
        setPush('off')
      } else {
        await enablePush()
        setPush('on')
      }
    } catch (error) {
      setPushError((error as Error).message)
    }
  }

  const grid = useMemo(() => {
    if (filter === 'archivio') return shows.filter((show) => !show.followed)
    return followed
      .filter((show) => {
        if (filter === 'tutte') return true
        if (filter === 'fav') return show.favorite
        return progressState(show).tone === filter
      })
      .sort((a, b) =>
        filter === 'fav'
          ? (a.favorite_position ?? 99) - (b.favorite_position ?? 99)
          : String(b.last_watched_at || '').localeCompare(String(a.last_watched_at || '')) || a.title.localeCompare(b.title)
      )
  }, [followed, shows, filter])

  const upcomingByDay = useMemo(() => {
    const groups: { day: string; items: Upcoming[] }[] = []
    for (const item of upcoming.filter((episode) => new Date(episode.airstamp).getTime() > now - 12 * 3600_000)) {
      const day = airLabel(item.airstamp)
      const last = groups[groups.length - 1]
      if (last?.day === day) last.items.push(item)
      else groups.push({ day, items: [item] })
    }
    return groups
  }, [upcoming, now])

  return (
    <main className="min-h-screen bg-grow-bg pb-28 text-grow-text lg:pb-12">
      <div className="mx-auto max-w-lg lg:max-w-3xl">
        <header className="flex items-end justify-between gap-4 px-4 pt-10 lg:px-8">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-grow-muted">GROW Serie</p>
            <h1 className="mt-2 text-[44px] leading-[0.9] font-[family-name:var(--font-tv-display)] font-normal uppercase tracking-[0.01em]">
              Serie<span className="text-grow-yellow">.</span>
            </h1>
          </div>
          <div className="flex gap-2">
            {push !== 'unsupported' && (
              <button
                type="button"
                onClick={() => void togglePush()}
                aria-label={push === 'on' ? 'Disattiva notifiche nuove puntate' : 'Attiva notifiche nuove puntate'}
                className={[
                  'flex h-11 w-11 items-center justify-center rounded-full transition-colors',
                  push === 'on' ? 'bg-grow-yellow text-grow-black' : 'border border-grow-border bg-grow-card text-grow-muted',
                ].join(' ')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                  {push !== 'on' && <line x1="3" y1="3" x2="21" y2="21" />}
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Aggiungi una serie"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-grow-black text-xl font-extrabold text-grow-yellow"
            >
              +
            </button>
          </div>
        </header>
        {pushError && <p className="mx-4 mt-3 rounded-xl bg-grow-butter px-3 py-2 text-xs font-bold lg:mx-8">{pushError}</p>}

        <nav className="sticky top-0 z-30 mt-6 grid grid-cols-3 border-b border-grow-border bg-grow-bg/95 backdrop-blur-xl">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={[
                'relative py-4 text-[12px] font-extrabold uppercase tracking-wide transition-colors',
                tab === item.id ? 'text-grow-black' : 'text-grow-muted',
              ].join(' ')}
            >
              {item.label}
              {item.id === 'vedere' && toWatch.length > 0 && (
                <span className="ml-1.5 rounded-full bg-grow-yellow px-1.5 py-0.5 text-[10px] text-grow-black">{toWatch.length}</span>
              )}
              {tab === item.id && <span className="absolute inset-x-0 bottom-0 h-1 bg-grow-black" />}
            </button>
          ))}
        </nav>

        {syncing && (
          <p className="mx-4 mt-4 rounded-xl border border-grow-border bg-grow-card px-4 py-3 text-xs font-bold text-grow-muted lg:mx-8">
            Aggiorno gli episodi da TVmaze…{syncing.remaining ? ` ancora ${syncing.remaining} serie` : ''}
          </p>
        )}

        <div className="px-4 pt-4 lg:px-8">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-24 animate-pulse rounded-2xl bg-grow-soft" />
              ))}
            </div>
          ) : followed.length === 0 ? (
            <div className="rounded-[2rem] border border-grow-border bg-grow-card px-6 py-14 text-center">
              <h2 className="text-2xl font-[family-name:var(--font-tv-display)] font-normal uppercase tracking-[0.01em]">Nessuna serie</h2>
              <p className="mt-2 text-sm text-grow-muted">Importa l’archivio TV Time o aggiungi una serie con +.</p>
            </div>
          ) : tab === 'vedere' ? (
            <>
              {toWatch.length === 0 && unknown.length === 0 && (
                <div className="rounded-[2rem] border border-grow-border bg-grow-card px-6 py-12 text-center">
                  <h2 className="text-2xl font-[family-name:var(--font-tv-display)] font-normal uppercase tracking-[0.01em]">Sei al passo</h2>
                  <p className="mt-2 text-sm text-grow-muted">Ti avviso quando esce la prossima puntata.</p>
                </div>
              )}

              <ul className="divide-y divide-grow-border">
                {toWatch.map((show) => (
                  <li key={show.id} className="flex items-center gap-3 py-3">
                    <Link href={`/serie/${show.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <Poster src={show.poster} title={show.title} className="h-[92px] w-[62px] shrink-0 rounded-lg" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[16px] font-extrabold leading-tight">{show.title}</span>
                        <span className="mt-1 block text-[12px] font-bold text-grow-muted">
                          {episodeCode(show.next_season!, show.next_number!)}
                        </span>
                        {show.next_name && <span className="mt-0.5 block truncate text-sm text-grow-text/80">{show.next_name}</span>}
                        {show.unwatched_count > 1 && (
                          <span className="mt-1 inline-block rounded-full bg-grow-soft px-2 py-0.5 text-[10px] font-extrabold uppercase text-grow-muted">
                            +{show.unwatched_count - 1} episodi
                          </span>
                        )}
                      </span>
                    </Link>
                    <CheckButton
                      checked={false}
                      busy={busy === show.id}
                      onClick={() => void markWatched(show)}
                      label={`Segna ${show.title} ${episodeCode(show.next_season!, show.next_number!)} come visto`}
                    />
                  </li>
                ))}
              </ul>

              {unknown.length > 0 && (
                <section className="mt-8">
                  <h2 className="text-xl font-[family-name:var(--font-tv-display)] font-normal uppercase tracking-[0.01em]">A che punto sei?</h2>
                  <p className="mt-1 text-xs text-grow-muted">
                    Serie che stavi guardando su TV Time: la posizione esatta non è nei dati recuperati. Tocca per impostarla.
                  </p>
                  <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {unknown.map((show) => (
                      <Link key={show.id} href={`/serie/${show.id}?imposta=1`} className="block">
                        <Poster src={show.poster} title={show.title} className="aspect-[2/3] w-full rounded-lg" />
                        <span className="mt-1 block truncate text-[11px] font-semibold">{show.title}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {notStarted.length > 0 && (
                <section className="mt-8">
                  <button
                    type="button"
                    onClick={() => setShowNotStarted((value) => !value)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <h2 className="text-xl font-[family-name:var(--font-tv-display)] font-normal uppercase tracking-[0.01em]">Non ancora iniziate ({notStarted.length})</h2>
                    <span className="text-xl font-extrabold">{showNotStarted ? '−' : '+'}</span>
                  </button>
                  {showNotStarted && (
                    <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {notStarted.map((show) => (
                        <Link key={show.id} href={`/serie/${show.id}`} className="block">
                          <Poster src={show.poster} title={show.title} className="aspect-[2/3] w-full rounded-lg" />
                          <span className="mt-1 block truncate text-[11px] font-semibold">{show.title}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          ) : tab === 'arrivo' ? (
            upcomingByDay.length === 0 ? (
              <div className="rounded-[2rem] border border-grow-border bg-grow-card px-6 py-12 text-center">
                <h2 className="text-2xl font-[family-name:var(--font-tv-display)] font-normal uppercase tracking-[0.01em]">Niente in uscita</h2>
                <p className="mt-2 text-sm text-grow-muted">Nessun episodio delle tue serie nei prossimi 30 giorni.</p>
              </div>
            ) : (
              upcomingByDay.map((group) => (
                <section key={group.day} className="mb-6">
                  <h2 className="sticky top-[53px] z-20 bg-grow-bg/95 py-2 text-[13px] font-extrabold uppercase tracking-wide backdrop-blur-xl">
                    {group.day}
                  </h2>
                  <ul className="divide-y divide-grow-border">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <Link href={`/serie/${item.show_id}`} className="flex items-center gap-3 py-3">
                          <Poster src={item.tv_shows.poster} title={item.tv_shows.title} className="h-[74px] w-[50px] shrink-0 rounded-lg" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-extrabold">{item.tv_shows.title}</span>
                            <span className="mt-0.5 block text-[12px] font-bold text-grow-muted">
                              {episodeCode(item.season, item.number)}
                              {item.name ? ` · ${item.name}` : ''}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-sm font-extrabold">{airTime(item.airstamp)}</span>
                            {item.tv_shows.network && (
                              <span className="block text-[10px] font-bold uppercase text-grow-muted">{item.tv_shows.network}</span>
                            )}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )
          ) : (
            <>
              <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-3">
                {FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    className={[
                      'shrink-0 rounded-full px-3.5 py-2 text-[11px] font-extrabold uppercase',
                      filter === item.id ? 'bg-grow-black text-grow-yellow' : 'border border-grow-border bg-grow-card text-grow-muted',
                    ].join(' ')}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="mb-3 text-[11px] font-bold uppercase text-grow-muted">{grid.length} serie</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {grid.map((show) => (
                  <Link key={show.id} href={`/serie/${show.id}`} className="group block overflow-hidden rounded-lg bg-grow-black">
                    <Poster
                      src={show.poster}
                      title={show.title}
                      className="aspect-[2/3] w-full transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <ProgressBar show={show} />
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {searchOpen && <SearchSheet onClose={() => setSearchOpen(false)} onAdded={() => void load()} />}
      <BottomNav />
    </main>
  )
}

function SearchSheet({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [adding, setAdding] = useState<number | null>(null)
  const [added, setAdded] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (query.trim().length < 2) return
    const timer = setTimeout(() => {
      void fetch(`/api/tv/search?q=${encodeURIComponent(query)}`)
        .then((response) => response.json())
        .then((data) => setResults(data.items || []))
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const add = async (item: SearchResult) => {
    setAdding(item.tvmaze_id)
    const response = await fetch('/api/tv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tvmaze_id: item.tvmaze_id }),
    })
    if (response.ok) {
      setAdded((current) => new Set(current).add(item.tvmaze_id))
      onAdded()
    }
    setAdding(null)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/40 lg:items-center lg:justify-center" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-[1.8rem] bg-grow-bg p-4 pb-8 lg:max-w-lg lg:rounded-[1.8rem]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca una serie…"
            className="h-12 flex-1 rounded-full border border-grow-border bg-grow-card px-5 text-sm font-bold outline-none focus:border-grow-black"
          />
          <button type="button" onClick={onClose} className="h-12 px-3 text-[11px] font-extrabold uppercase text-grow-muted">
            Chiudi
          </button>
        </div>
        <ul className="mt-3 divide-y divide-grow-border">
          {results.map((item) => (
            <li key={item.tvmaze_id} className="flex items-center gap-3 py-3">
              <Poster src={item.poster} title={item.title} className="h-[66px] w-[44px] shrink-0 rounded-md" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-extrabold">{item.title}</span>
                <span className="block text-[11px] text-grow-muted">
                  {[item.network, item.status === 'Ended' ? 'Conclusa' : item.status === 'Running' ? 'In onda' : item.status]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <button
                type="button"
                disabled={adding === item.tvmaze_id || added.has(item.tvmaze_id)}
                onClick={() => void add(item)}
                className="h-10 shrink-0 rounded-full bg-grow-black px-4 text-[10px] font-extrabold uppercase text-grow-yellow disabled:bg-grow-yellow disabled:text-grow-black"
              >
                {added.has(item.tvmaze_id) ? 'Seguita' : adding === item.tvmaze_id ? '…' : 'Segui'}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
