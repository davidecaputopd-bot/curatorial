'use client'

// "A che punto sei?" in sequenza, come il passo 4 dell'onboarding di TV Time:
// una serie per volta, scegli l'ultimo episodio visto e passi alla successiva.

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { episodeCode, Poster, type TvShow } from '@/components/tv/TvBits'

type Episode = { id: number; season: number; number: number; name: string | null; airstamp: string | null }
type Loaded = { show: TvShow; episodes: Episode[] }


export default function ImpostaPosizioniPage() {
  const [queue, setQueue] = useState<TvShow[] | null>(null)
  const [index, setIndex] = useState(0)
  const [current, setCurrent] = useState<Loaded | null>(null)
  const [season, setSeason] = useState(1)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(0)
  const [error, setError] = useState('')

  // La coda si fissa all'apertura: salvare una serie non rimescola le altre.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void fetch('/api/tv')
        .then((response) => response.json())
        .then((data) => {
          const shows = ((data.shows || []) as TvShow[])
            .filter((show) => show.followed && show.progress_season === null && show.aired_count > 0)
            .sort((a, b) => String(b.last_watched_at || '').localeCompare(String(a.last_watched_at || '')))
          setQueue(shows)
        })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const now = useState(() => Date.now())[0]
  const show = queue?.[index]

  useEffect(() => {
    if (!show) return
    let cancelled = false
    const frame = window.requestAnimationFrame(() => {
      setCurrent(null)
      void fetch(`/api/tv/${show.id}`)
        .then((response) => response.json())
        .then((data) => {
          if (cancelled) return
          const episodes = ((data.episodes || []) as Episode[]).filter(
            (episode) => episode.airstamp && new Date(episode.airstamp).getTime() <= now
          )
          setCurrent({ show: data.show, episodes })
          setSeason(episodes.at(-1)?.season ?? 1)
        })
    })
    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
    }
  }, [show, now])

  const save = useCallback(
    async (progress: { progress_season: number; progress_episode: number } | null) => {
      if (!show) return
      setError('')
      if (progress) {
        setSaving(true)
        const response = await fetch('/api/tv', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: show.id, ...progress }),
        }).catch(() => null)
        setSaving(false)
        if (!response?.ok) {
          setError('Non salvato: controlla la connessione e riprova.')
          return
        }
        setDone((value) => value + 1)
      }
      setIndex((value) => value + 1)
    },
    [show]
  )

  if (queue === null) {
    return (
      <Shell>
        <div className="mt-8 h-72 animate-pulse rounded-[1.75rem] bg-grow-card" />
      </Shell>
    )
  }

  if (!show) {
    return (
      <Shell>
        <div className="mt-10 text-center">
          <h1 className="grow-page-title">
            Fatto<span className="text-grow-yellow">.</span>
          </h1>
          <p className="mt-4 text-[15px] text-grow-muted">
            {queue.length === 0
              ? 'Tutte le serie hanno già una posizione.'
              : `${done} ${done === 1 ? 'serie impostata' : 'serie impostate'}${queue.length - done > 0 ? `, ${queue.length - done} saltate` : ''}.`}
          </p>
          <Link
            href="/serie"
            className="grow-press grow-object mt-6 inline-flex min-h-12 items-center rounded-full bg-grow-yellow px-6 text-[15px] font-bold text-grow-black"
          >
            Torna alle serie
          </Link>
        </div>
      </Shell>
    )
  }

  const seasons = current ? [...new Set(current.episodes.map((episode) => episode.season))] : []
  const inSeason = current?.episodes.filter((episode) => episode.season === season) || []
  const last = current?.episodes.at(-1)

  return (
    <Shell>
      <div className="flex items-center justify-between text-[13px] font-semibold text-grow-muted">
        <span className="tabular-nums">
          {index + 1} / {queue.length}
        </span>
        {index > 0 && (
          <button type="button" onClick={() => setIndex((value) => value - 1)} className="min-h-11 px-1">
            ← Indietro
          </button>
        )}
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-grow-soft">
        <div className="h-full origin-left rounded-full bg-grow-text transition-transform duration-300" style={{ transform: `scaleX(${index / queue.length})` }} />
      </div>

      <div className="mt-6 flex items-end gap-4">
        <Poster src={show.poster} title={show.title} className="h-[132px] w-[88px] shrink-0 rounded-xl shadow-[0_16px_24px_-10px_rgba(0,0,0,.7)]" />
        <div className="min-w-0">
          <h1 className="font-display text-[30px] leading-[0.95]" style={{ textWrap: 'balance' }}>
            {show.title}
          </h1>
          <p className="mt-2 text-[13px] text-grow-muted">
            {[show.network, show.last_watched_at ? `ultima visione ${new Date(show.last_watched_at).toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })}` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>

      <h2 className="grow-section-title mt-8">Ultimo episodio visto</h2>

      {!current ? (
        <div className="mt-3 h-40 animate-pulse rounded-[1.4rem] bg-grow-card" />
      ) : current.episodes.length === 0 ? (
        <p className="mt-4 text-[15px] text-grow-muted">Episodi non ancora scaricati da TVmaze: salta e ritorna più tardi.</p>
      ) : (
        <>
          <div className="scrollbar-hide -mx-5 mt-3 flex gap-2 overflow-x-auto px-5" role="tablist" aria-label="Stagione">
            {seasons.map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={season === value}
                onClick={() => setSeason(value)}
                className={[
                  'grow-press min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold',
                  season === value ? 'grow-object bg-grow-text text-grow-black' : 'grow-surface text-grow-muted',
                ].join(' ')}
              >
                Stagione {value}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
            {inSeason.map((episode) => (
              <button
                key={episode.id}
                type="button"
                disabled={saving}
                onClick={() => void save({ progress_season: episode.season, progress_episode: episode.number })}
                aria-label={`Visto fino a ${episodeCode(episode.season, episode.number)}${episode.name ? `, ${episode.name}` : ''}`}
                className="grow-press grow-surface flex aspect-square min-h-11 items-center justify-center rounded-[14px] text-[17px] font-extrabold tabular-nums active:bg-grow-yellow active:text-grow-black disabled:opacity-50"
              >
                {episode.number}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-grow-muted">Tocca l’ultimo episodio che hai visto: si passa subito alla serie dopo.</p>
        </>
      )}

      {error && <p className="mt-4 rounded-2xl bg-grow-butter px-4 py-3 text-sm">{error}</p>}

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={saving || !last}
          onClick={() => last && void save({ progress_season: last.season, progress_episode: last.number })}
          className="grow-press grow-surface min-h-12 rounded-full text-[15px] font-semibold text-grow-text disabled:opacity-40"
        >
          Vista tutta
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save({ progress_season: 0, progress_episode: 0 })}
          className="grow-press grow-surface min-h-12 rounded-full text-[15px] font-semibold text-grow-text disabled:opacity-40"
        >
          Non iniziata
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save(null)}
          className="col-span-2 min-h-12 rounded-full text-[15px] font-semibold text-grow-muted disabled:opacity-40"
        >
          Salta
        </button>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[100dvh] bg-grow-bg px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-6 text-grow-text">
      <div className="mx-auto max-w-lg">
        <Link href="/serie" className="-ml-1 inline-flex min-h-11 items-center text-[15px] font-semibold text-grow-muted">
          ✕ Chiudi
        </Link>
        {children}
      </div>
    </main>
  )
}
