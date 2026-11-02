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
import { useTilt } from '@/components/useTilt'

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

// Pallino di stato accanto ai filtri: stesso colore della barra sotto il poster.
const FILTER_DOTS: Record<string, string> = {
  progress: 'bg-grow-yellow',
  uptodate: 'bg-grow-ok',
  done: 'bg-grow-done',
  new: 'bg-grow-border',
  unknown: 'bg-grow-ring',
}

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

  const [next, ...rest] = toWatch
  const tabIndex = TABS.findIndex((item) => item.id === tab)

  return (
    <main className="min-h-screen bg-grow-bg pb-32 text-grow-text lg:pb-12">
      <div className="mx-auto max-w-lg lg:max-w-3xl">
        <header className="flex items-end justify-between gap-4 px-5 pt-10 lg:px-8">
          <h1 className="grow-page-title">
            Serie<span className="text-grow-yellow">.</span>
          </h1>
          <div className="flex gap-2">
            {push !== 'unsupported' && (
              <button
                type="button"
                onClick={() => void togglePush()}
                aria-label={push === 'on' ? 'Disattiva notifiche nuove puntate' : 'Attiva notifiche nuove puntate'}
                className={[
                  'grow-press flex h-11 w-11 items-center justify-center rounded-full',
                  push === 'on' ? 'grow-object bg-grow-yellow text-grow-black' : 'grow-surface text-grow-muted',
                ].join(' ')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
              className="grow-press grow-object flex h-11 w-11 items-center justify-center rounded-full bg-grow-text text-grow-black"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        </header>
        {pushError && <p className="mx-5 mt-3 rounded-2xl bg-grow-butter px-4 py-3 text-sm lg:mx-8">{pushError}</p>}

        <div className="sticky top-0 z-30 bg-grow-bg/90 px-5 pb-3 pt-5 backdrop-blur-xl lg:px-8">
          <nav role="tablist" className="grow-surface relative grid grid-cols-3 rounded-full p-1">
            <span
              aria-hidden
              className="grow-object absolute bottom-1 left-1 top-1 rounded-full bg-grow-text transition-transform duration-500 ease-spring"
              style={{ width: 'calc((100% - 8px) / 3)', transform: `translateX(${tabIndex * 100}%)` }}
            />
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={[
                  'relative z-10 flex min-h-11 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-colors',
                  tab === item.id ? 'text-grow-black' : 'text-grow-muted',
                ].join(' ')}
              >
                {item.label}
                {item.id === 'vedere' && toWatch.length > 0 && (
                  <span className={['text-[13px] font-extrabold tabular-nums', tab === item.id ? 'grow-glow-on' : 'grow-glow'].join(' ')}>
                    {toWatch.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {syncing && (
          <p className="grow-surface mx-5 mt-2 flex items-center gap-3 rounded-2xl px-4 py-3 text-[13px] lg:mx-8">
            <span aria-hidden className="ds-pulse-dot h-2 w-2 shrink-0 rounded-full bg-grow-time" />
            Aggiorno gli episodi da TVmaze…{syncing.remaining ? ` ancora ${syncing.remaining} serie` : ''}
          </p>
        )}

        <div className="px-5 pt-3 lg:px-8">
          {loading ? (
            <div className="space-y-3 pt-2">
              <div className="h-[236px] animate-pulse rounded-[1.75rem] bg-grow-card" />
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-24 animate-pulse rounded-[1.4rem] bg-grow-card" />
              ))}
            </div>
          ) : followed.length === 0 ? (
            <Empty title="Nessuna serie" text="Importa l’archivio TV Time o aggiungi la prima serie.">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="grow-press grow-object mt-4 min-h-12 rounded-full bg-grow-yellow px-5 text-[15px] font-bold text-grow-black"
              >
                Aggiungi una serie
              </button>
            </Empty>
          ) : tab === 'vedere' ? (
            <div className="space-y-8 pt-2">
              {next ? (
                <NextUp show={next} busy={busy === next.id} onWatched={() => void markWatched(next)} />
              ) : (
                unknown.length === 0 && (
                  <section className="grow-surface rounded-[1.75rem] p-5">
                    <p className="text-[13px] font-semibold text-grow-muted">Adesso</p>
                    <h2 className="mt-4 font-display text-4xl leading-[0.95]">Sei al passo.</h2>
                    <p className="mt-3 text-[15px] leading-snug text-grow-muted">Ti avviso quando esce la prossima puntata.</p>
                  </section>
                )
              )}

              {rest.length > 0 && (
                <section>
                  <SectionHead title="Poi" meta={`${rest.length} serie`} />
                  <ul className="grow-surface divide-y divide-grow-border overflow-hidden rounded-[1.4rem]">
                    {rest.map((show) => (
                      <li key={show.id} className="flex items-center gap-3 p-3">
                        <Link href={`/serie/${show.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                          <Poster src={show.poster} title={show.title} className="h-[72px] w-12 shrink-0 rounded-lg" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[17px] font-bold leading-tight">{show.title}</span>
                            <span className="mt-1 block truncate text-[13px] tabular-nums text-grow-muted">
                              <span className="text-grow-text">{episodeCode(show.next_season!, show.next_number!)}</span>
                              {show.unwatched_count > 1 ? ` · altri ${show.unwatched_count - 1}` : ''}
                              {show.next_name ? ` · ${show.next_name}` : ''}
                            </span>
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
                </section>
              )}

              {unknown.length > 0 && (
                <section className="space-y-3">
                  <Link
                    href="/serie/imposta"
                    className="grow-press grow-object flex items-center gap-4 rounded-[1.4rem] bg-grow-fix py-4 pl-5 pr-4 text-grow-black"
                  >
                    <span className="font-display text-[44px] leading-none">{unknown.length}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold">A che punto sei?</span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-grow-black/75">
                        Serie da TV Time senza posizione. Una dopo l’altra, un tocco ciascuna.
                      </span>
                    </span>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-grow-black text-grow-text">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </Link>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {unknown.map((show) => (
                      <Link key={show.id} href={`/serie/${show.id}?imposta=1`} className="grow-press block">
                        <Poster src={show.poster} title={show.title} className="aspect-[2/3] w-full rounded-lg" />
                        <span className="mt-1.5 block truncate text-xs font-semibold">{show.title}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {notStarted.length > 0 && (
                <section>
                  <Toggle title="Non ancora iniziate" count={notStarted.length} open={showNotStarted} onToggle={() => setShowNotStarted((value) => !value)} />
                  {showNotStarted && (
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {notStarted.map((show) => (
                        <Link key={show.id} href={`/serie/${show.id}`} className="grow-press block">
                          <Poster src={show.poster} title={show.title} className="aspect-[2/3] w-full rounded-lg" />
                          <span className="mt-1.5 block truncate text-xs font-semibold">{show.title}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {later.length > 0 && (
                <section>
                  <Toggle title="Guarda più tardi" count={later.length} open={showLater} onToggle={() => setShowLater((value) => !value)} />
                  {showLater && (
                    <ul className="grow-surface divide-y divide-grow-border overflow-hidden rounded-[1.4rem]">
                      {later.map((show) => (
                        <li key={show.id} className="flex items-center gap-3 p-3">
                          <Link href={`/serie/${show.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                            <Poster src={show.poster} title={show.title} className="h-[66px] w-11 shrink-0 rounded-lg" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[17px] font-bold leading-tight">{show.title}</span>
                              <span className="mt-1 block text-[13px] tabular-nums text-grow-muted">
                                {show.next_season && show.next_number ? `Riprendi da ${episodeCode(show.next_season, show.next_number)}` : progressState(show).label}
                              </span>
                            </span>
                          </Link>
                          <button
                            type="button"
                            disabled={busy === show.id}
                            onClick={() => void setForLater(show, false)}
                            className="grow-press min-h-11 shrink-0 rounded-full bg-grow-soft px-4 text-sm font-semibold disabled:opacity-50"
                          >
                            Riprendi
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </div>
          ) : tab === 'arrivo' ? (
            upcomingByDay.length === 0 ? (
              <Empty title="Niente in uscita" text="Nessun episodio delle tue serie nei prossimi 30 giorni." />
            ) : (
              <div className="space-y-8 pt-2">
                {upcomingByDay.map((group) => (
                  <section key={group.day}>
                    <SectionHead title={group.day.charAt(0).toUpperCase() + group.day.slice(1)} meta={group.items.length === 1 ? '1 episodio' : `${group.items.length} episodi`} />
                    <ul className="grow-surface divide-y divide-grow-border overflow-hidden rounded-[1.4rem]">
                      {group.items.map((item) => (
                        <li key={item.id}>
                          <Link href={`/serie/${item.show_id}`} className="flex items-center gap-3 p-3">
                            <Poster src={item.tv_shows.poster} title={item.tv_shows.title} className="h-[72px] w-12 shrink-0 rounded-lg" />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className="truncate text-[17px] font-bold leading-tight">{item.tv_shows.title}</span>
                                {item.number === 1 && (
                                  <span className="shrink-0 rounded-md bg-grow-time px-1.5 py-0.5 text-[11px] font-extrabold text-grow-black">
                                    {item.season === 1 ? 'Nuova serie' : 'Nuova stagione'}
                                  </span>
                                )}
                              </span>
                              <span className="mt-1 block truncate text-[13px] tabular-nums text-grow-muted">
                                {episodeCode(item.season, item.number)}
                                {item.name ? ` · ${item.name}` : ''}
                              </span>
                            </span>
                            <span className="shrink-0 pr-1 text-right">
                              <span className="block text-[17px] font-bold tabular-nums">{airTime(item.airstamp)}</span>
                              {item.tv_shows.network && <span className="block text-xs text-grow-muted">{item.tv_shows.network}</span>}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-6 pt-2">
              <dl className="grid grid-cols-[1.2fr_1fr] gap-2">
                <div className="grow-object row-span-2 flex min-h-[188px] flex-col justify-between rounded-[1.4rem] bg-grow-done p-4 text-grow-black">
                  <dt className="text-[13px] font-semibold text-grow-black/70">Episodi visti</dt>
                  <dd className="font-display text-[52px] leading-none">{stats.episodes.toLocaleString('it-IT')}</dd>
                </div>
                <div className="grow-object flex min-h-[90px] flex-col justify-between rounded-[1.4rem] bg-grow-time p-4 text-grow-black">
                  <dt className="text-[13px] font-semibold text-grow-black/70">Tempo</dt>
                  <dd className="font-display text-3xl leading-none">
                    {stats.days}g {stats.hours}h
                  </dd>
                </div>
                <div className="grow-surface flex min-h-[90px] flex-col justify-between rounded-[1.4rem] p-4">
                  <dt className="text-[13px] font-semibold text-grow-muted">Completate</dt>
                  <dd className="font-display text-3xl leading-none">{stats.completed}</dd>
                </div>
              </dl>
              <div>
                <div className="scrollbar-hide -mx-5 flex gap-2 overflow-x-auto px-5 pb-3 lg:-mx-8 lg:px-8">
                  {FILTERS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={filter === item.id}
                      onClick={() => setFilter(item.id)}
                      className={[
                        'grow-press flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold',
                        filter === item.id ? 'grow-object bg-grow-text text-grow-black' : 'grow-surface text-grow-muted',
                      ].join(' ')}
                    >
                      {FILTER_DOTS[item.id] && <span aria-hidden className={`h-2 w-2 rounded-full ${FILTER_DOTS[item.id]}`} />}
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[13px] tabular-nums text-grow-muted">{grid.length} serie</p>
                  {filter !== 'fav' && (
                    <select
                      value={sort}
                      onChange={(event) => setSort(event.target.value as typeof sort)}
                      aria-label="Ordina le serie"
                      className="grow-surface h-11 rounded-full px-4 text-[13px] font-semibold text-grow-text"
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
                      className="grow-press flex aspect-[2/3] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-grow-ring text-grow-muted"
                    >
                      <span aria-hidden className="text-3xl font-bold leading-none">+</span>
                      <span className="text-xs font-semibold">Aggiungi serie</span>
                    </button>
                  )}
                  {grid.map((show) => {
                    const state = progressState(show)
                    return (
                      <Link
                        key={show.id}
                        href={`/serie/${show.id}`}
                        aria-label={`${show.title} · ${state.label}`}
                        className="grow-press group relative block overflow-hidden rounded-xl bg-grow-card"
                      >
                        {state.tone === 'done' && (
                          <span aria-hidden className="absolute right-1.5 top-1.5 z-10 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-grow-done text-grow-black shadow-e1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                        )}
                        {state.tone === 'uptodate' && (
                          <span aria-hidden className="absolute right-1.5 top-1.5 z-10 rounded-full bg-grow-ok px-1.5 py-0.5 text-[10px] font-extrabold text-grow-black shadow-e1">
                            Al passo
                          </span>
                        )}
                        <Poster src={show.poster} title={show.title} className="aspect-[2/3] w-full" />
                        <ProgressBar show={show} />
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {searchOpen && <SearchSheet onClose={() => setSearchOpen(false)} onAdded={() => void load()} />}
      <BottomNav />
    </main>
  )
}

// Il prossimo episodio: l'unico blocco giallo della schermata, si inclina verso il dito.
function NextUp({ show, busy, onWatched }: { show: TvShow; busy: boolean; onWatched: () => void }) {
  const tilt = useTilt<HTMLElement>(7)
  const code = episodeCode(show.next_season!, show.next_number!)
  return (
    <section {...tilt} aria-label="Prossimo episodio" className="grow-block grow-tilt mt-4 rounded-[1.75rem] p-5">
      <p className="text-[13px] font-semibold text-grow-black/70">Adesso</p>
      <h2 className="grow-z1 mt-4 max-w-[64%] font-display text-[36px] leading-[0.95] [text-wrap:balance]">{show.title}</h2>
      <p className="mt-3 max-w-[62%] text-[15px] leading-snug">
        <b className="block font-bold tabular-nums">{code}</b>
        {show.next_name || 'Prossimo episodio'}
      </p>
      <Link
        href={`/serie/${show.id}`}
        aria-label={`Apri ${show.title}`}
        className="absolute -top-4 right-5 block w-[92px]"
        style={{ transform: 'translateZ(46px) rotate(6deg)' }}
      >
        <Poster
          src={show.poster}
          title={show.title}
          className="aspect-[2/3] w-full rounded-lg shadow-[0_1px_1px_rgba(0,0,0,.3),0_6px_10px_-2px_rgba(0,0,0,.35),0_22px_30px_-10px_rgba(0,0,0,.55)]"
        />
      </Link>
      <div className="grow-z2 mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={onWatched}
          aria-label={`Segna ${show.title} ${code} come visto`}
          className="grow-press flex h-14 items-center gap-3 rounded-full bg-grow-black pl-1.5 pr-5 text-[15px] font-bold text-grow-text shadow-[inset_0_1px_0_rgba(255,255,255,.14),var(--e2)] disabled:opacity-60"
        >
          <span className="grow-object flex h-11 w-11 items-center justify-center rounded-full bg-grow-yellow text-grow-black">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          {busy ? 'Salvo…' : 'Visto'}
        </button>
        <span className="text-[13px] font-semibold text-grow-black/70">
          {show.unwatched_count > 1 ? `poi altri ${show.unwatched_count - 1}` : 'ultimo uscito'}
        </span>
      </div>
    </section>
  )
}

function SectionHead({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="grow-section-title">{title}</h2>
      {meta && <span className="text-[13px] tabular-nums text-grow-muted">{meta}</span>}
    </div>
  )
}

function Toggle({ title, count, open, onToggle }: { title: string; count: number; open: boolean; onToggle: () => void }) {
  return (
    <button type="button" aria-expanded={open} onClick={onToggle} className="mb-3 flex min-h-11 w-full items-center justify-between gap-3 text-left">
      <h2 className="grow-section-title">{title}</h2>
      <span className="flex items-center gap-2 text-[13px] tabular-nums text-grow-muted">
        {count}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={open ? 'rotate-180 transition-transform' : 'transition-transform'}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </button>
  )
}

function Empty({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="grow-surface mt-2 rounded-[1.4rem] px-6 py-8">
      <h2 className="font-display text-[22px] leading-tight">{title}</h2>
      <p className="mt-2 max-w-[30ch] text-[15px] text-grow-muted">{text}</p>
      {children}
    </div>
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
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60 backdrop-blur-sm lg:items-center lg:justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Aggiungi una serie"
        className="grow-surface max-h-[85dvh] w-full overflow-y-auto overscroll-contain rounded-t-[2rem] p-5 pb-[max(2rem,env(safe-area-inset-bottom))] lg:max-w-lg lg:rounded-[2rem]"
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
            className="h-12 flex-1 rounded-full border border-transparent bg-grow-soft px-5 text-base font-semibold text-grow-text outline-none placeholder:text-grow-muted focus:border-grow-yellow"
          />
          <button type="button" onClick={onClose} className="min-h-11 px-3 text-sm font-semibold text-grow-muted">
            Chiudi
          </button>
        </div>
        {error && <p className="mt-3 rounded-2xl bg-grow-butter px-4 py-3 text-sm">{error}</p>}
        {query.trim().length < 2 && (
          <p className="py-8 text-center text-[15px] text-grow-muted">Scrivi il titolo: le puntate arrivano da TVmaze.</p>
        )}
        {visible.length === 0 && searched === query.trim() && searched.length >= 2 && (
          <p className="py-8 text-center text-[15px] text-grow-muted">Nessuna serie trovata per “{searched}”.</p>
        )}
        <ul className="mt-3 divide-y divide-grow-border">
          {visible.map((item) => (
            <li key={item.tvmaze_id} className="flex items-center gap-3 py-3">
              <Poster src={item.poster} title={item.title} className="h-[66px] w-11 shrink-0 rounded-lg" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px] font-bold">{item.title}</span>
                <span className="block text-[13px] text-grow-muted">
                  {[item.year, item.network, item.status === 'Ended' ? 'Conclusa' : item.status === 'Running' ? 'In onda' : item.status]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              {showId(item) ? (
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <Link
                    href={`/serie/${showId(item)}${added.has(item.tvmaze_id) ? '?imposta=1' : ''}`}
                    className="grow-press grow-object flex min-h-11 items-center rounded-full bg-grow-yellow px-4 text-sm font-bold text-grow-black"
                  >
                    {added.has(item.tvmaze_id) ? 'A che punto sei' : 'Apri'}
                  </Link>
                  <span className="text-xs text-grow-muted">Seguita</span>
                </span>
              ) : (
                <button
                  type="button"
                  disabled={adding === item.tvmaze_id}
                  onClick={() => void add(item)}
                  className="grow-press grow-object min-h-11 shrink-0 rounded-full bg-grow-yellow px-4 text-sm font-bold text-grow-black disabled:opacity-60"
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
