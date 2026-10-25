'use client'

// "A che punto sei?" in sequenza, come il passo 4 dell'onboarding di TV Time:
// una serie per volta, scegli l'ultimo episodio visto e passi alla successiva.

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { episodeCode, Poster, type TvShow } from '@/components/tv/TvBits'

type Episode = { id: number; season: number; number: number; name: string | null; airstamp: string | null }
type Loaded = { show: TvShow; episodes: Episode[] }

const display = 'font-[family-name:var(--font-tv-display)] font-normal uppercase tracking-[0.01em]'

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
        <div className="mt-8 h-72 animate-pulse rounded-[2rem] bg-grow-soft" />
      </Shell>
    )
  }

  if (!show) {
    return (
      <Shell>
        <div className="mt-10 text-center">
          <h1 className={`text-[40px] leading-[0.9] ${display}`}>
            Fatto<span className="text-grow-yellow">.</span>
          </h1>
          <p className="mt-3 text-sm text-grow-muted">
            {queue.length === 0
              ? 'Tutte le serie hanno già una posizione.'
              : `${done} ${done === 1 ? 'serie impostata' : 'serie impostate'}${queue.length - done > 0 ? `, ${queue.length - done} saltate` : ''}.`}
          </p>
          <Link
            href="/serie"
            className="mt-6 inline-flex h-12 items-center rounded-full bg-grow-black px-6 text-[11px] font-extrabold uppercase text-grow-yellow"
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
      <div className="flex items-center justify-between text-[11px] font-extrabold uppercase text-grow-muted">
        <span className="tabular-nums">
          {index + 1} / {queue.length}
        </span>
        {index > 0 && (
          <button type="button" onClick={() => setIndex((value) => value - 1)} className="h-11 px-1">
            ← Indietro
          </button>
        )}
      </div>
      <div className="mt-1 h-1 w-full bg-black/10">
        <div className="h-full bg-grow-black transition-[width] duration-300" style={{ width: `${(index / queue.length) * 100}%` }} />
      </div>

      <div className="mt-6 flex items-end gap-4">
        <Poster src={show.poster} title={show.title} className="h-[120px] w-[80px] shrink-0 rounded-xl" />
        <div className="min-w-0">
          <h1 className={`text-[30px] leading-[0.95] ${display}`} style={{ textWrap: 'balance' }}>
            {show.title}
          </h1>
          <p className="mt-2 text-[11px] font-bold uppercase text-grow-muted">
            {[show.network, show.last_watched_at ? `ultima visione ${new Date(show.last_watched_at).toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })}` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>

      <h2 className={`mt-7 text-xl ${display}`}>Ultimo episodio visto</h2>

      {!current ? (
        <div className="mt-3 h-40 animate-pulse rounded-2xl bg-grow-soft" />
      ) : current.episodes.length === 0 ? (
        <p className="mt-3 text-sm text-grow-muted">Episodi non ancora scaricati da TVmaze: salta e ritorna più tardi.</p>
      ) : (
        <>
          <div className="scrollbar-hide -mx-4 mt-3 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Stagione">
            {seasons.map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={season === value}
                onClick={() => setSeason(value)}
                className={[
                  'h-10 shrink-0 rounded-full px-4 text-[11px] font-extrabold uppercase',
                  season === value ? 'bg-grow-black text-grow-yellow' : 'border border-grow-border bg-grow-card text-grow-muted',
                ].join(' ')}
              >
                Stagione {value}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-6 gap-2">
            {inSeason.map((episode) => (
              <button
                key={episode.id}
                type="button"
                disabled={saving}
                onClick={() => void save({ progress_season: episode.season, progress_episode: episode.number })}
                aria-label={`Visto fino a ${episodeCode(episode.season, episode.number)}${episode.name ? `, ${episode.name}` : ''}`}
                className="flex aspect-square items-center justify-center rounded-xl border border-grow-border bg-grow-card text-sm font-extrabold tabular-nums transition-colors active:bg-grow-yellow disabled:opacity-50"
              >
                {episode.number}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-grow-muted">Tocca l’ultimo episodio che hai visto: si passa subito alla serie dopo.</p>
        </>
      )}

      {error && <p className="mt-4 rounded-xl bg-grow-butter px-3 py-2 text-xs font-bold">{error}</p>}

      <div className="mt-6 grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={saving || !last}
          onClick={() => last && void save({ progress_season: last.season, progress_episode: last.number })}
          className="h-12 rounded-full bg-grow-black text-[11px] font-extrabold uppercase text-grow-yellow disabled:opacity-40"
        >
          Vista tutta
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save({ progress_season: 0, progress_episode: 0 })}
          className="h-12 rounded-full border border-grow-border bg-grow-card text-[11px] font-extrabold uppercase disabled:opacity-40"
        >
          Non iniziata
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save(null)}
          className="h-12 rounded-full text-[11px] font-extrabold uppercase text-grow-muted disabled:opacity-40"
        >
          Salta
        </button>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[100dvh] bg-grow-bg px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-6 text-grow-text">
      <div className="mx-auto max-w-lg">
        <Link href="/serie" className="inline-flex h-11 items-center text-[11px] font-extrabold uppercase tracking-wide text-grow-muted">
          ✕ Chiudi
        </Link>
        {children}
      </div>
    </main>
  )
}
