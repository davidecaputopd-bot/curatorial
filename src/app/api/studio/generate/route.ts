import { NextResponse } from 'next/server'
import { routeAI } from '@/lib/ai/router'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'

const STUDIO_SYSTEM_PROMPT = `Sei il motore di produzione di GROW Studio. Davide ti da un cliente e un brief: tu restituisci un output finito e pronto da usare — un prompt per un tool di immagini/video, un copy, un piano di carosello, un brief creativo — qualunque cosa il brief richieda concretamente.

Niente spiegazioni del processo, niente liste di opzioni, niente "ecco alcune idee". Una direzione precisa, pronta da copiare e usare. Italiano, salvo quando il brief richiede un prompt tecnico in inglese per un tool di immagini/video.`

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedSupabase()
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as { project?: unknown; brief?: unknown }
    if (typeof body.brief !== 'string' || !body.brief.trim()) {
      return NextResponse.json({ ok: false, error: 'Brief required' }, { status: 400 })
    }

    const project = typeof body.project === 'string' && body.project ? body.project : 'Altro'
    const brief = body.brief.trim().slice(0, 6000)

    const result = await routeAI({
      taskType: 'strategy',
      system: STUDIO_SYSTEM_PROMPT,
      message: `PROGETTO: ${project}\n\nBRIEF:\n${brief}`,
      history: [],
      temperature: 0.6,
      maxTokens: 1500,
    })

    return NextResponse.json({
      ok: true,
      output: result.reply,
      engine: result.provider,
      model: result.model,
    })
  } catch (error) {
    console.error('[STUDIO GENERATE]', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ ok: false, error: 'Generazione non disponibile' }, { status: 500 })
  }
}
