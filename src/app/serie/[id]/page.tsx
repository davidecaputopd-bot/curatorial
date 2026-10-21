'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import BottomNav from '@/components/BottomNav'
import { CheckButton, episodeCode, Poster, ProgressBar, progressState, type TvShow } from '@/components/tv/TvBits'

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
      <main className="min-h-screen bg-grow-bg px-4 pt-10">
        <div className="mx-auto h-64 max-w-lg animate-pulse rounded-[2rem] bg-grow-soft" />
        <BottomNav />
      </main>
    )
  }

  const state = progressState(show)
  const watchedCount = Math.max(show.aired_count - show.unwatched_count, 0)
  const pickEpisodes = episodes.filter((episode) => episode.season === pick.season)

  return (
    <main className="min-h-screen bg-grow-bg pb-28 text-grow-text lg:pb-12">
      <div className="mx-auto max-w-lg lg:max-w-3xl">
        <section className="relative overflow-hidden bg-grow-black px-4 pb-6 pt-8 text-white lg:px-8">
          {show.poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={show.poster} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-2xl" />
          )}
          <div className="relative">
            <Link href="/serie" className="text-[11px] font-extrabold uppercase tracking-wide text-white/60">
              ← Serie
            </Link>
            <div className="mt-4 flex items-end gap-4">
              <Poster src={show.poster} title={show.title} className="h-[150px] w-[100px] shrink-0 rounded-xl shadow-2xl" />
              <div className="min-w-0">
                <h1 className="text-[34px] leading-[0.95] font-[family-name:var(--font-tv-display)] font-normal uppercase tracking-[0.01em]">{show.title}</h1>
                <p className="mt-2 text-[11px] font-bold uppercase text-white/55">
                  {[show.network, show.show_status === 'Ended' ? 'Conclusa' : show.show_status === 'Running' ? 'In onda' : null]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <p className="mt-2 text-sm font-extrabold text-grow-yellow">{state.label}</p>
              </div>
            </div>
            <div className="mt-5">
              <ProgressBar show={show} className="rounded-full bg-white/15" />
              <p className="mt-2 text-[11px] font-bold uppercase text-white/55">
                {show.progress_season === null ? 'Posizione da impostare' : `${watchedCount} / ${show.aired_count} episodi visti`}
                {show.followed_at ? ` · seguita dal ${new Date(show.followed_at).toLocaleDateString('it-IT')}` : ''}
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={show.notify}
                onClick={() => void patch({ notify: !show.notify })}
                className={`h-10 rounded-full px-4 text-[10px] font-extrabold uppercase ${show.notify ? 'bg-grow-yellow text-grow-black' : 'bg-white/10 text-white'}`}
              >
                {show.notify ? 'Notifiche attive' : 'Notifiche spente'}
              </button>
              <button
                type="button"
                aria-pressed={show.favorite}
                onClick={() => void patch({ favorite: !show.favorite })}
                className={`h-10 rounded-full px-4 text-[10px] font-extrabold uppercase ${show.favorite ? 'bg-white text-grow-black' : 'bg-white/10 text-white'}`}
              >
                {show.favorite ? '★ Preferita' : '☆ Preferita'}
              </button>
              <button
                type="button"
                onClick={() => setSetting((value) => !value)}
                className="h-10 rounded-full bg-white/10 px-4 text-[10px] font-extrabold uppercase text-white"
              >
                A che punto sei
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(show.followed ? `Smettere di seguire ${show.title}?` : `Seguire di nuovo ${show.title}?`))
                    void patch({ followed: !show.followed })
                }}
                className="h-10 rounded-full bg-white/10 px-4 text-[10px] font-extrabold uppercase text-white/70"
              >
                {show.followed ? 'Non seguire' : 'Segui'}
              </button>
            </div>
          </div>
        </section>

        {setting && (
          <section className="mx-4 mt-4 rounded-[1.5rem] border border-grow-border bg-grow-card p-4 lg:mx-8">
            <h2 className="text-lg font-[family-name:var(--font-tv-display)] font-normal uppercase tracking-[0.01em]">A che punto sei?</h2>
            <p className="mt-1 text-xs text-grow-muted">Scegli l’ultimo episodio che hai visto.</p>
            {episodes.length === 0 ? (
              <p className="mt-3 text-xs font-bold text-grow-muted">Episodi non ancora scaricati: riapri tra poco.</p>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={pick.season}
                  onChange={(event) => setPick({ season: Number(event.target.value), episode: 1 })}
                  className="h-11 rounded-full border border-grow-border bg-grow-bg px-4 text-sm font-bold"
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
                  className="h-11 rounded-full border border-grow-border bg-grow-bg px-4 text-sm font-bold"
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
                  className="h-11 rounded-full bg-grow-black px-5 text-[11px] font-extrabold uppercase text-grow-yellow"
                >
                  Salva
                </button>
                <button
                  type="button"
                  onClick={() => void patch({ progress_season: 0, progress_episode: 0 }).then(() => setSetting(false))}
                  className="h-11 rounded-full border border-grow-border px-4 text-[11px] font-extrabold uppercase text-grow-muted"
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
                    className="h-11 rounded-full border border-grow-border px-4 text-[11px] font-extrabold uppercase text-grow-muted"
                  >
                    Vista tutta
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        <div className="px-4 pt-4 lg:px-8">
          {seasons.map((season) => {
            const list = episodes.filter((episode) => episode.season === season)
            const seen = list.filter(isWatched).length
            const airedInSeason = list.filter((episode) => aired.includes(episode))
            return (
              <section key={season} className="border-b border-grow-border">
                <div className="flex items-center gap-3 py-4">
                  <button
                    type="button"
                    aria-expanded={open === season}
                    onClick={() => setOpen(open === season ? null : season)}
                    className="flex min-w-0 flex-1 items-center justify-between text-left"
                  >
                    <span className="text-xl font-[family-name:var(--font-tv-display)] font-normal uppercase tracking-[0.01em]">Stagione {season}</span>
                    <span className="text-[11px] font-bold uppercase text-grow-muted">
                      {seen}/{list.length} {open === season ? '−' : '+'}
                    </span>
                  </button>
                  {airedInSeason.length > 0 && seen < airedInSeason.length && (
                    <button
                      type="button"
                      disabled={busy === -season}
                      onClick={() => void markSeason(season)}
                      className="h-11 shrink-0 rounded-full bg-grow-black px-4 text-[10px] font-extrabold uppercase text-grow-yellow disabled:opacity-50"
                    >
                      Segna stagione
                    </button>
                  )}
                </div>
                {open === season && (
                  <ul className="pb-3">
                    {list.map((episode) => {
                      const watched = isWatched(episode)
                      const isAired = aired.includes(episode)
                      const watch = watchMap.get(`${episode.season}-${episode.number}`)
                      return (
                        <li key={episode.id} className="flex items-center gap-3 py-2.5">
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12px] font-bold text-grow-muted">
                              {episodeCode(episode.season, episode.number)}
                            </span>
                            <span className={`block truncate text-sm font-bold ${watched ? 'text-grow-muted' : ''}`}>
                              {episode.name || 'Titolo non disponibile'}
                            </span>
                            <span className="block text-[11px] text-grow-muted">
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
                            <span className="w-11 shrink-0 text-center text-[10px] font-extrabold uppercase text-grow-muted">Presto</span>
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
            <p className="py-10 text-center text-sm text-grow-muted">
              {show.tvmaze_id ? 'Sto scaricando gli episodi…' : 'Serie non collegata al catalogo TVmaze.'}
            </p>
          )}
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
