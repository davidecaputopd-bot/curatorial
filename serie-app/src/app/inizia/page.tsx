'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Poster } from '@/components/TvBits'
import { useViewer } from '@/components/Viewer'
import { appName } from '@/lib/accents'

type Voce = {
  tvmaze_id: number
  title: string
  poster: string | null
  network: string | null
  status: string | null
  year: string | null
}

// I generi di TVmaze che vale la pena mostrare come scorciatoia.
const GENERI = [
  'Drama',
  'Comedy',
  'Crime',
  'Science-Fiction',
  'Thriller',
  'Action',
  'Fantasy',
  'Horror',
  'Mystery',
  'Romance',
  'Anime',
]

export default function IniziaPage() {
  const router = useRouter()
  const viewer = useViewer()

  const [items, setItems] = useState<Voce[]>([])
  const [scelte, setScelte] = useState<Map<number, Voce>>(new Map())
  const [q, setQ] = useState('')
  const [genere, setGenere] = useState('')
  const [pagina, setPagina] = useState(0)
  const [fine, setFine] = useState(false)
  const [caricando, setCaricando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const richiesta = useRef(0)

  const carica = useCallback(
    async (opzioni: { q: string; genere: string; pagina: number }) => {
      const mia = ++richiesta.current
      setCaricando(true)
      const params = new URLSearchParams()
      if (opzioni.q) params.set('q', opzioni.q)
      if (opzioni.genere) params.set('genere', opzioni.genere)
      params.set('pagina', String(opzioni.pagina))

      const response = await fetch(`/api/tv/catalogo?${params}`)
      const data = await response.json().catch(() => ({}))
      if (mia !== richiesta.current) return // una ricerca più recente ha già risposto

      const nuove: Voce[] = data.items || []
      setItems((precedenti) => (opzioni.pagina === 0 ? nuove : [...precedenti, ...nuove]))
      setFine(Boolean(data.fine))
      setCaricando(false)
    },
    []
  )

  // Primo caricamento e ogni cambio di ricerca o genere, con un respiro
  // sulla digitazione per non interrogare a ogni lettera.
  useEffect(() => {
    const attesa = setTimeout(() => {
      setPagina(0)
      void carica({ q, genere, pagina: 0 })
    }, q ? 350 : 0)
    return () => clearTimeout(attesa)
  }, [q, genere, carica])

  function tocca(voce: Voce) {
    setScelte((precedenti) => {
      const copia = new Map(precedenti)
      if (copia.has(voce.tvmaze_id)) copia.delete(voce.tvmaze_id)
      else copia.set(voce.tvmaze_id, voce)
      return copia
    })
  }

  async function continua() {
    if (scelte.size === 0) {
      router.push('/')
      return
    }
    setSalvando(true)
    await fetch('/api/tv/aggiungi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serie: [...scelte.values()] }),
    })
    // Ora che le serie ci sono, si dice a che punto si è: una dopo l'altra.
    router.push('/imposta')
  }

  return (
    <main className="min-h-[100dvh] bg-grow-bg pb-36 text-grow-text">
      <div className="mx-auto max-w-lg lg:max-w-4xl">
        <header className="px-5 pt-10 lg:px-8">
          <h1 className="grow-page-title">
            {appName(viewer?.name)}<span className="text-grow-accent">.</span>
          </h1>
          <p className="mt-3 text-[15px] leading-snug text-grow-muted">
            Tocca le serie che guardi. Quante vuoi — dopo ti chiedo a che punto sei.
          </p>
        </header>

        <div className="sticky top-0 z-30 bg-grow-bg/90 px-5 pb-3 pt-5 backdrop-blur-xl lg:px-8">
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Cerca una serie"
            aria-label="Cerca una serie"
            className="grow-surface w-full rounded-2xl border border-transparent px-4 py-3.5 text-[16px] text-grow-text outline-none focus:border-grow-accent"
          />

          <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 lg:-mx-8 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {GENERI.map((nome) => {
              const attivo = genere === nome
              return (
                <button
                  key={nome}
                  type="button"
                  onClick={() => setGenere(attivo ? '' : nome)}
                  aria-pressed={attivo}
                  className={[
                    'grow-press shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold',
                    attivo ? 'grow-object bg-grow-accent text-grow-black' : 'grow-surface text-grow-muted',
                  ].join(' ')}
                >
                  {nome === 'Science-Fiction' ? 'Sci-Fi' : nome}
                </button>
              )
            })}
          </div>
        </div>

        <div className="px-5 lg:px-8">
          {items.length === 0 && !caricando ? (
            <div className="grow-surface mt-6 rounded-3xl p-6">
              <h2 className="font-display text-[22px] leading-tight">
                {q ? 'Nessuna serie con questo nome.' : 'Il catalogo si sta riempiendo.'}
              </h2>
              <p className="mt-2 text-[15px] leading-snug text-grow-muted">
                {q
                  ? 'Prova con il titolo originale: il catalogo è quello di TVmaze.'
                  : 'Intanto cerca per nome: la ricerca arriva a qualsiasi serie esista.'}
              </p>
            </div>
          ) : (
            <ul className="mt-5 grid grid-cols-3 gap-3 lg:grid-cols-5">
              {items.map((voce) => {
                const scelta = scelte.has(voce.tvmaze_id)
                return (
                  <li key={voce.tvmaze_id}>
                    <button
                      type="button"
                      onClick={() => tocca(voce)}
                      aria-pressed={scelta}
                      className="grow-press block w-full text-left"
                    >
                      <span
                        className={[
                          'relative block overflow-hidden rounded-2xl transition-transform duration-300 ease-spring',
                          scelta ? 'scale-[0.94] ring-2 ring-grow-accent' : '',
                        ].join(' ')}
                      >
                        <Poster src={voce.poster} title={voce.title} className="aspect-[2/3] w-full" />
                        {scelta && (
                          <span className="absolute inset-0 flex items-center justify-center bg-grow-black/55">
                            <span className="grow-object flex h-10 w-10 items-center justify-center rounded-full bg-grow-accent text-grow-black">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            </span>
                          </span>
                        )}
                      </span>
                      <span className="mt-2 block truncate text-[13px] font-semibold leading-tight">
                        {voce.title}
                      </span>
                      <span className="block truncate text-[12px] text-grow-muted">
                        {[voce.network, voce.year].filter(Boolean).join(' · ')}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {caricando && (
            <p className="mt-6 text-center text-[13px] text-grow-muted">Carico…</p>
          )}

          {!caricando && !fine && items.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const prossima = pagina + 1
                setPagina(prossima)
                void carica({ q, genere, pagina: prossima })
              }}
              className="grow-press grow-surface mt-6 min-h-12 w-full rounded-full text-[14px] font-bold text-grow-text"
            >
              Altre serie
            </button>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button
            type="button"
            onClick={() => void continua()}
            disabled={salvando}
            className="grow-press grow-object min-h-14 flex-1 rounded-full bg-grow-accent text-[15px] font-bold text-grow-black disabled:opacity-40"
          >
            {salvando
              ? 'Un attimo…'
              : scelte.size === 0
                ? 'Salta per ora'
                : `Continua con ${scelte.size} ${scelte.size === 1 ? 'serie' : 'serie'}`}
          </button>
        </div>
      </div>
    </main>
  )
}
