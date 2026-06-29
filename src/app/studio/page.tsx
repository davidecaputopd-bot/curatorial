'use client'

import { useState } from 'react'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import { saveLocalStudioAsset } from '@/lib/studio/local-assets'

const CLIENTS = ['ANventitre', 'Exousia', 'Cantina Don Carlo', 'ACI Copertino', 'TRAMA', 'Altro']

export default function StudioPage() {
  const [client, setClient] = useState('')
  const [brief, setBrief] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [output, setOutput] = useState<{ text: string; engine: string; model: string } | null>(null)
  const [saved, setSaved] = useState(false)

  const generate = async () => {
    if (!brief.trim() || loading) return
    setLoading(true)
    setError('')
    setOutput(null)
    setSaved(false)
    try {
      const res = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: client || 'Altro', brief }),
      })
      const data = await res.json()
      if (data.ok) {
        setOutput({ text: data.output, engine: data.engine, model: data.model })
      } else {
        setError(data.error || 'Generazione non riuscita.')
      }
    } catch {
      setError('Errore di rete. Riprova.')
    }
    setLoading(false)
  }

  const saveToArchive = async () => {
    if (!output) return
    const title = brief.trim().slice(0, 80)
    const payload = {
      title,
      project: client || 'Altro',
      asset_type: 'text',
      engine: output.engine,
      prompt: brief,
      output_text: output.text,
    }
    try {
      const res = await fetch('/api/studio/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('save failed')
    } catch {
      saveLocalStudioAsset(payload as Parameters<typeof saveLocalStudioAsset>[0])
    }
    setSaved(true)
  }

  return (
    <main className="min-h-screen bg-grow-bg pb-28 text-grow-text">
      <div className="mx-auto max-w-lg px-4 pt-12">
        <header className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-grow-muted" style={{ fontFamily: 'DM Mono, monospace' }}>GROW Studio</p>
          <h1 className="text-[28px] font-black uppercase tracking-tight">
            Studio<span className="text-grow-yellow">.</span>
          </h1>
          <p className="mt-1 text-sm text-grow-muted">Cliente, brief, output. Niente altro.</p>
        </header>

        <div className="mb-6 rounded-[1.5rem] border border-grow-border bg-grow-card p-4 space-y-3">
          <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1">
            {CLIENTS.map(c => (
              <button key={c} onClick={() => setClient(c === 'Altro' ? '' : c)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  (c === 'Altro' ? client === '' : client === c) ? 'bg-grow-yellow text-grow-text' : 'bg-grow-soft border border-grow-border text-grow-muted'
                }`}>
                {c}
              </button>
            ))}
          </div>

          <textarea
            autoFocus
            value={brief}
            onChange={e => setBrief(e.target.value)}
            placeholder="Cosa devi produrre? Es: reel AN23 con bottiglia in pineta, mockup etichetta Cantina Don Carlo..."
            rows={4}
            className="w-full resize-none rounded-xl bg-grow-soft px-3 py-2.5 text-sm text-grow-text placeholder:text-grow-muted focus:outline-none"
          />

          <button
            onClick={generate}
            disabled={!brief.trim() || loading}
            className="w-full rounded-full bg-grow-yellow py-3 text-sm font-bold text-grow-text disabled:opacity-40"
          >
            {loading ? 'Genero…' : 'Genera'}
          </button>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {output && (
          <div className="rounded-[1.5rem] border border-grow-border bg-grow-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-grow-muted" style={{ fontFamily: 'DM Mono, monospace' }}>
                {output.engine} · {output.model}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-grow-text">{output.text}</p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={saveToArchive}
                disabled={saved}
                className="flex-1 rounded-full border border-grow-border py-2.5 text-xs font-bold text-grow-text disabled:opacity-50"
              >
                {saved ? 'Salvato in archivio' : 'Salva in archivio'}
              </button>
              <Link
                href={`/ai?project=${encodeURIComponent(client || 'Altro')}&brief=${encodeURIComponent(brief)}`}
                className="flex-1 rounded-full bg-grow-black py-2.5 text-center text-xs font-bold text-grow-yellow"
              >
                Continua in AI
              </Link>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
