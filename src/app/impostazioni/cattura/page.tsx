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
      className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-left transition active:scale-[0.98]"
    >
      <span className="min-w-0">
        <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-grow-muted">
          {label}
        </span>
        <span className="mt-1 block truncate font-mono text-[11px] text-grow-text">
          {value}
        </span>
      </span>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-grow-soft">
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
    <main className="min-h-screen bg-grow-bg pb-28 text-grow-text lg:pb-12">
      <div className="mx-auto max-w-lg px-4 pt-10 lg:px-8">
        <header className="mb-8">
          <Link
            href="/inbox"
            className="text-[10px] font-black uppercase tracking-[0.16em] text-grow-muted"
          >
            ← Inbox
          </Link>
          <div className="mt-5 flex items-end justify-between gap-5">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-grow-muted">
                Ingresso universale
              </p>
              <h1 className="mt-2 text-[38px] font-black uppercase leading-[0.88] tracking-tighter">
                Salva in GROW<span className="text-grow-yellow">.</span>
              </h1>
            </div>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-grow-yellow">
              <ShareNetwork size={25} weight="bold" />
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-grow-muted">
            Invia link da Instagram, TikTok, Safari e Foto senza aprire GROW e
            senza scegliere una cartella.
          </p>
        </header>

        <section className="rounded-[1.5rem] bg-[#0F0F10] p-5 text-white">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">
            Comando rapido iPhone
          </p>
          <h2 className="mt-2 text-2xl font-black leading-none">
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
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-grow-yellow text-xs font-black text-black">
                  {index + 1}
                </span>
                <p className="pt-1 text-sm leading-relaxed text-white/76">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-4 space-y-3">
          <CopyButton label="URL richiesta" value={CAPTURE_URL} />
          {loading ? (
            <div className="h-[70px] animate-pulse rounded-2xl bg-grow-soft" />
          ) : token ? (
            <CopyButton label="Token personale" value={token} />
          ) : (
            <div className="rounded-2xl border border-black/10 bg-white p-4">
              <p className="text-sm font-bold">Collegamento non ancora attivo.</p>
              <p className="mt-1 text-xs leading-relaxed text-grow-muted">
                {error ||
                  'Manca il segreto server necessario per creare il token del telefono.'}
              </p>
            </div>
          )}
        </section>

        <section className="mt-6 flex gap-3 rounded-[1.35rem] border border-black/10 bg-[#FFF7BE] p-4">
          <ShieldCheck size={22} weight="bold" className="shrink-0" />
          <div>
            <p className="text-sm font-black">Accesso limitato</p>
            <p className="mt-1 text-xs leading-relaxed text-grow-muted">
              Il token può soltanto aggiungere elementi alla tua Inbox. Non può
              leggere Archivio, chat o calendario. Scade dopo 180 giorni e può
              essere sostituito tornando in questa pagina.
            </p>
          </div>
        </section>

        <Link
          href="/impostazioni/importa"
          className="mt-4 flex min-h-14 items-center justify-between rounded-[1.25rem] border border-black/10 bg-white px-4 py-3 text-sm font-black transition active:scale-[0.98]"
        >
          <span>Importa i vecchi salvati Instagram e TikTok</span>
          <span>→</span>
        </Link>
      </div>

      <BottomNav />
    </main>
  )
}
