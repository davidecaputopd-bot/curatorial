import { NextResponse } from 'next/server'
import { routeAI } from '@/lib/ai/router'
import {
  buildFallbackProductionPlan,
  buildPlannerSystemPrompt,
  normalizeProductionPlan,
  type ProductionPlannerContext,
} from '@/lib/ai/production-planner'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'

type PlanRequest = {
  message?: unknown
  context?: unknown
}

function compactItem(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const item = value as Record<string, unknown>
  const result: Record<string, string> = {}

  for (const key of ['id', 'title', 'type', 'source', 'url']) {
    if (typeof item[key] === 'string') result[key] = item[key].slice(0, 500)
  }

  return Object.keys(result).length ? result : undefined
}

function compactContext(value: unknown): ProductionPlannerContext {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const context = value as Record<string, unknown>

  return {
    project: typeof context.project === 'string' ? context.project.slice(0, 100) : undefined,
    currentRoute:
      typeof context.currentRoute === 'string' ? context.currentRoute.slice(0, 200) : undefined,
    selectedReference: compactItem(context.selectedReference),
    archiveItem: compactItem(context.archiveItem),
  }
}

function parsePlannerJson(reply: string) {
  const trimmed = reply
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')

  if (start === -1 || end <= start) throw new Error('Planner response does not contain JSON')
  return JSON.parse(trimmed.slice(start, end + 1)) as unknown
}

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedSupabase()
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    const body = (await request.json()) as PlanRequest
    if (typeof body.message !== 'string' || !body.message.trim()) {
      return NextResponse.json(
        { ok: false, error: 'message is required' },
        { status: 400 }
      )
    }

    const message = body.message.trim().slice(0, 12_000)
    const context = compactContext(body.context)
    const fallback = buildFallbackProductionPlan(message, context)

    try {
      const result = await routeAI({
        system: buildPlannerSystemPrompt(),
        message: [
          `RICHIESTA:\n${message}`,
          `CONTESTO MINIMO:\n${JSON.stringify(context)}`,
          'Genera ora il ProductionPlan JSON completo rispettando esattamente lo schema.',
        ].join('\n\n'),
        taskType: 'strategy',
        temperature: 0.15,
        maxTokens: 2200,
      })
      const plan = normalizeProductionPlan(parsePlannerJson(result.reply), fallback)

      return NextResponse.json({
        ok: true,
        plan,
        source: 'ai',
        provider: result.provider,
        providerLabel: result.providerLabel,
        model: result.model,
        mode: result.mode,
      })
    } catch (error) {
      const warning = error instanceof Error ? error.message : 'Unknown planner error'
      console.warn('[AI PRODUCTION PLAN FALLBACK]', warning)

      return NextResponse.json({
        ok: true,
        plan: fallback,
        source: 'fallback',
        provider: 'fallback',
        providerLabel: 'GROW Rules Planner',
        model: 'production-rules-v1',
        mode: 'text_only',
        warnings: ['AI planner unavailable: deterministic production plan used.'],
      })
    }
  } catch (error) {
    console.warn(
      '[AI PRODUCTION PLAN ERROR]',
      error instanceof Error ? error.message : 'Unknown request error'
    )
    return NextResponse.json(
      { ok: false, error: 'Unable to build production plan' },
      { status: 500 }
    )
  }
}
