'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import BottomNav from '@/components/BottomNav'
import { CheckButton, episodeCode, Poster, ProgressBar, progressState, RETURN_TONE, returnState, type TvShow } from '@/components/tv/TvBits'

type Episode = { id: number; season: number; number: number; name: string | null; airstamp: string | null; runtime: number | null }
type Watch = { season: number; episode: number; watched_at: string | null; source: string }

export default function SerieDetailPage() {
  return (
    <Suspense>
      <SerieDetail />
    </Suspense>
  )
}

function SerieDetail() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const [show, setShow] = useState<TvShow | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [watches, setWatches] = useState<Watch[]>([])
  const [open, setOpen] = useState<number | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const [setting, setSetting] = useState(searchParams.get('imposta') === '1')
  const [pick, setPick] = useState<{ season: number; episode: number }>({ season: 1, episode: 1 })

  const load = useCallback(async () => {
    const response = await fetch(`/api/tv/${id}`)
    if (!response.ok) return
    const data = await response.json()
    setShow(data.show)
    setEpisodes(data.episodes)
    setWatches(data.watches)
    return data.show as TvShow
  }, [id])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void load().then((loaded) => {
        if (!loaded) return
        if (loaded.progress_season === null) setSetting(true)
        setOpen(loaded.next_season ?? loaded.progress_season ?? 1)
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [load])

  const [now] = useState(() => Date.now())
  const aired = episodes.filter((episode) => episode.airstamp && new Date(episode.airstamp).getTime() <= now)
  const seasons = useMemo(() => [...new Set(episodes.map((episode) => episode.season))], [episodes])
  const watchMap = useMemo(() => new Map(watches.map((watch) => [`${watch.season}-${watch.episode}`, watch])), [watches])

  const isWatched = (episode: Episode) =>
    watchMap.has(`${episode.season}-${episode.number}`) ||
    (show?.progress_season != null &&
      (episode.season < show.progress_season ||
        (episode.season === show.progress_season && episode.number <= (show.progress_episode ?? 0))))

  const patch = async (fields: Partial<TvShow>) => {
    await fetch('/api/tv', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: Number(id), ...fields }),
    })
    await load()
  }

  const toggle = async (episode: Episode) => {
    if (!show) return
    setBusy(episode.id)
    try {
      if (isWatched(episode)) {
        await fetch('/api/tv/watch', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ show_id: show.id, season: episode.season, episode: episode.number }),
        })
      } else {
        const beforeIt = aired.filter(
          (other) =>
            (other.season < episode.season || (other.season === episode.season && other.number < episode.number)) &&
            !isWatched(other)
        )
        const upTo = beforeIt.length > 0 && window.confirm(`Segnare come visti anche i ${beforeIt.length} episodi precedenti?`)
        await fetch('/api/tv/watch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ show_id: show.id, season: episode.season, episode: episode.number, upTo }),
        })
      }
      await load()
    } finally {
      setBusy(null)
    }
  }

  const markSeason = async (season: number) => {
    const last = aired.filter((episode) => episode.season === season).at(-1)
    if (!last || !show) return
    setBusy(-season)
    try {
      await fetch('/api/tv/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ show_id: show.id, season, episode: last.number, upTo: true }),
      })
      await load()
    } finally {
      setBusy(null)
    }
  }

  if (!show) {
    return (
      <main className="min-h-screen bg-grow-bg px-5 pt-10">
        <div className="mx-auto h-64 max-w-lg animate-pulse rounded-[1.75rem] bg-grow-card" />
        <BottomNav />
      </main>
    )
  }

  const state = progressState(show)
  const upcoming = episodes
    .filter((episode) => episode.airstamp && new Date(episode.airstamp).getTime() > now)
    .sort((a, b) => String(a.airstamp).localeCompare(String(b.airstamp)))[0]
  const comeback = returnState({
    status: show.show_status,
    next: upcoming
      ? { season: upcoming.season, number: upcoming.number, airstamp: upcoming.airstamp as string }
      : show.return_season && show.return_date
        ? { season: show.return_season, number: 1, airstamp: show.return_date }
        : null,
    last_aired: aired.at(-1)?.airstamp ?? null,
    tba_season: show.return_season && !show.return_date ? show.return_season : null,
  }, now)
  const watchedCount = Math.max(show.aired_count - show.unwatched_count, 0)
  const pickEpisodes = episodes.filter((episode) => episode.season === pick.season)

  return (
    <main className="min-h-screen bg-grow-bg pb-28 text-grow-text lg:pb-12">
      <div className="mx-auto max-w-lg lg:max-w-3xl">
        <section className="relative overflow-hidden px-5 pb-6 pt-8 lg:px-8">
          {show.poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={show.poster} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-3xl [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          )}
          <div className="relative">
            <Link href="/serie" className="-ml-1 inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold text-grow-muted">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
              Serie
            </Link>
            <div className="mt-3 flex items-end gap-4">
              <Poster src={show.poster} title={show.title} className="h-[168px] w-28 shrink-0 rounded-xl shadow-[0_20px_30px_-12px_rgba(0,0,0,.7)]" />
              <div className="min-w-0">
                <h1 className="font-display text-[32px] leading-[0.95] [text-wrap:balance]">{show.title}</h1>
                {show.network && <p className="mt-2 text-[13px] text-grow-muted">{show.network}</p>}
                <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold">
                  <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${RETURN_TONE[comeback.kind]}`} />
                  {comeback.label}
                </p>
                {comeback.detail && <p className="mt-0.5 text-[13px] text-grow-muted">{comeback.detail}</p>}
                <p className="mt-2 text-[15px] font-bold text-grow-yellow">{state.label}</p>
              </div>
            </div>
            <div className="mt-5">
              <ProgressBar show={show} className="h-2 overflow-hidden rounded-full" />
              <p className="mt-2 text-[13px] tabular-nums text-grow-muted">
                {show.progress_season === null ? 'Posizione da impostare' : `${watchedCount} / ${show.aired_count} episodi visti`}
                {show.followed_at ? ` · seguita dal ${new Date(show.followed_at).toLocaleDateString('it-IT')}` : ''}
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={show.notify}
                onClick={() => void patch({ notify: !show.notify })}
                className={`grow-press min-h-11 rounded-full px-4 text-sm font-semibold ${show.notify ? 'grow-object bg-grow-yellow text-grow-black' : 'grow-surface text-grow-text'}`}
              >
                {show.notify ? 'Notifiche attive' : 'Notifiche spente'}
              </button>
              <button
                type="button"
                aria-pressed={show.favorite}
                onClick={() => void patch({ favorite: !show.favorite })}
                className={`grow-press min-h-11 rounded-full px-4 text-sm font-semibold ${show.favorite ? 'grow-object bg-grow-text text-grow-black' : 'grow-surface text-grow-text'}`}
              >
                {show.favorite ? '★ Preferita' : '☆ Preferita'}
              </button>
              {show.followed && (
                <button
                  type="button"
                  aria-pressed={show.for_later}
                  onClick={() => void patch({ for_later: !show.for_later })}
                  className={`grow-press min-h-11 rounded-full px-4 text-sm font-semibold ${show.for_later ? 'grow-object bg-grow-text text-grow-black' : 'grow-surface text-grow-text'}`}
                >
                  {show.for_later ? 'Riprendi a guardare' : 'Guarda più tardi'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSetting((value) => !value)}
                className="grow-press grow-surface min-h-11 rounded-full px-4 text-sm font-semibold text-grow-text"
              >
                A che punto sei
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(show.followed ? `Smettere di seguire ${show.title}?` : `Seguire di nuovo ${show.title}?`))
                    void patch({ followed: !show.followed })
                }}
                className="grow-press min-h-11 rounded-full px-3 text-sm font-semibold text-grow-fix"
              >
                {show.followed ? 'Non seguire' : 'Segui'}
              </button>
            </div>
          </div>
        </section>

        {setting && (
          <section className="grow-surface mx-5 mt-4 rounded-[1.4rem] p-5 lg:mx-8">
            <h2 className="grow-section-title">A che punto sei?</h2>
            <p className="mt-1 text-[13px] text-grow-muted">Scegli l’ultimo episodio che hai visto.</p>
            {episodes.length === 0 ? (
              <p className="mt-3 text-[13px] text-grow-muted">Episodi non ancora scaricati: riapri tra poco.</p>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={pick.season}
                  onChange={(event) => setPick({ season: Number(event.target.value), episode: 1 })}
                  className="h-11 rounded-full bg-grow-soft px-4 text-sm font-semibold text-grow-text"
                  aria-label="Stagione"
                >
                  {seasons.map((season) => (
                    <option key={season} value={season}>
                      Stagione {season}
                    </option>
                  ))}
                </select>
                <select
                  value={pick.episode}
                  onChange={(event) => setPick({ ...pick, episode: Number(event.target.value) })}
                  className="h-11 rounded-full bg-grow-soft px-4 text-sm font-semibold text-grow-text"
                  aria-label="Episodio"
                >
                  {pickEpisodes.map((episode) => (
                    <option key={episode.id} value={episode.number}>
                      Episodio {episode.number}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void patch({ progress_season: pick.season, progress_episode: pick.episode }).then(() => setSetting(false))}
                  className="grow-press grow-object min-h-11 rounded-full bg-grow-yellow px-5 text-sm font-bold text-grow-black"
                >
                  Salva
                </button>
                <button
                  type="button"
                  onClick={() => void patch({ progress_season: 0, progress_episode: 0 }).then(() => setSetting(false))}
                  className="grow-press min-h-11 rounded-full bg-grow-soft px-4 text-sm font-semibold text-grow-text"
                >
                  Non iniziata
                </button>
                {aired.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const last = aired[aired.length - 1]
                      void patch({ progress_season: last.season, progress_episode: last.number }).then(() => setSetting(false))
                    }}
                    className="grow-press min-h-11 rounded-full bg-grow-soft px-4 text-sm font-semibold text-grow-text"
                  >
                    Vista tutta
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        <div className="px-5 pt-6 lg:px-8">
          {seasons.map((season) => {
            const list = episodes.filter((episode) => episode.season === season)
            const seen = list.filter(isWatched).length
            const airedInSeason = list.filter((episode) => aired.includes(episode))
            return (
              <section key={season} className="grow-surface mb-3 overflow-hidden rounded-[1.4rem]">
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    aria-expanded={open === season}
                    onClick={() => setOpen(open === season ? null : season)}
                    className="flex min-w-0 flex-1 items-center justify-between text-left"
                  >
                    <span className="text-[17px] font-bold">Stagione {season}</span>
                    <span className="text-[13px] tabular-nums text-grow-muted">
                      {seen}/{list.length} {open === season ? '−' : '+'}
                    </span>
                  </button>
                  {airedInSeason.length > 0 && seen < airedInSeason.length && (
                    <button
                      type="button"
                      disabled={busy === -season}
                      onClick={() => void markSeason(season)}
                      className="grow-press min-h-11 shrink-0 rounded-full bg-grow-soft px-4 text-sm font-semibold text-grow-text disabled:opacity-50"
                    >
                      Segna stagione
                    </button>
                  )}
                </div>
                {open === season && (
                  <ul className="divide-y divide-grow-border border-t border-grow-border">
                    {list.map((episode) => {
                      const watched = isWatched(episode)
                      const isAired = aired.includes(episode)
                      const watch = watchMap.get(`${episode.season}-${episode.number}`)
                      return (
                        <li key={episode.id} className="flex items-center gap-3 px-4 py-2.5">
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] tabular-nums text-grow-muted">
                              {episodeCode(episode.season, episode.number)}
                            </span>
                            <span className={`block truncate text-[15px] font-semibold ${watched ? 'text-grow-muted' : ''}`}>
                              {episode.name || 'Titolo non disponibile'}
                            </span>
                            <span className="block text-xs text-grow-muted">
                              {episode.airstamp
                                ? `${isAired ? 'Uscito' : 'Esce'} il ${new Date(episode.airstamp).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                : 'Data non annunciata'}
                              {watch?.watched_at
                                ? ` · visto il ${new Date(watch.watched_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                : ''}
                            </span>
                          </span>
                          {isAired ? (
                            <CheckButton
                              checked={watched}
                              busy={busy === episode.id}
                              onClick={() => void toggle(episode)}
                              label={`${watched ? 'Togli' : 'Segna'} ${episodeCode(episode.season, episode.number)} ${watched ? 'dai visti' : 'come visto'}`}
                            />
                          ) : (
                            <span className="w-12 shrink-0 text-center text-xs font-semibold text-grow-muted">Presto</span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            )
          })}
          {episodes.length === 0 && (
            <p className="py-10 text-center text-[15px] text-grow-muted">
              {show.tvmaze_id ? 'Sto scaricando gli episodi…' : 'Serie non collegata al catalogo TVmaze.'}
            </p>
          )}
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
