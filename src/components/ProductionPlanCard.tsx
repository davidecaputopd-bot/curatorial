'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProductionPlan } from '@/lib/ai/production-types'
import { saveLocalStudioJob } from '@/lib/studio/local-jobs'

type ProductionPlanCardProps = {
  plan: ProductionPlan
  brief: string
  reference?: string
}

function executionLabel(plan: ProductionPlan) {
  if (plan.can_execute_now) return 'Eseguibile ora'
  if (plan.requires_local_worker) return 'Richiede worker locale'
  if (plan.requires_manual_tool) return 'Richiede tool esterno'
  return 'Integrazione futura'
}

function costLabel(plan: ProductionPlan) {
  if (plan.cost_mode === 'free') return 'Free / locale'
  if (plan.cost_mode === 'free-tier') return 'Free-tier'
  if (plan.cost_mode === 'cheap') return 'API economica'
  return 'Potrebbe costare'
}

export function ProductionPlanCard({
  plan,
  brief,
  reference,
}: ProductionPlanCardProps) {
  const router = useRouter()
  const [jobMessage, setJobMessage] = useState<string | null>(null)
  const [creatingJob, setCreatingJob] = useState(false)

  function persistPlan() {
    window.sessionStorage.setItem('grow-production-plan', JSON.stringify(plan))
    window.sessionStorage.setItem('grow-production-brief', brief)

    if (reference) {
      window.sessionStorage.setItem('grow-production-reference', reference)
    } else {
      window.sessionStorage.removeItem('grow-production-reference')
    }
  }

  function openStudio() {
    persistPlan()
    router.push('/studio')
  }

  async function createJob() {
    setCreatingJob(true)
    setJobMessage(null)
    const job = {
      title: plan.title,
      project: plan.project,
      job_type: plan.asset_type,
      engine: plan.recommended_engine,
      status: 'draft' as const,
      brief,
      reference: reference || null,
      format: plan.asset_type === 'video' ? '9:16' : null,
      prompts: [],
      checklist: plan.checklist,
      settings: { production_mode: plan.production_mode },
      result: null,
      cost_mode: plan.cost_mode,
      quality_score: null,
    }

    try {
      const response = await fetch('/api/studio/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        if (response.status === 401) {
          setJobMessage('Sessione scaduta. Accedi di nuovo per creare il job.')
          return
        }
        saveLocalStudioJob(job)
        setJobMessage(
          data?.error === 'Studio jobs table not configured yet'
            ? 'Job salvato localmente. La tabella Supabase non è ancora configurata.'
            : 'Job salvato localmente: la coda online non era disponibile.'
        )
        return
      }

      setJobMessage('Job creato in Studio.')
    } catch {
      saveLocalStudioJob(job)
      setJobMessage('Job salvato localmente: la coda online non era disponibile.')
    } finally {
      setCreatingJob(false)
    }
  }

  return (
    <article className="mt-3 overflow-hidden rounded-[1.5rem] bg-[#0F0F10] p-4 text-white shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="inline-flex rounded-full bg-grow-yellow px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-black">
            Motore consigliato · {plan.recommended_engine}
          </p>
          <h3 className="mt-3 text-xl font-black uppercase leading-none tracking-tight">
            {plan.title}
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-white/50">
            {plan.project} · {plan.asset_type} · {plan.production_mode}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 text-[9px] font-black uppercase tracking-[0.1em]">
          <span className="rounded-full border border-white/15 px-3 py-1.5 text-white/75">
            {executionLabel(plan)}
          </span>
          <span className="rounded-full border border-white/15 px-3 py-1.5 text-white/45">
            {costLabel(plan)}
          </span>
        </div>
      </div>

      {plan.alternatives.length > 0 && (
        <div className="mt-4">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/35">
            Alternative
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {plan.alternatives.map((engine) => (
              <span
                key={engine}
                className="rounded-full bg-white/[0.07] px-3 py-1.5 text-[10px] font-bold text-white/65"
              >
                {engine}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5">
        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/35">
          Percorso produttivo
        </p>
        <ol className="mt-2 space-y-2">
          {plan.production_path.map((step, index) => (
            <li
              key={step}
              className="flex gap-3 rounded-xl bg-white/[0.06] p-3 text-xs leading-relaxed text-white/70"
            >
              <span className="font-black text-grow-yellow">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <details className="mt-3 rounded-xl border border-white/10 px-3 py-2.5">
        <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.12em] text-white/60">
          Checklist qualità · {plan.checklist.length}
        </summary>
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-white/55">
          {plan.checklist.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-grow-yellow">—</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </details>

      {plan.risk_notes.length > 0 && (
        <details className="mt-2 rounded-xl border border-white/10 px-3 py-2.5">
          <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.12em] text-white/60">
            Rischi da controllare · {plan.risk_notes.length}
          </summary>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-white/55">
            {plan.risk_notes.map((risk) => (
              <li key={risk}>— {risk}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={openStudio}
          className="rounded-full bg-grow-yellow px-4 py-3 text-[10px] font-black uppercase tracking-tight text-black"
        >
          Compila prompt
        </button>
        <button
          type="button"
          onClick={createJob}
          disabled={creatingJob}
          className="rounded-full border border-white/15 px-4 py-3 text-[10px] font-black uppercase tracking-tight text-white disabled:opacity-40"
        >
          {creatingJob ? 'Creazione…' : 'Crea job'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/archivio')}
          className="rounded-full border border-white/15 px-4 py-3 text-[10px] font-black uppercase tracking-tight text-white/65"
        >
          {reference ? 'Cambia reference' : 'Usa reference'}
        </button>
        <button
          type="button"
          onClick={openStudio}
          className="rounded-full border border-white/15 px-4 py-3 text-[10px] font-black uppercase tracking-tight text-white/65"
        >
          Apri Studio
        </button>
      </div>

      {jobMessage && (
        <p
          aria-live="polite"
          className="mt-3 rounded-xl bg-white/[0.07] p-3 text-xs leading-relaxed text-white/65"
        >
          {jobMessage}
        </p>
      )}
    </article>
  )
}
