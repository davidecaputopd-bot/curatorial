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

type SearchResult = {
  tvmaze_id: number
  title: string
  poster: string | null
  network: string | null
  status: string | null
  year: string | null
  show_id: number | null
}

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

// Ordinamenti di TV Time: watch_date, follow_date, alphabetical.
const SORTS = [
  { id: 'visione', label: 'Ultima visione' },
  { id: 'follow', label: 'Seguita da' },
  { id: 'az', label: 'A-Z' },
] as const

export default function SeriePage() {
  const [tab, setTab] = useState<Tab>('vedere')
  const [shows, setShows] = useState<TvShow[]>([])
  const [upcoming, setUpcoming] = useState<Upcoming[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<{ remaining: number } | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const [filter, setFilter] = useState('tutte')
  const [showNotStarted, setShowNotStarted] = useState(false)
  const [showLater, setShowLater] = useState(false)
  const [sort, setSort] = useState<(typeof SORTS)[number]['id']>('visione')
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
  // "Guarda più tardi": resta seguita ma esce dalla lista attiva, come is_for_later di TV Time.
  const active = followed.filter((show) => !show.for_later)
  const later = followed.filter((show) => show.for_later)
  const toWatch = active
    .filter((show) => show.next_episode_id && show.progress_season !== null && !(show.progress_season === 0 && show.progress_episode === 0))
    .sort((a, b) => String(b.last_watched_at || b.followed_at).localeCompare(String(a.last_watched_at || a.followed_at)))
  const unknown = active.filter((show) => show.progress_season === null && show.aired_count > 0)
  const notStarted = active.filter(
    (show) => show.progress_season === 0 && show.progress_episode === 0 && show.aired_count > 0
  )

  const markWatched = async (show: TvShow) => {
    if (!show.next_season || !show.next_number) return
    setBusy(show.id)
    try {
      await fetch('/api/tv/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ show_id: show.id, season: show.next_season, episode: show.next_number }),
      })
      await load()
    } finally {
      setBusy(null)
    }
  }

  const setForLater = async (show: TvShow, value: boolean) => {
    setBusy(show.id)
    try {
      await fetch('/api/tv', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: show.id, for_later: value }),
      })
      await load()
    } finally {
      setBusy(null)
    }
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
      .sort((a, b) => {
        if (filter === 'fav') return (a.favorite_position ?? 99) - (b.favorite_position ?? 99)
        if (sort === 'az') return a.title.localeCompare(b.title)
        const key = sort === 'follow' ? 'followed_at' : 'last_watched_at'
        return String(b[key] || '').localeCompare(String(a[key] || '')) || a.title.localeCompare(b.title)
      })
  }, [followed, shows, filter, sort])

  // Statistiche del profilo TV Time: episodi visti, tempo passato, serie finite.
  const stats = useMemo(() => {
    const minutes = followed.reduce((sum, show) => sum + (show.watched_minutes || 0), 0)
    return {
      episodes: followed.reduce(
        (sum, show) => sum + (show.progress_season === null ? 0 : Math.max(show.aired_count - show.unwatched_count, 0)),
        0
      ),
      days: Math.floor(minutes / 1440),
      hours: Math.floor((minutes % 1440) / 60),
      completed: followed.filter((show) => progressState(show).tone === 'done').length,
    }
  }, [followed])

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
              className="flex h-11 items-center gap-1.5 rounded-full bg-grow-black pl-3.5 pr-4 text-[11px] font-extrabold uppercase text-grow-yellow"
            >
              <span aria-hidden className="text-lg leading-none">+</span>
              Aggiungi
            </button>
          </div>
        </header>
        {pushError && <p className="mx-4 mt-3 rounded-xl bg-grow-butter px-3 py-2 text-xs font-bold lg:mx-8">{pushError}</p>}

        <nav role="tablist" className="sticky top-0 z-30 mt-6 grid grid-cols-3 border-b border-grow-border bg-grow-bg/95 backdrop-blur-xl">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
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
              <p className="mt-2 text-sm text-grow-muted">Importa l’archivio TV Time o aggiungi una serie con Aggiungi.</p>
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
                  <h2 className="text-xl font-[family-name:var(--font-tv-display)] font-normal uppercase tracking-[0.01em]">A che punto sei? ({unknown.length})</h2>
                  <p className="mt-1 text-xs text-grow-muted">
                    Serie che stavi guardando su TV Time: la posizione esatta non è nei dati recuperati.
                  </p>
                  <Link
                    href="/serie/imposta"
                    className="mt-3 flex h-12 items-center justify-center rounded-full bg-grow-black text-[11px] font-extrabold uppercase text-grow-yellow"
                  >
                    Imposta una dopo l’altra →
                  </Link>
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

              {later.length > 0 && (
                <section className="mt-8">
                  <button
                    type="button"
                    aria-expanded={showLater}
                    onClick={() => setShowLater((value) => !value)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <h2 className="text-xl font-[family-name:var(--font-tv-display)] font-normal uppercase tracking-[0.01em]">Guarda più tardi ({later.length})</h2>
                    <span className="text-xl font-extrabold">{showLater ? '−' : '+'}</span>
                  </button>
                  {showLater && (
                    <ul className="mt-2 divide-y divide-grow-border">
                      {later.map((show) => (
                        <li key={show.id} className="flex items-center gap-3 py-3">
                          <Link href={`/serie/${show.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                            <Poster src={show.poster} title={show.title} className="h-[66px] w-[44px] shrink-0 rounded-md" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[15px] font-extrabold">{show.title}</span>
                              <span className="block text-[12px] font-bold text-grow-muted">
                                {show.next_season && show.next_number ? `Riprendi da ${episodeCode(show.next_season, show.next_number)}` : progressState(show).label}
                              </span>
                            </span>
                          </Link>
                          <button
                            type="button"
                            disabled={busy === show.id}
                            onClick={() => void setForLater(show, false)}
                            className="h-10 shrink-0 rounded-full border border-grow-border px-4 text-[10px] font-extrabold uppercase disabled:opacity-50"
                          >
                            Riprendi
                          </button>
                        </li>
                      ))}
                    </ul>
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
                            {item.number === 1 && (
                              <span className="mt-1 inline-block rounded-full bg-grow-yellow px-2 py-0.5 text-[10px] font-extrabold uppercase text-grow-black">
                                {item.season === 1 ? 'Nuova serie' : 'Nuova stagione'}
                              </span>
                            )}
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
              <dl className="mb-4 grid grid-cols-3 divide-x divide-grow-border border-y border-grow-border py-3 text-center">
                <div>
                  <dt className="text-[10px] font-bold uppercase text-grow-muted">Episodi visti</dt>
                  <dd className="text-2xl font-[family-name:var(--font-tv-display)] tabular-nums">{stats.episodes.toLocaleString('it-IT')}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase text-grow-muted">Tempo</dt>
                  <dd className="text-2xl font-[family-name:var(--font-tv-display)] tabular-nums">
                    {stats.days}g {stats.hours}h
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase text-grow-muted">Completate</dt>
                  <dd className="text-2xl font-[family-name:var(--font-tv-display)] tabular-nums">{stats.completed}</dd>
                </div>
              </dl>
              <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-3">
                {FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={filter === item.id}
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
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase text-grow-muted">{grid.length} serie</p>
                {filter !== 'fav' && (
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as typeof sort)}
                    aria-label="Ordina le serie"
                    className="h-9 rounded-full border border-grow-border bg-grow-card px-3 text-[11px] font-extrabold uppercase"
                  >
                    {SORTS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {filter === 'tutte' && (
                  <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    className="flex aspect-[2/3] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-grow-black/30 text-grow-black"
                  >
                    <span aria-hidden className="text-3xl font-extrabold leading-none">+</span>
                    <span className="text-[11px] font-extrabold uppercase">Aggiungi serie</span>
                  </button>
                )}
                {grid.map((show) => (
                  <Link
                    key={show.id}
                    href={`/serie/${show.id}`}
                    aria-label={`${show.title} · ${progressState(show).label}`}
                    className="group block overflow-hidden rounded-lg bg-grow-black"
                  >
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
  const [added, setAdded] = useState<Map<number, number>>(new Map())
  const [error, setError] = useState('')
  const [searched, setSearched] = useState('')

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return
    const timer = setTimeout(() => {
      void fetch(`/api/tv/search?q=${encodeURIComponent(q)}`)
        .then((response) => response.json())
        .then((data) => {
          setResults(data.items || [])
          setSearched(q)
        })
        .catch(() => setSearched(q))
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const showId = (item: SearchResult) => added.get(item.tvmaze_id) ?? item.show_id

  // Sotto i 2 caratteri non mostra i risultati della ricerca precedente.
  const visible = query.trim().length < 2 ? [] : results

  const add = async (item: SearchResult) => {
    setAdding(item.tvmaze_id)
    setError('')
    const response = await fetch('/api/tv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tvmaze_id: item.tvmaze_id }),
    })
    if (response.ok) {
      const data = await response.json()
      setAdded((current) => new Map(current).set(item.tvmaze_id, data.show.id))
      onAdded()
    } else {
      setError(`Non sono riuscito ad aggiungere ${item.title}. Riprova.`)
    }
    setAdding(null)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/40 lg:items-center lg:justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Aggiungi una serie"
        className="max-h-[85dvh] w-full overflow-y-auto overscroll-contain rounded-t-[1.8rem] bg-grow-bg p-4 pb-[max(2rem,env(safe-area-inset-bottom))] lg:max-w-lg lg:rounded-[1.8rem]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            type="search"
            enterKeyHint="search"
            aria-label="Cerca una serie"
            placeholder="Cerca una serie…"
            className="h-12 flex-1 rounded-full border border-grow-border bg-grow-card px-5 text-base font-bold outline-none focus:border-grow-black"
          />
          <button type="button" onClick={onClose} className="h-12 px-3 text-[11px] font-extrabold uppercase text-grow-muted">
            Chiudi
          </button>
        </div>
        {error && <p className="mt-3 rounded-xl bg-grow-butter px-3 py-2 text-xs font-bold">{error}</p>}
        {query.trim().length < 2 && (
          <p className="py-8 text-center text-sm text-grow-muted">Scrivi il titolo: le puntate arrivano da TVmaze.</p>
        )}
        {visible.length === 0 && searched === query.trim() && searched.length >= 2 && (
          <p className="py-8 text-center text-sm text-grow-muted">Nessuna serie trovata per “{searched}”.</p>
        )}
        <ul className="mt-3 divide-y divide-grow-border">
          {visible.map((item) => (
            <li key={item.tvmaze_id} className="flex items-center gap-3 py-3">
              <Poster src={item.poster} title={item.title} className="h-[66px] w-[44px] shrink-0 rounded-md" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-extrabold">{item.title}</span>
                <span className="block text-[11px] text-grow-muted">
                  {[item.year, item.network, item.status === 'Ended' ? 'Conclusa' : item.status === 'Running' ? 'In onda' : item.status]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              {showId(item) ? (
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <Link
                    href={`/serie/${showId(item)}${added.has(item.tvmaze_id) ? '?imposta=1' : ''}`}
                    className="flex h-10 items-center rounded-full bg-grow-yellow px-4 text-[10px] font-extrabold uppercase text-grow-black"
                  >
                    {added.has(item.tvmaze_id) ? 'A che punto sei' : 'Apri'}
                  </Link>
                  <span className="text-[10px] font-bold uppercase text-grow-muted">Seguita</span>
                </span>
              ) : (
                <button
                  type="button"
                  disabled={adding === item.tvmaze_id}
                  onClick={() => void add(item)}
                  className="h-10 shrink-0 rounded-full bg-grow-black px-4 text-[10px] font-extrabold uppercase text-grow-yellow disabled:opacity-60"
                >
                  {adding === item.tvmaze_id ? 'Aggiungo…' : 'Segui'}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
