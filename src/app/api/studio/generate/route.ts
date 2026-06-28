import { NextResponse } from 'next/server'
import { routeAI } from '@/lib/ai/router'
import type { ProductionAssetType } from '@/lib/ai/production-types'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'

type GenerateRequest = {
  asset_type?: unknown
  prompt?: unknown
  negative_prompt?: unknown
  format?: unknown
  project?: unknown
}

function imageSize(format: string) {
  if (format.includes('9:16')) return { width: '768', height: '1365' }
  if (format.includes('16:9')) return { width: '1365', height: '768' }
  if (format.includes('4:5')) return { width: '1024', height: '1280' }
  return { width: '1024', height: '1024' }
}

function buildImageUrl(prompt: string, negativePrompt: string, format: string) {
  const size = imageSize(format)
  const completePrompt = negativePrompt
    ? `${prompt}\n\nAvoid: ${negativePrompt}`
    : prompt
  const params = new URLSearchParams({
    model: 'flux',
    width: size.width,
    height: size.height,
    nologo: 'true',
    enhance: 'true',
    seed: String(Math.floor(Math.random() * 999_999_999)),
  })

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(completePrompt)}?${params}`
}

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedSupabase()
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as GenerateRequest
    if (typeof body.prompt !== 'string' || !body.prompt.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Prompt required' },
        { status: 400 }
      )
    }

    const assetType =
      typeof body.asset_type === 'string'
        ? (body.asset_type as ProductionAssetType)
        : 'strategy'
    const prompt = body.prompt.trim().slice(0, 12_000)
    const negativePrompt =
      typeof body.negative_prompt === 'string'
        ? body.negative_prompt.trim().slice(0, 3_000)
        : ''
    const format = typeof body.format === 'string' ? body.format : ''
    const project = typeof body.project === 'string' ? body.project : 'Altro'

    if (assetType === 'image' || assetType === 'mockup') {
      return NextResponse.json({
        ok: true,
        type: 'image',
        engine: 'pollinations',
        model: 'flux',
        imageUrl: buildImageUrl(prompt, negativePrompt, format),
      })
    }

    if (assetType === 'video') {
      return NextResponse.json(
        {
          ok: false,
          code: 'LOCAL_WORKER_REQUIRED',
          error:
            'Il video interno richiede il worker LTX sul Mac. GROW non aprirà tool esterni.',
        },
        { status: 501 }
      )
    }

    const result = await routeAI({
      taskType: assetType === 'workflow' ? 'prompt' : 'strategy',
      system:
        'Sei il motore di produzione interno di GROW. Restituisci un output finale pronto da usare, non una spiegazione del processo. Italiano salvo prompt tecnici. Nessun markdown superfluo.',
      message: `PROGETTO: ${project}\nTIPO ASSET: ${assetType}\nFORMATO: ${format}\n\n${prompt}`,
      history: [],
      temperature: 0.45,
      maxTokens: 1800,
    })

    return NextResponse.json({
      ok: true,
      type: 'text',
      engine: result.provider,
      model: result.model,
      output: result.reply,
    })
  } catch (error) {
    console.error(
      '[STUDIO GENERATE]',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return NextResponse.json(
      { ok: false, error: 'Generazione interna non disponibile' },
      { status: 500 }
    )
  }
}
