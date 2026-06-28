import { NextResponse } from 'next/server'
import {
  getAIProviders,
  getAllConfiguredAIProviders,
} from '@/lib/ai/providers'
import { routeAI } from '@/lib/ai/router'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]').slice(0, 240)
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout after ${milliseconds / 1000}s`)),
      milliseconds
    )

    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

export async function GET() {
  const { user } = await getAuthenticatedSupabase()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const active = new Set(getAIProviders('text').map((provider) => provider.id))
  const providers = getAllConfiguredAIProviders('text').map((provider) => ({
    provider: provider.id,
    label: provider.label,
    model: provider.model,
    mode: provider.mode,
    active: active.has(provider.id),
  }))

  return NextResponse.json({
    ok: true,
    providers,
    pollinations: { active: true, model: 'flux', mode: 'free' },
  })
}

export async function POST() {
  const { user } = await getAuthenticatedSupabase()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const providers = getAIProviders('text')
  const results: {
    provider: string
    label: string
    model: string
    mode: string
    ok: boolean
    latency_ms: number
    error?: string
  }[] = []

  for (const provider of providers) {
    const startedAt = Date.now()

    try {
      await withTimeout(
        routeAI({
          providerId: provider.id,
          bypassCooldown: true,
          taskType: 'text',
          system: 'Reply with exactly: OK',
          message: 'Health check',
          history: [],
          temperature: 0,
          maxTokens: 8,
        }),
        15_000
      )
      results.push({
        provider: provider.id,
        label: provider.label,
        model: provider.model,
        mode: provider.mode,
        ok: true,
        latency_ms: Date.now() - startedAt,
      })
    } catch (error) {
      results.push({
        provider: provider.id,
        label: provider.label,
        model: provider.model,
        mode: provider.mode,
        ok: false,
        latency_ms: Date.now() - startedAt,
        error: safeError(error),
      })
    }
  }

  const pollinationsStartedAt = Date.now()
  let pollinations: {
    provider: string
    model: string
    ok: boolean
    latency_ms: number
    error?: string
  }

  try {
    const response = await fetch(
      'https://image.pollinations.ai/prompt/minimal%20yellow%20circle?model=flux&width=64&height=64&nologo=true&seed=1',
      { signal: AbortSignal.timeout(15_000), cache: 'no-store' }
    )
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    await response.arrayBuffer()
    pollinations = {
      provider: 'pollinations',
      model: 'flux',
      ok: true,
      latency_ms: Date.now() - pollinationsStartedAt,
    }
  } catch (error) {
    pollinations = {
      provider: 'pollinations',
      model: 'flux',
      ok: false,
      latency_ms: Date.now() - pollinationsStartedAt,
      error: safeError(error),
    }
  }

  return NextResponse.json({
    ok: results.every((result) => result.ok) && pollinations.ok,
    checked_at: new Date().toISOString(),
    results,
    pollinations,
  })
}
