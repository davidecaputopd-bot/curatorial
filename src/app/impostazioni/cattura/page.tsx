'use client'

import Link from 'next/link'
import { Check, Copy, ShareNetwork, ShieldCheck } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import BottomNav from '@/components/BottomNav'

const CAPTURE_URL = 'https://grow-eight-kappa.vercel.app/api/capture'

function CopyButton({
  label,
  value,
}: {
  label: string
  value: string
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="grow-press grow-surface flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left"
    >
      <span className="min-w-0">
        <span className="block text-[13px] text-grow-muted">
          {label}
        </span>
        <span className="mt-0.5 block truncate text-sm font-semibold text-grow-text">
          {value}
        </span>
      </span>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-grow-soft">
        {copied ? <Check size={17} weight="bold" /> : <Copy size={17} />}
      </span>
    </button>
  )
}

export default function CaptureSetupPage() {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/capture/token')
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error || 'Configurazione non disponibile')
        }
        setToken(payload.token || '')
      })
      .catch((cause) => {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Configurazione non disponibile'
        )
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-[100dvh] bg-grow-bg pb-28 text-grow-text lg:pb-12">
      <div className="mx-auto max-w-lg px-5 pt-10 lg:px-8">
        <header className="mb-8">
          <Link
            href="/inbox"
            className="-ml-1 inline-flex min-h-11 items-center text-[15px] font-semibold text-grow-muted"
          >
            ← Inbox
          </Link>
          <div className="mt-5 flex items-end justify-between gap-5">
            <div>
              <h1 className="grow-page-title">
                Salva in GROW<span className="text-grow-yellow">.</span>
              </h1>
            </div>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-grow-soft text-grow-yellow">
              <ShareNetwork size={25} weight="bold" />
            </span>
          </div>
          <p className="mt-4 max-w-sm text-[15px] leading-snug text-grow-muted">
            Invia link da Instagram, TikTok, Safari e Foto senza aprire GROW e
            senza scegliere una cartella.
          </p>
        </header>

        <section className="grow-surface rounded-[1.4rem] p-5">
          <p className="text-[13px] text-grow-muted">
            Comando rapido iPhone
          </p>
          <h2 className="grow-section-title mt-2">
            Configuralo una volta.
          </h2>

          <ol className="mt-6 space-y-5">
            {[
              'Apri Comandi Rapidi, crea un comando e chiamalo “Salva in GROW”.',
              'Attiva “Mostra nel foglio di condivisione” e accetta URL e testo.',
              'Aggiungi “Ottieni contenuti dell’URL” e scegli POST.',
              'Usa il link qui sotto. Nel corpo JSON invia “content” con “Input comando rapido”.',
              'Aggiungi l’header Authorization con valore “Bearer ” seguito dal token.',
            ].map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-grow-soft text-sm font-extrabold text-grow-text">
                  {index + 1}
                </span>
                <p className="pt-1 text-[15px] leading-snug text-grow-text/90">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-4 space-y-3">
          <CopyButton label="URL richiesta" value={CAPTURE_URL} />
          {loading ? (
            <div className="h-[70px] animate-pulse rounded-2xl bg-grow-card" />
          ) : token ? (
            <CopyButton label="Token personale" value={token} />
          ) : (
            <div className="rounded-2xl grow-surface p-4">
              <p className="text-sm font-bold">Collegamento non ancora attivo.</p>
              <p className="mt-1 text-xs leading-relaxed text-grow-muted">
                {error ||
                  'Manca il segreto server necessario per creare il token del telefono.'}
              </p>
            </div>
          )}
        </section>

        <section className="mt-6 flex gap-3 rounded-[1.4rem] bg-grow-butter p-4">
          <ShieldCheck size={22} weight="bold" className="shrink-0" />
          <div>
            <p className="text-sm font-bold">Accesso limitato</p>
            <p className="mt-1 text-xs leading-relaxed text-grow-muted">
              Il token può soltanto aggiungere elementi alla tua Inbox. Non può
              leggere Archivio, chat o calendario. Scade dopo 180 giorni e può
              essere sostituito tornando in questa pagina.
            </p>
          </div>
        </section>

        <Link
          href="/impostazioni/importa"
          className="grow-press grow-surface mt-4 flex min-h-14 items-center justify-between rounded-[1.4rem] px-4 py-3 text-[15px] font-semibold"
        >
          <span>Importa i vecchi salvati Instagram e TikTok</span>
          <span>→</span>
        </Link>
      </div>

      <BottomNav />
    </main>
  )
}
