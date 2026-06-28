'use client'

import { useEffect, useMemo, useState } from 'react'
import BottomNav from '@/components/BottomNav'
import {
  compileProductionPrompts,
  type CompiledPrompt,
} from '@/lib/ai/prompt-compiler'
import {
  buildFallbackProductionPlan,
  normalizeProductionPlan,
} from '@/lib/ai/production-planner'
import type {
  ProductionAssetType,
  ProductionPlan,
  ProductionProject,
} from '@/lib/ai/production-types'
import {
  readLocalStudioJobs,
  saveLocalStudioJob,
} from '@/lib/studio/local-jobs'

const PROJECTS: ProductionProject[] = [
  'AN23',
  'Cantina Don Carlo',
  'Exousia',
  'ACI Copertino',
  'Stazione di Posta',
  'Altro',
]

const QUICK_ACTIONS: {
  asset: ProductionAssetType
  title: string
  description: string
  defaultBrief: string
  format: string
}[] = [
  {
    asset: 'video',
    title: 'Nuovo video',
    description: 'Reel, clip e image-to-video.',
    defaultBrief: 'Reel premium con soggetto stabile e finale brand pulito',
    format: '9:16 verticale social',
  },
  {
    asset: 'image',
    title: 'Nuova immagine',
    description: 'Visual editoriale e campagna.',
    defaultBrief: 'Visual editoriale premium pronto per una campagna',
    format: '4:5 verticale social',
  },
  {
    asset: 'mockup',
    title: 'Nuovo mockup',
    description: 'Prodotto, bottiglia e packaging.',
    defaultBrief: 'Mockup prodotto realistico con asset originali protetti',
    format: '4:5 verticale',
  },
  {
    asset: 'carousel',
    title: 'Nuovo carosello',
    description: 'Struttura, copy e direzione visuale.',
    defaultBrief: 'Carosello editoriale con struttura chiara e CTA finale',
    format: '4:5 · 7 slide',
  },
]

const MODES = [
  { label: 'GROW FLUX', state: 'Immagini interne' },
  { label: 'GROW AI', state: 'Testo interno' },
  { label: 'Local worker', state: 'Richiede il Mac' },
  { label: 'Job', state: 'Salvataggio locale' },
  { label: 'Premium API', state: 'Solo con conferma' },
]

const INITIAL_BRIEF = QUICK_ACTIONS[0].defaultBrief
const INITIAL_PLAN = buildFallbackProductionPlan(
  `Crea un video per AN23. ${INITIAL_BRIEF}`,
  { project: 'AN23' }
)

function readPlanFromBrowser() {
  const search = new URLSearchParams(window.location.search)
  const queryPlan = search.get('plan')
  const storedPlan =
    window.sessionStorage.getItem('grow-production-plan') ||
    window.localStorage.getItem('grow-production-plan')
  const raw = queryPlan || storedPlan

  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as unknown
    const fallback = buildFallbackProductionPlan(
      typeof parsed === 'object' && parsed && 'title' in parsed
        ? String((parsed as { title?: unknown }).title || '')
        : ''
    )
    return normalizeProductionPlan(parsed, fallback)
  } catch {
    return null
  }
}

function accessLabel(prompt: CompiledPrompt) {
  if (prompt.access === 'local') return 'Richiede worker locale sul Mac'
  if (prompt.access === 'manual') return 'Non disponibile dentro GROW'
  return 'GROW può eseguirlo direttamente'
}

function costLabel(plan: ProductionPlan) {
  if (plan.cost_mode === 'free') return 'Free / locale'
  if (plan.cost_mode === 'free-tier') return 'Free-tier'
  if (plan.cost_mode === 'cheap') return 'API economica'
  return 'Potrebbe costare'
}

type GeneratedOutput = {
  loading?: boolean
  type?: 'image' | 'text'
  imageUrl?: string
  text?: string
  error?: string
}

export default function StudioPage() {
  const [project, setProject] = useState<ProductionProject>('AN23')
  const [assetType, setAssetType] = useState<ProductionAssetType>('video')
  const [format, setFormat] = useState('9:16 verticale social')
  const [brief, setBrief] = useState(INITIAL_BRIEF)
  const [reference, setReference] = useState('')
  const [activePlan, setActivePlan] = useState<ProductionPlan | null>(INITIAL_PLAN)
  const [importedPlan, setImportedPlan] = useState<ProductionPlan | null>(null)
  const [copied, setCopied] = useState<CompiledPrompt['engine'] | null>(null)
  const [saving, setSaving] = useState<CompiledPrompt['engine'] | null>(null)
  const [localJobCount, setLocalJobCount] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [generated, setGenerated] = useState<
    Partial<Record<CompiledPrompt['engine'], GeneratedOutput>>
  >({})

  useEffect(() => {
    const plan = readPlanFromBrowser()
    const storedBrief = window.sessionStorage.getItem('grow-production-brief')
    const storedReference = window.sessionStorage.getItem('grow-production-reference')
    const jobs = readLocalStudioJobs()

    const frame = window.requestAnimationFrame(() => {
      setLocalJobCount(jobs.length)
      if (plan) {
        setImportedPlan(plan)
        setActivePlan(plan)
        setProject(plan.project)
        setAssetType(plan.asset_type)
        setBrief(storedBrief || plan.title)
        setReference(storedReference || '')
        setFormat(plan.asset_type === 'video' ? '9:16 verticale social' : '4:5 verticale')
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  const compiled = useMemo(() => {
    if (!activePlan) return []
    return compileProductionPrompts({
      plan: activePlan,
      brief,
      reference,
      format,
    }).prompts
  }, [activePlan, brief, reference, format])

  function selectQuickAction(action: (typeof QUICK_ACTIONS)[number]) {
    const plan = buildFallbackProductionPlan(
      `Crea ${action.title.toLowerCase()} per ${project}. ${action.defaultBrief}`,
      { project, selectedReference: reference || undefined }
    )
    setAssetType(action.asset)
    setBrief(action.defaultBrief)
    setFormat(action.format)
    setActivePlan(plan)
    setNotice(null)
    document.getElementById('studio-composer')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  function compileCurrentPlan(plan?: ProductionPlan) {
    const productionPlan =
      plan ||
      buildFallbackProductionPlan(
        `Crea ${assetType} per ${project}. ${brief}`,
        { project, selectedReference: reference || undefined }
      )
    setActivePlan(productionPlan)
    setProject(productionPlan.project)
    setAssetType(productionPlan.asset_type)
    setNotice(null)
    window.sessionStorage.setItem('grow-production-plan', JSON.stringify(productionPlan))
    window.sessionStorage.setItem('grow-production-brief', brief)
    if (reference) {
      window.sessionStorage.setItem('grow-production-reference', reference)
    } else {
      window.sessionStorage.removeItem('grow-production-reference')
    }
    requestAnimationFrame(() => {
      document.getElementById('studio-output')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  async function copyPrompt(prompt: CompiledPrompt) {
    const text = [
      prompt.prompt,
      prompt.negative_prompt
        ? `\n\nNEGATIVE PROMPT\n${prompt.negative_prompt}`
        : '',
      prompt.workflow_note ? `\n\nWORKFLOW NOTE\n${prompt.workflow_note}` : '',
    ].join('')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(prompt.engine)
      window.setTimeout(() => setCopied(null), 1400)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const copiedWithFallback = document.execCommand('copy')
      textarea.remove()

      if (copiedWithFallback) {
        setCopied(prompt.engine)
        window.setTimeout(() => setCopied(null), 1400)
      } else {
        setNotice('Copia non riuscita. Seleziona manualmente il testo del prompt.')
      }
    }
  }

  function saveLocally(prompt: CompiledPrompt) {
    if (!activePlan) return
    saveLocalStudioJob({
      title: prompt.title,
      project,
      job_type: activePlan.asset_type,
      engine: prompt.engine,
      status: 'draft',
      brief,
      reference: reference || null,
      format,
      prompts: [prompt],
      checklist: prompt.checklist,
      settings: {
        production_mode: activePlan.production_mode,
        access: prompt.access,
      },
      result: null,
      cost_mode: activePlan.cost_mode,
      quality_score: null,
    })
    setLocalJobCount(readLocalStudioJobs().length)
    setNotice('Job salvato nei bozze locali. Puoi continuare a lavorare anche senza la tabella Supabase.')
  }

  async function saveJob(prompt: CompiledPrompt) {
    if (!activePlan) return
    setSaving(prompt.engine)
    setNotice(null)

    try {
      const response = await fetch('/api/studio/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: prompt.title,
          project,
          job_type: activePlan.asset_type,
          engine: prompt.engine,
          status: 'draft',
          brief,
          reference: reference || null,
          format,
          prompts: [prompt],
          checklist: prompt.checklist,
          settings: {
            production_mode: activePlan.production_mode,
            access: prompt.access,
          },
          result: null,
          cost_mode: activePlan.cost_mode,
          quality_score: null,
        }),
      })
      const data = await response.json().catch(() => null)

      if (response.ok && data?.ok) {
        setNotice('Job salvato nella coda Studio.')
      } else if (response.status === 401) {
        setNotice('Sessione scaduta. Accedi di nuovo per salvare il job.')
      } else {
        saveLocally(prompt)
      }
    } catch {
      saveLocally(prompt)
    } finally {
      setSaving(null)
    }
  }

  function canRunInsideGrow(prompt: CompiledPrompt) {
    if (!activePlan) return false
    if (activePlan.asset_type === 'image' || activePlan.asset_type === 'mockup') {
      return prompt.engine === 'pollinations'
    }
    if (activePlan.asset_type === 'video') return false
    return prompt.access === 'api'
  }

  async function runInsideGrow(prompt: CompiledPrompt) {
    if (!activePlan || !canRunInsideGrow(prompt)) return
    setGenerated((current) => ({
      ...current,
      [prompt.engine]: { loading: true },
    }))

    try {
      const response = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_type: activePlan.asset_type,
          project,
          format,
          prompt: prompt.prompt,
          negative_prompt: prompt.negative_prompt,
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Generazione non disponibile')
      }

      setGenerated((current) => ({
        ...current,
        [prompt.engine]:
          data.type === 'image'
            ? { type: 'image', imageUrl: data.imageUrl }
            : { type: 'text', text: data.output },
      }))
    } catch (error) {
      setGenerated((current) => ({
        ...current,
        [prompt.engine]: {
          error:
            error instanceof Error
              ? error.message
              : 'Generazione interna non disponibile',
        },
      }))
    }
  }

  return (
    <main className="min-h-screen bg-grow-bg px-4 pb-32 pt-8 text-grow-text">
      <section className="mx-auto max-w-5xl">
        <header className="max-w-2xl">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-grow-muted">
            GROW Studio
          </p>
          <h1 className="mt-2 text-[clamp(2.7rem,8vw,5rem)] font-black uppercase leading-[0.82] tracking-[-0.065em]">
            Fabbrica creativa<span className="text-grow-yellow">.</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-grow-muted">
            Trasforma idee, reference e prompt in asset producibili. GROW prepara
            il percorso ed esegue immagini e contenuti senza farti uscire
            dall’app. Il video resta bloccato finché il worker locale non è pronto.
          </p>
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-grow-muted">
            {localJobCount} job locali salvati
          </p>
        </header>

        <section className="mt-8">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-grow-muted">
                Avvio rapido
              </p>
              <h2 className="mt-1 text-xl font-black uppercase tracking-tight">
                Cosa produciamo?
              </h2>
            </div>
            <p className="hidden text-xs text-grow-muted sm:block">Un output alla volta.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {QUICK_ACTIONS.map((action, index) => (
              <button
                key={action.asset}
                type="button"
                onClick={() => selectQuickAction(action)}
                className={`min-h-36 rounded-[1.5rem] border p-4 text-left transition ${
                  assetType === action.asset
                    ? 'border-black bg-grow-yellow text-black'
                    : 'border-black/10 bg-white hover:-translate-y-0.5 hover:border-black/30'
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-[0.18em] opacity-45">
                  0{index + 1}
                </span>
                <strong className="mt-7 block text-lg font-black uppercase leading-none tracking-tight">
                  {action.title}
                </strong>
                <span className="mt-2 block text-xs leading-snug opacity-65">
                  {action.description}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5 overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            {MODES.map((mode) => (
              <div
                key={mode.label}
                className="rounded-full border border-black/10 bg-white/70 px-4 py-2"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.12em]">
                  {mode.label}
                </span>
                <span className="ml-2 text-[10px] text-grow-muted">{mode.state}</span>
              </div>
            ))}
          </div>
        </section>

        {importedPlan && (
          <section className="mt-7 overflow-hidden rounded-[1.8rem] bg-[#0F0F10] p-5 text-white shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-grow-yellow">
                  Production Plan importato da AI
                </p>
                <h2 className="mt-2 text-2xl font-black uppercase tracking-tight">
                  {importedPlan.title}
                </h2>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.12em]">
                  <span className="rounded-full bg-white/10 px-3 py-2">
                    {importedPlan.project}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-2">
                    {importedPlan.asset_type}
                  </span>
                  <span className="rounded-full bg-grow-yellow px-3 py-2 text-black">
                    {importedPlan.recommended_engine}
                  </span>
                  <span className="rounded-full border border-white/15 px-3 py-2 text-white/60">
                    {costLabel(importedPlan)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => compileCurrentPlan(importedPlan)}
                className="rounded-full bg-grow-yellow px-5 py-3 text-[11px] font-black uppercase tracking-tight text-black"
              >
                Compila prompt
              </button>
            </div>

            <ol className="mt-5 grid gap-2 text-xs leading-relaxed text-white/65 md:grid-cols-2">
              {importedPlan.production_path.map((step, index) => (
                <li key={`${step}-${index}`} className="flex gap-3 rounded-xl bg-white/5 p-3">
                  <span className="font-black text-grow-yellow">0{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section
          id="studio-composer"
          className="mt-7 scroll-mt-5 rounded-[1.8rem] border border-black/10 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-grow-muted">
                Composer
              </p>
              <h2 className="mt-1 text-2xl font-black uppercase tracking-tight">
                Brief operativo
              </h2>
            </div>
            <p className="text-xs text-grow-muted">Compatto, verificabile, copiabile.</p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-grow-muted">
              Progetto
              <select
                value={project}
                onChange={(event) => setProject(event.target.value as ProductionProject)}
                className="mt-2 w-full rounded-xl border border-black/10 bg-grow-bg px-3 py-3 text-sm font-bold text-black outline-none focus:border-black"
              >
                {PROJECTS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-grow-muted">
              Tipo asset
              <select
                value={assetType}
                onChange={(event) =>
                  setAssetType(event.target.value as ProductionAssetType)
                }
                className="mt-2 w-full rounded-xl border border-black/10 bg-grow-bg px-3 py-3 text-sm font-bold text-black outline-none focus:border-black"
              >
                {QUICK_ACTIONS.map((action) => (
                  <option key={action.asset} value={action.asset}>
                    {action.title.replace('Nuovo ', '').replace('Nuova ', '')}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-grow-muted">
              Formato
              <input
                value={format}
                onChange={(event) => setFormat(event.target.value)}
                className="mt-2 w-full rounded-xl border border-black/10 bg-grow-bg px-3 py-3 text-sm font-bold normal-case text-black outline-none focus:border-black"
                placeholder="9:16, 4:5, 16:9..."
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-grow-muted">
              Brief
              <textarea
                value={brief}
                onChange={(event) => setBrief(event.target.value)}
                rows={5}
                className="mt-2 w-full resize-none rounded-xl border border-black/10 bg-grow-bg px-3 py-3 text-sm font-normal normal-case leading-relaxed text-black outline-none focus:border-black"
                placeholder="Obiettivo, scena, soggetto e risultato atteso..."
              />
            </label>

            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-grow-muted">
              Reference / vincoli
              <textarea
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                rows={5}
                className="mt-2 w-full resize-none rounded-xl border border-black/10 bg-grow-bg px-3 py-3 text-sm font-normal normal-case leading-relaxed text-black outline-none focus:border-black"
                placeholder="Asset originali, stile, cosa non deve cambiare..."
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-lg text-xs leading-relaxed text-grow-muted">
              GROW compila varianti specifiche per motore. Nessuna generazione a
              pagamento parte da questo pulsante.
            </p>
            <button
              type="button"
              onClick={() => compileCurrentPlan()}
              disabled={!brief.trim()}
              className="rounded-full bg-[#0F0F10] px-6 py-3 text-[11px] font-black uppercase tracking-tight text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              Compila prompt
            </button>
          </div>
        </section>

        <section id="studio-output" className="mt-8 scroll-mt-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-grow-muted">
                Output
              </p>
              <h2 className="mt-1 text-2xl font-black uppercase tracking-tight">
                Tool cards
              </h2>
            </div>
            {activePlan && (
              <div className="flex gap-2 text-[10px] font-black uppercase">
                <span className="rounded-full bg-grow-yellow px-3 py-2">
                  Motore consigliato · {activePlan.recommended_engine}
                </span>
                <span className="rounded-full border border-black/10 bg-white px-3 py-2">
                  {costLabel(activePlan)}
                </span>
              </div>
            )}
          </div>

          {!activePlan ? (
            <div className="rounded-[1.8rem] border border-dashed border-black/20 px-5 py-14 text-center">
              <p className="text-sm font-bold">Nessun prompt compilato.</p>
              <p className="mt-1 text-xs text-grow-muted">
                Scegli un lavoro, completa il brief e avvia il compiler.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {compiled.map((prompt) => (
                <article
                  key={prompt.engine}
                  className="flex flex-col rounded-[1.8rem] bg-[#0F0F10] p-5 text-white shadow-xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-grow-yellow">
                        {accessLabel(prompt)}
                      </p>
                      <h3 className="mt-2 text-xl font-black uppercase tracking-tight">
                        {prompt.title}
                      </h3>
                    </div>
                    <span className="rounded-full border border-white/15 px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-white/55">
                      {prompt.access}
                    </span>
                  </div>

                  <p className="mt-4 border-l-2 border-grow-yellow pl-3 text-xs leading-relaxed text-white/55">
                    {prompt.why_this_engine}
                  </p>

                  <div className="mt-4 max-h-[410px] overflow-auto rounded-[1.2rem] bg-white/[0.07] p-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">
                      Pronto da copiare
                    </p>
                    <pre className="mt-3 whitespace-pre-wrap font-sans text-xs leading-relaxed text-white/85">
                      {prompt.prompt}
                    </pre>
                    {prompt.negative_prompt && (
                      <>
                        <p className="mt-5 text-[9px] font-black uppercase tracking-[0.18em] text-white/35">
                          Negative prompt
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-white/65">
                          {prompt.negative_prompt}
                        </p>
                      </>
                    )}
                  </div>

                  {prompt.workflow_note && (
                    <p className="mt-3 rounded-xl border border-white/10 p-3 text-xs leading-relaxed text-white/55">
                      <strong className="text-white/80">Workflow:</strong>{' '}
                      {prompt.workflow_note}
                    </p>
                  )}

                  {generated[prompt.engine]?.loading && (
                    <div className="mt-3 rounded-xl bg-grow-yellow p-3 text-xs font-black text-black">
                      GROW sta producendo l’output…
                    </div>
                  )}

                  {generated[prompt.engine]?.imageUrl && (
                    <div className="mt-3 overflow-hidden rounded-[1.2rem] bg-white/10">
                      {/* Generated URLs are dynamic and cannot use a fixed Next Image allowlist. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={generated[prompt.engine]?.imageUrl}
                        alt={`Output ${prompt.title}`}
                        className="h-auto w-full"
                      />
                    </div>
                  )}

                  {generated[prompt.engine]?.text && (
                    <pre className="mt-3 whitespace-pre-wrap rounded-[1.2rem] bg-grow-yellow p-4 font-sans text-xs leading-relaxed text-black">
                      {generated[prompt.engine]?.text}
                    </pre>
                  )}

                  {generated[prompt.engine]?.error && (
                    <p className="mt-3 rounded-xl bg-red-400/10 p-3 text-xs leading-relaxed text-red-200">
                      {generated[prompt.engine]?.error}
                    </p>
                  )}

                  <div className="mt-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">
                      Checklist qualità
                    </p>
                    <ul className="mt-2 space-y-2 text-xs leading-relaxed text-white/65">
                      {prompt.checklist.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="text-grow-yellow">—</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
                    {canRunInsideGrow(prompt) ? (
                      <button
                        type="button"
                        onClick={() => void runInsideGrow(prompt)}
                        disabled={generated[prompt.engine]?.loading}
                        className="rounded-full bg-grow-yellow px-4 py-2.5 text-[10px] font-black uppercase tracking-tight text-black disabled:opacity-40"
                      >
                        {generated[prompt.engine]?.loading
                          ? 'Produzione…'
                          : 'Esegui in GROW'}
                      </button>
                    ) : (
                      <span className="rounded-full border border-white/15 px-4 py-2.5 text-[10px] font-black uppercase tracking-tight text-white/40">
                        {prompt.access === 'local'
                          ? 'Worker locale non configurato'
                          : 'Non eseguibile in GROW'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => void copyPrompt(prompt)}
                      className="rounded-full border border-white/15 px-4 py-2.5 text-[10px] font-black uppercase tracking-tight text-white"
                    >
                      {copied === prompt.engine ? 'Copiato' : prompt.copy_button_label}
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveJob(prompt)}
                      disabled={saving === prompt.engine}
                      className="rounded-full border border-white/15 px-4 py-2.5 text-[10px] font-black uppercase tracking-tight text-white/65"
                    >
                      {saving === prompt.engine ? 'Salvataggio…' : 'Salva come job'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {notice && (
            <p className="mt-4 rounded-xl border border-black/10 bg-white px-4 py-3 text-xs font-bold">
              {notice}
            </p>
          )}
        </section>
      </section>

      <BottomNav />
    </main>
  )
}
