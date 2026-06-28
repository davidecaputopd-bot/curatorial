'use client'

import { useMemo, useState } from 'react'
import BottomNav from '@/components/BottomNav'
import {
  STUDIO_TEMPLATES,
  compileStudioJob,
  type StudioProject,
  type StudioTemplateId,
} from '@/lib/ai/studio'

const PROJECTS: StudioProject[] = [
  'AN23',
  'Cantina Don Carlo',
  'Exousia',
  'ACI Copertino',
  'Stazione di Posta',
  'Altro',
]

export default function StudioPage() {
  const [templateId, setTemplateId] = useState<StudioTemplateId>('social-video')
  const [project, setProject] = useState<StudioProject>('AN23')
  const [format, setFormat] = useState('9:16 verticale social')
  const [brief, setBrief] = useState('')
  const [reference, setReference] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const outputs = useMemo(() => {
    return compileStudioJob({
      templateId,
      project,
      brief,
      reference,
      format,
    })
  }, [templateId, project, brief, reference, format])

  async function copyText(id: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 1200)
  }

  return (
    <main className="min-h-screen bg-grow-bg px-4 pb-32 pt-8 text-grow-text">
      <section className="mx-auto max-w-xl">
        <header className="mb-6">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-grow-muted">
            GROW Studio
          </p>

          <h1 className="mt-2 text-[40px] font-black uppercase leading-[0.86] tracking-tighter">
            Fabbrica creativa<span className="text-grow-yellow">.</span>
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-grow-muted">
            Non è una lista di AI. È un compilatore operativo: scegli il lavoro,
            scrivi il brief, GROW prepara prompt e checklist per il tool giusto.
          </p>
        </header>

        <div className="rounded-[1.8rem] border border-black/10 bg-white/75 p-4 shadow-sm">
          <label className="text-[11px] font-black uppercase tracking-[0.16em] text-grow-muted">
            Tipo lavoro
          </label>

          <select
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value as StudioTemplateId)}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold outline-none"
          >
            {STUDIO_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title}
              </option>
            ))}
          </select>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-black uppercase tracking-[0.16em] text-grow-muted">
                Progetto
              </label>

              <select
                value={project}
                onChange={(event) => setProject(event.target.value as StudioProject)}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold outline-none"
              >
                {PROJECTS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-black uppercase tracking-[0.16em] text-grow-muted">
                Formato
              </label>

              <input
                value={format}
                onChange={(event) => setFormat(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold outline-none"
                placeholder="9:16, 4:5, 16:9..."
              />
            </div>
          </div>

          <label className="mt-4 block text-[11px] font-black uppercase tracking-[0.16em] text-grow-muted">
            Brief
          </label>

          <textarea
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            rows={5}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm leading-relaxed outline-none"
            placeholder="Es. Reel AN23: bottiglia in pineta, vino che entra nel bicchiere, finale logo pulito..."
          />

          <label className="mt-4 block text-[11px] font-black uppercase tracking-[0.16em] text-grow-muted">
            Reference / vincoli
          </label>

          <textarea
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            rows={4}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm leading-relaxed outline-none"
            placeholder="Incolla qui stile, reference, colori, cosa non deve cambiare..."
          />
        </div>

        <div className="mt-5 space-y-4">
          {outputs.map((output) => (
            <article
              key={output.id}
              className="rounded-[1.8rem] border border-black/10 bg-[#0F0F10] p-4 text-white shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">
                    {output.tool} · {output.access}
                  </p>

                  <h2 className="mt-1 text-xl font-black uppercase tracking-tight">
                    {output.title}
                  </h2>
                </div>

                <a
                  href={output.url}
                  target={output.url.startsWith('http') ? '_blank' : undefined}
                  rel={output.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="rounded-full bg-grow-yellow px-3 py-2 text-[11px] font-black uppercase tracking-tight text-[#0F0F10]"
                >
                  Apri
                </a>
              </div>

              <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-[1.2rem] bg-white/8 p-4 text-xs leading-relaxed text-white/85">
                {output.prompt}
              </pre>

              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  onClick={() => copyText(output.id, output.prompt)}
                  className="rounded-full border border-white/15 px-4 py-2 text-[11px] font-black uppercase tracking-tight"
                >
                  {copied === output.id ? 'Copiato' : 'Copia prompt'}
                </button>

                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                  Checklist qualità
                </p>
              </div>

              <ul className="mt-3 space-y-1 text-xs leading-relaxed text-white/65">
                {output.checklist.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <BottomNav />
    </main>
  )
}
